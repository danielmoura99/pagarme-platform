# PLANO: Corrigir Rastreamento de Vendas e UTMs

## Status: EM PLANEJAMENTO
## Criado: 2026-03-09
## Ultima Atualizacao: 2026-03-09

---

## PRINCIPIOS DE SEGURANCA

1. **NUNCA alterar a logica de pagamento existente** - o payload para Pagar.me nao muda
2. **Schema: apenas campos novos nullable** - nenhum campo existente e alterado ou removido
3. **API checkout: campos UTM sao opcionais** - se nao vierem, fluxo segue igual
4. **Testar build apos cada fase** - `npm run build` deve passar
5. **Migration com `migrate dev`** - campos novos com default null, zero risco para dados existentes

---

## DIAGNOSTICO (concluido)

### Problemas identificados:
1. Order nao salva UTMs (source, medium, campaign) - depende de PixelEventLog indireto
2. Purchase so e registrado via frontend (fragil - depende do usuario ficar na pagina)
3. Webhook order.paid NAO gera PixelEventLog de Purchase
4. Pagina /processing monta PixelProvider vazio (sem productId/eventData)
5. PIX: sessionStorage pode se perder entre redirect e confirmacao
6. Adblocker mata todo o tracking

### Solucao arquitetural:
- **Webhook vira a fonte CONFIAVEL** de Purchase (server-side, nao depende do browser)
- **Frontend continua disparando pixels** para plataformas de ads (FB, Google, etc)
- **Order salva UTMs diretamente** para analytics nao depender de PixelEventLog
- **Dupla garantia**: frontend + backend, com deduplicacao

---

## FASES DE IMPLEMENTACAO

### FASE 1: Schema - Adicionar campos UTM na Order
**Risco: BAIXO** (apenas adicionar campos nullable)
**Arquivos: prisma/schema.prisma**

Adicionar ao model Order:
```prisma
// Campos de rastreamento de origem (UTM)
utmSource    String?   // utm_source (google, facebook, etc)
utmMedium    String?   // utm_medium (cpc, organic, etc)
utmCampaign  String?   // utm_campaign
utmTerm      String?   // utm_term
utmContent   String?   // utm_content
referrer     String?   // URL de referencia
landingPage  String?   // Primeira pagina da sessao
```

Passos:
- [ ] Editar schema.prisma (APENAS adicionar campos, nao mexer em nada existente)
- [ ] Rodar `npx prisma migrate dev --name add_utm_fields_to_order`
- [ ] Verificar que migration NAO altera campos existentes (apenas ADD COLUMN)
- [ ] Rodar `npm run build` para validar

---

### FASE 2: Frontend - Enviar UTMs no payload do checkout
**Risco: BAIXO** (adicionar campos opcionais ao payload, API ignora se nao vier)
**Arquivos: app/(checkout)/checkout/_components/checkout-form.tsx**

O checkout-form.tsx ja tem acesso ao browser. Precisamos:
- [ ] Antes do fetch, capturar UTMs do sessionStorage/URL (mesmo metodo do PixelManager)
- [ ] Adicionar ao payload: `utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referrer, landingPage`
- [ ] Campos sao opcionais - se nao existirem, payload vai sem eles (retrocompativel)

Logica de captura (reutilizar do PixelManager):
```typescript
const getUTMData = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    utmSource: urlParams.get("utm_source") || sessionStorage.getItem("utm_source") || null,
    utmMedium: urlParams.get("utm_medium") || sessionStorage.getItem("utm_medium") || null,
    utmCampaign: urlParams.get("utm_campaign") || sessionStorage.getItem("utm_campaign") || null,
    utmTerm: urlParams.get("utm_term") || sessionStorage.getItem("utm_term") || null,
    utmContent: urlParams.get("utm_content") || sessionStorage.getItem("utm_content") || null,
    referrer: document.referrer || null,
    landingPage: sessionStorage.getItem("landing_page") || null,
  };
};
```

IMPORTANTE: Nao alterar a estrutura do payload existente. UTMs sao campos ADICIONAIS.

---

### FASE 3: API Checkout - Persistir UTMs na Order
**Risco: BAIXO** (ler campos opcionais do body, salvar se existirem)
**Arquivos: app/api/checkout/route.ts**

Mudancas MINIMAS na API:
- [ ] Extrair UTMs do body (com fallback para null)
- [ ] Adicionar ao `orderData` antes do `prisma.order.create()`
- [ ] Adicionar ao `failedOrderData` tambem (para rastrear mesmo pedidos falhados)

```typescript
// ADICIONAR na desestruturacao do body (linha ~134)
const { ..., utmSource, utmMedium, utmCampaign, utmTerm, utmContent, referrer, landingPage } = body;

// ADICIONAR ao orderData (linha ~676)
utmSource: utmSource || null,
utmMedium: utmMedium || null,
utmCampaign: utmCampaign || null,
utmTerm: utmTerm || null,
utmContent: utmContent || null,
referrer: referrer || null,
landingPage: landingPage || null,
```

CRITICO: NAO mexer em NADA do fluxo Pagar.me. Os UTMs sao salvos DEPOIS da transacao.

---

### FASE 4: Webhook - Gerar PixelEventLog de Purchase server-side
**Risco: MEDIO** (mexer no webhook, mas so ADICIONAR logica pos-atualizacao)
**Arquivos: app/api/webhooks/pagarme/route.ts (ou equivalente)**

Quando webhook `order.paid` chega:
- [ ] APOS atualizar status da Order para "paid" (logica existente intocada)
- [ ] Buscar os PixelConfigs do produto da Order
- [ ] Criar PixelEventLog com eventType="Purchase" se nao existir ainda (deduplicar por orderId)
- [ ] Copiar UTMs da Order para o PixelEventLog

```typescript
// ADICIONAR APOS a atualizacao de status existente:

// Gerar evento Purchase server-side (garantia)
const order = await prisma.order.findUnique({
  where: { id: updatedOrder.id },
  include: {
    items: { include: { product: { include: { pixelConfigs: true } } } },
    customer: true,
  },
});

if (order) {
  for (const item of order.items) {
    for (const pixelConfig of item.product.pixelConfigs) {
      if (!pixelConfig.enabled) continue;

      // Deduplicar: so criar se nao existir Purchase para este orderId + pixelConfig
      const existing = await prisma.pixelEventLog.findFirst({
        where: {
          pixelConfigId: pixelConfig.id,
          eventType: "Purchase",
          orderId: order.id,
        },
      });

      if (!existing) {
        await prisma.pixelEventLog.create({
          data: {
            pixelConfigId: pixelConfig.id,
            eventType: "Purchase",
            eventData: {
              value: order.amount / 100,
              currency: "BRL",
              content_name: item.product.name,
              email: order.customer?.email,
              server_side: true, // Marcar como server-side para diferenciar
            },
            orderId: order.id,
            source: order.utmSource,
            medium: order.utmMedium,
            campaign: order.utmCampaign,
            term: order.utmTerm,
            content: order.utmContent,
            referrer: order.referrer,
            landingPage: order.landingPage,
          },
        });
      }
    }
  }
}
```

DEDUPLICACAO: Se o frontend ja criou o PixelEventLog via /success, o webhook nao duplica.
Se o frontend falhou, o webhook garante que o evento existe.

---

### FASE 5: Fix pagina /processing (PIX)
**Risco: BAIXO** (melhorar props do PixelProvider)
**Arquivos: app/(checkout)/processing/_components/processing-content.tsx**

- [ ] Extrair productId da Order (ja tem orderId nos searchParams)
- [ ] Buscar dados do produto via API ou passar via searchParams
- [ ] Montar PixelProvider com overrideProductId

Alternativa MAIS SIMPLES (recomendada):
- A pagina /processing nao precisa disparar Purchase
- O Purchase e disparado na /success (frontend) OU pelo webhook (backend)
- Basta garantir que os UTMs sobrevivem ao redirect

- [ ] Salvar UTMs no localStorage antes do redirect PIX no checkout-form.tsx
- [ ] Na pagina /success, tentar recuperar UTMs do localStorage se sessionStorage vazio

---

### FASE 6: Analytics - Usar dados da Order como fonte primaria
**Risco: BAIXO** (melhorar queries, nao quebrar as existentes)
**Arquivos: app/api/analytics/pixels/route.ts, possivelmente novos endpoints**

Agora que Order tem UTMs e webhook gera PixelEventLog:
- [ ] Receita: calcular de Order (fonte confiavel) em vez de eventData.value
- [ ] UTMs: JOIN Order com PixelEventLog via orderId, ou ler direto da Order
- [ ] Garantir retrocompatibilidade: se Order nao tem UTM, fallback para PixelEventLog

Isso pode ser feito DEPOIS das fases 1-5, pois o analytics ja funciona (com as limitacoes atuais).

---

### FASE 7: Limpeza
**Risco: ZERO**

- [ ] Remover console.logs de debug do checkout-form.tsx (linhas 171-174, 209, 215, 254-258)
- [ ] Remover console.logs de debug do pixel-manager.tsx (producao)
- [ ] Remover console.logs de debug do conversion-chart.tsx e event-list.tsx

---

## ORDEM DE EXECUCAO

```
FASE 1 (Schema)     → FASE 2 (Frontend UTM)  → FASE 3 (API salvar UTM)
                                                        ↓
FASE 5 (PIX fix)    ← ← ← ← ← ← ← ← ← ←   FASE 4 (Webhook Purchase)
        ↓
FASE 6 (Analytics)  → FASE 7 (Limpeza)
```

Fases 1-3 sao um bloco: schema + frontend + API (UTMs na Order)
Fase 4 e o bloco critico: webhook gera Purchase server-side
Fase 5 e a correcao do fluxo PIX
Fase 6 e melhoria de analytics (pode ser feita depois)
Fase 7 e limpeza (qualquer momento)

---

## CHECKLIST DE VALIDACAO POR FASE

### Apos cada fase:
- [ ] `npm run build` passa sem erros
- [ ] Fluxo de checkout com cartao funciona (criar pedido teste)
- [ ] Fluxo de checkout com PIX funciona (criar pedido teste)
- [ ] Webhook processa corretamente
- [ ] Analytics carrega sem erros

### Validacao final (apos todas as fases):
- [ ] Cartao aprovado: Order tem UTMs + PixelEventLog tem Purchase
- [ ] PIX aprovado: Order tem UTMs + PixelEventLog tem Purchase (via webhook)
- [ ] PIX aprovado (usuario fechou): PixelEventLog tem Purchase (via webhook)
- [ ] Sem UTMs: Order salva sem UTM (campos null), fluxo nao quebra
- [ ] Adblocker: Purchase registrado via webhook mesmo sem pixel frontend
- [ ] Analytics mostra vendas de todas as fontes
- [ ] Nenhum dado existente foi perdido ou alterado

---

## ARQUIVOS AFETADOS (resumo)

| Arquivo | Fase | Tipo de Mudanca |
|---------|------|-----------------|
| prisma/schema.prisma | 1 | ADD campos nullable |
| app/(checkout)/checkout/_components/checkout-form.tsx | 2 | ADD captura UTM no payload |
| app/api/checkout/route.ts | 3 | ADD salvar UTMs (campos opcionais) |
| app/api/webhooks/pagarme/route.ts | 4 | ADD gerar PixelEventLog server-side |
| app/(checkout)/processing/_components/processing-content.tsx | 5 | FIX PixelProvider props |
| app/api/analytics/pixels/route.ts | 6 | IMPROVE queries |
| Varios componentes | 7 | REMOVE console.logs |

---

## NOTAS IMPORTANTES

- A integracao com Pagar.me NAO e alterada em nenhuma fase
- O payload enviado para `pagarme.createCreditCardPayment()` e `pagarme.createPixPayment()` permanece IDENTICO
- Os UTMs sao capturados ANTES e salvos DEPOIS da transacao Pagar.me
- Se qualquer fase falhar, as anteriores continuam funcionando independentemente
- Cada fase e autonoma e pode ser testada isoladamente
