# Integração Facebook Ads (Meta Marketing API)

> **Status:** EM ANDAMENTO — Fases 1, 2, 3 e 4 concluídas
> **Criado em:** 2026-03-11
> **Última atualização:** 2026-03-11
> **Objetivo:** Conectar conta de anúncios do Facebook/Meta para importar dados de campanhas (spend, impressões, cliques) e cruzar com dados de receita (Order) para calcular ROAS, CPA e CPL.

---

## Visão Geral

```
┌─────────────────┐     OAuth     ┌──────────────────┐
│  Dashboard UI   │ ◄───────────► │  Meta Graph API  │
│  (Integrations) │               │  Marketing API   │
└────────┬────────┘               └──────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐               ┌──────────────────┐
│  FacebookAds    │  Sync diário  │  Dados importados│
│  Config (DB)    │ ◄───────────► │  spend, cliques  │
└─────────────────┘               │  impressões, CPM │
         │                        └──────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│  Analytics Dashboard                                 │
│  ┌───────────┐  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │   ROAS    │  │  CPA   │  │  CPL   │  │ Lucro  │ │
│  │ Receita/  │  │ Spend/ │  │ Spend/ │  │Receita-│ │
│  │  Spend    │  │Compras │  │Checkouts│  │ Spend  │ │
│  └───────────┘  └────────┘  └────────┘  └────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ Tabela: Campanha | Spend | Cliques | Compras |   ││
│  │         Receita | ROAS | CPA                     ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

---

## Pré-requisitos Meta

Antes de codar, é necessário:

1. **Criar App no Meta for Developers** (https://developers.facebook.com)
   - Tipo: Business
   - Adicionar produto "Marketing API"
2. **Permissões necessárias:**
   - `ads_read` — ler dados de campanhas, ad sets, ads e insights
   - `ads_management` — (opcional, só se quiser pausar/ativar campanhas)
   - `business_management` — acessar contas de anúncio do Business Manager
3. **App Review:**
   - Para produção, a Meta exige revisão do app para conceder `ads_read`
   - Em modo dev, funciona com usuários adicionados como testers
4. **Variáveis de ambiente:**
   ```
   META_APP_ID=xxxxx
   META_APP_SECRET=xxxxx
   META_REDIRECT_URI=https://seudominio.com/api/integrations/facebook-ads/callback
   ```

---

## FASE 1: Schema do Banco de Dados
**Status:** [x] CONCLUÍDA — migration `20260311152312_add_facebook_ads_integration` aplicada

### Modelos Prisma

```prisma
model FacebookAdsConfig {
  id              String    @id @default(cuid())
  enabled         Boolean   @default(false)

  // OAuth
  appId           String?
  appSecret       String?
  accessToken     String?   @db.Text
  tokenExpiresAt  DateTime?

  // Conta de anúncios selecionada
  adAccountId     String?   // formato: act_XXXXXXX
  adAccountName   String?

  // Sync config
  autoSync        Boolean   @default(true)
  syncInterval    Int       @default(360)   // minutos (6h padrão)
  lastSyncAt      DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model FacebookAdsCampaignData {
  id              String    @id @default(cuid())

  // Identificadores da campanha
  campaignId      String    // ID do Facebook
  campaignName    String
  adSetId         String?
  adSetName       String?
  adId            String?
  adName          String?

  // Período do dado
  dateStart       DateTime
  dateEnd         DateTime

  // Métricas do Facebook
  impressions     Int       @default(0)
  clicks          Int       @default(0)
  spend           Float     @default(0)    // em BRL
  reach           Int       @default(0)
  cpc             Float     @default(0)
  cpm             Float     @default(0)
  ctr             Float     @default(0)

  // Métricas cruzadas (calculadas no sync com Order)
  purchases       Int       @default(0)
  revenue         Float     @default(0)    // em BRL (da tabela Order)
  roas            Float     @default(0)    // revenue / spend
  cpa             Float     @default(0)    // spend / purchases

  // Controle
  syncedAt        DateTime  @default(now())
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([campaignId, dateStart, dateEnd])
  @@index([dateStart, dateEnd])
  @@index([campaignName])
}

model FacebookAdsSyncLog {
  id          String   @id @default(cuid())
  status      String   // "success" | "error" | "partial"
  campaigns   Int      @default(0)  // qtd de campanhas sincronizadas
  dateRange   String?  // "2026-03-01 - 2026-03-11"
  errorMessage String?
  duration    Int?     // ms
  createdAt   DateTime @default(now())
}
```

### Tarefas
- [ ] Adicionar modelos ao `schema.prisma`
- [ ] Criar migration: `npx prisma migrate dev --name add_facebook_ads_integration`
- [ ] Gerar cliente: `npx prisma generate`

---

## FASE 2: OAuth Flow (Conectar Conta)
**Status:** [x] CONCLUÍDA — rotas criadas em `/app/api/integrations/facebook-ads/`

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/integrations/facebook-ads/connect` | Gera URL de autorização e redireciona |
| GET | `/api/integrations/facebook-ads/callback` | Recebe code, troca por token |
| GET | `/api/integrations/facebook-ads/config` | Retorna configuração atual |
| POST | `/api/integrations/facebook-ads/config` | Salva configuração |
| POST | `/api/integrations/facebook-ads/disconnect` | Remove tokens e desativa |
| GET | `/api/integrations/facebook-ads/accounts` | Lista contas de anúncio disponíveis |

### Fluxo OAuth

```
1. Usuário clica "Conectar Facebook Ads"
   → Frontend chama POST /connect
   → Backend retorna URL: https://www.facebook.com/v21.0/dialog/oauth
       ?client_id={APP_ID}
       &redirect_uri={CALLBACK_URL}
       &scope=ads_read
       &state={csrf_token}

2. Usuário autoriza no Facebook
   → Redirect para /callback?code=XXX

3. Backend troca code por token:
   POST https://graph.facebook.com/v21.0/oauth/access_token
   {
     client_id, client_secret, redirect_uri, code
   }
   → Recebe: access_token (short-lived, 1h)

4. Backend troca por long-lived token (60 dias):
   GET https://graph.facebook.com/v21.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={APP_ID}
     &client_secret={APP_SECRET}
     &fb_exchange_token={SHORT_TOKEN}
   → Recebe: access_token (long-lived, ~60 dias)

5. Salva token no FacebookAdsConfig

6. Busca contas de anúncio:
   GET https://graph.facebook.com/v21.0/me/adaccounts
     ?fields=id,name,currency,account_status
   → Retorna lista para o usuário selecionar
```

### Tarefas
- [ ] Criar route `connect/route.ts` — gera URL OAuth
- [ ] Criar route `callback/route.ts` — troca code por token (short → long-lived)
- [ ] Criar route `config/route.ts` (GET/POST) — CRUD configuração
- [ ] Criar route `disconnect/route.ts` — limpa tokens
- [ ] Criar route `accounts/route.ts` — lista ad accounts do usuário
- [ ] Adicionar variáveis ao `.env.example`

---

## FASE 3: Sync de Dados (Marketing API)
**Status:** [x] CONCLUÍDA — `sync/route.ts` com upsert e cruzamento Order ↔ Campaign

### Endpoint de Sync

```
POST /api/integrations/facebook-ads/sync
Body: { dateFrom?: string, dateTo?: string }
```

### Lógica de Sync

```typescript
// 1. Buscar insights de campanhas
GET https://graph.facebook.com/v21.0/{ad_account_id}/insights
  ?fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,
          impressions,clicks,spend,reach,cpc,cpm,ctr
  &time_range={"since":"2026-03-01","until":"2026-03-11"}
  &level=campaign          // ou adset, ad
  &time_increment=1        // granularidade diária
  &limit=500

// 2. Para cada campanha, cruzar com Order
//    Buscar Orders com utmCampaign que bate com campaign_name
//    (ou utm_campaign configurado nos anúncios)
SELECT COUNT(*) as purchases, SUM(amount) as revenue
FROM "Order"
WHERE status = 'paid'
  AND "utmSource" IN ('facebook', 'fb', 'ig', 'instagram')
  AND "utmCampaign" = {campaign_name}
  AND "createdAt" BETWEEN {date_start} AND {date_end}

// 3. Calcular métricas cruzadas
ROAS = revenue / spend
CPA  = spend / purchases
CPL  = spend / initiateCheckouts (da PixelEventLog)

// 4. Upsert no FacebookAdsCampaignData
```

### Token Refresh

O long-lived token dura ~60 dias. Estratégia:
- Antes de cada sync, verificar `tokenExpiresAt`
- Se expira em < 7 dias, tentar refresh:
  ```
  GET https://graph.facebook.com/v21.0/oauth/access_token
    ?grant_type=fb_exchange_token
    &client_id={APP_ID}
    &client_secret={APP_SECRET}
    &fb_exchange_token={CURRENT_TOKEN}
  ```
- Se token expirou, notificar usuário para reconectar

### Tarefas
- [ ] Criar lib `lib/facebook-ads.ts` — client com helpers (fetchInsights, refreshToken, etc.)
- [ ] Criar route `sync/route.ts` — sync manual
- [ ] Implementar lógica de cruzamento Order ↔ Campaign
- [ ] Implementar token refresh preventivo
- [ ] Criar route `sync-logs/route.ts` — histórico de syncs

---

## FASE 4: Dashboard de Configuração
**Status:** [x] CONCLUÍDA — página em `/app/(dashboard)/integrations/facebook-ads/page.tsx`

### Página: `/integrations/facebook-ads`

```
┌──────────────────────────────────────────────────────┐
│ Facebook Ads Integration                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Status: 🟢 Conectado (ou 🔴 Desconectado)           │
│ Conta: Minha Empresa (act_12345678)                  │
│ Último sync: 11/03/2026 às 08:00                    │
│ Token expira: 10/05/2026                             │
│                                                      │
│ [Sincronizar Agora]  [Desconectar]                   │
│                                                      │
│ ── Configurações ──                                  │
│ ☑ Sync automático a cada [6] horas                  │
│ ☑ Incluir Ad Sets                                    │
│ ☐ Incluir Ads individuais                            │
│                                                      │
│ ── Histórico de Sync ──                              │
│ ┌──────────┬──────────┬───────────┬────────────────┐ │
│ │ Data     │ Status   │ Campanhas │ Duração        │ │
│ ├──────────┼──────────┼───────────┼────────────────┤ │
│ │ 11/03    │ ✅ Ok    │ 12        │ 2.3s           │ │
│ │ 10/03    │ ✅ Ok    │ 12        │ 1.8s           │ │
│ │ 10/03    │ ❌ Erro  │ 0         │ Token expirado │ │
│ └──────────┴──────────┴───────────┴────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Tarefas
- [ ] Criar página `app/(dashboard)/integrations/facebook-ads/page.tsx`
- [ ] Componente de status da conexão
- [ ] Seletor de conta de anúncio (após OAuth)
- [ ] Botão de sync manual com feedback
- [ ] Tabela de sync logs
- [ ] Configurações de sync (intervalo, granularidade)

---

## FASE 5: Dashboard Analytics — Visão de Mídia Paga
**Status:** [ ] Pendente

### Novo componente na página `/analytics`

Adicionar seção "Performance de Mídia Paga" entre os cards de resumo e a análise de tráfego.

```
┌──────────────────────────────────────────────────────┐
│ Performance de Mídia Paga (Facebook Ads)              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │  Spend   │ │  ROAS    │ │   CPA    │ │  Lucro   │ │
│ │ R$1.200  │ │  3.2x    │ │ R$45,00  │ │ R$2.640  │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                      │
│ Campanha        │ Spend  │ Cliques │ Compras │ ROAS  │
│ ─────────────────────────────────────────────────── │
│ Venda Flash     │ R$500  │   320   │    8    │ 4.2x  │
│ Remarketing     │ R$300  │   180   │    5    │ 3.1x  │
│ Lookalike       │ R$400  │   250   │    3    │ 1.8x  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### API

```
GET /api/analytics/paid-media?from=2026-03-01&to=2026-03-11
```

Retorna dados agregados do `FacebookAdsCampaignData` + cálculos.

### Tarefas
- [ ] Criar route `api/analytics/paid-media/route.ts`
- [ ] Criar componente `analytics/_components/paid-media.tsx`
- [ ] Cards de resumo: Total Spend, ROAS médio, CPA médio, Lucro
- [ ] Tabela de campanhas com métricas cruzadas
- [ ] Integrar filtro de data existente (fromDate/toDate)
- [ ] Adicionar na page.tsx do analytics

---

## FASE 6: Sync Automático (Cron / Scheduled)
**Status:** [ ] Pendente

### Opções

**Opção A: Vercel Cron Jobs** (recomendado para produção)
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-facebook-ads",
    "schedule": "0 */6 * * *"
  }]
}
```

**Opção B: Chamada manual via external cron** (alternativa simples)
- Usar serviço externo (cron-job.org, EasyCron) para chamar o endpoint de sync

### Tarefas
- [ ] Criar route `api/cron/sync-facebook-ads/route.ts`
- [ ] Proteger com `CRON_SECRET` header (Vercel pattern)
- [ ] Configurar `vercel.json` com schedule
- [ ] Implementar lógica de retry em caso de falha
- [ ] Notificação quando token está prestes a expirar

---

## FASE 7: Testes e Validação
**Status:** [ ] Pendente

### Checklist de Validação

- [ ] OAuth flow completo: conectar → selecionar conta → dados aparecem
- [ ] Sync manual funciona e popula `FacebookAdsCampaignData`
- [ ] Cruzamento correto: campanha do Facebook → UTM → Order
- [ ] ROAS calculado corretamente (receita real / spend)
- [ ] Token refresh funciona antes de expirar
- [ ] Filtro de data no analytics funciona com dados de mídia paga
- [ ] Desconectar limpa tokens e para syncs
- [ ] Erro de token expirado mostra alerta no dashboard
- [ ] Sync logs registram sucesso e falha

---

## Mapeamento UTM ↔ Facebook Campaign

O cruzamento depende de como as campanhas estão configuradas no Facebook Ads Manager:

```
URL do anúncio no Facebook:
https://checkout.tradershouse.com.br/checkout?productId=XXX
  &utm_source=facebook
  &utm_medium=cpc
  &utm_campaign={campaign_name}   ← este é o link
```

O `{campaign_name}` no template do Facebook deve bater com o `utmCampaign` salvo na tabela `Order`.

**Importante:** Se o anunciante usa templates dinâmicos do Facebook (`{{campaign.name}}`), o nome da campanha vai automaticamente. Se usa valores manuais, precisam ser consistentes.

### Estratégia de Match

```typescript
// Prioridade de match:
// 1. campaign_id do Facebook === utm_content (se configurado)
// 2. campaign_name do Facebook === utmCampaign do Order
// 3. Fallback: agrupar por utmSource = 'facebook' sem campaign específico
```

---

## Estimativa de Complexidade por Fase

| Fase | Descrição | Complexidade | Dependência |
|------|-----------|-------------|-------------|
| 1 | Schema DB | Baixa | - |
| 2 | OAuth Flow | Média | Fase 1 + Meta App criado |
| 3 | Sync de Dados | Alta | Fase 2 |
| 4 | Dashboard Config | Média | Fase 2 |
| 5 | Dashboard Analytics | Média | Fase 3 |
| 6 | Sync Automático | Baixa | Fase 3 |
| 7 | Testes | Média | Todas |

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| App Review da Meta demora | Bloqueia produção | Começar review cedo; usar modo dev para testes |
| Token expira sem refresh | Dados param de atualizar | Alerta no dashboard + email quando token < 7 dias |
| Campaign name não bate com UTM | ROAS incorreto | Documentar padrão de UTM; UI de mapeamento manual |
| Rate limit da API (200 calls/hour) | Sync falha | Batch requests; respeitar rate limits; retry com backoff |
| Mudança na Graph API | Quebra integração | Fixar versão da API (v21.0); monitorar deprecations |

---

## Próximos Passos Imediatos

1. **Criar App no Meta for Developers** (ação manual do proprietário)
2. **Começar Fase 1** — schema do banco
3. **Começar Fase 2** — OAuth flow (pode testar em modo dev sem App Review)

---

## Referências

- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-apis)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [OAuth Reference](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)
- [Insights API](https://developers.facebook.com/docs/marketing-api/insights)
- Padrão existente: ver integração RD Station em `/app/api/integrations/rd-station/`
