# Contexto do Projeto - Pagarme Platform

## Visão Geral
Plataforma SaaS de vendas de **infoprodutos digitais** (cursos, avaliações, combos educacionais) com foco em:
- Sistema completo de checkout e pagamentos
- Gestão de afiliados com split automático
- Tracking avançado de marketing
- Automação de leads (RD Station)

## Público-Alvo
- Infoprodutores
- Empresas de educação online
- Negócios com sistema de afiliados
- Marketers digitais

## Stack Tecnológico

### Frontend
- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Tailwind CSS** + shadcn/ui
- **React Hook Form** + Zod
- **TanStack Query**

### Backend
- **Next.js API Routes**
- **PostgreSQL** + Prisma ORM
- **NextAuth.js** (autenticação)
- **Vercel Blob** (storage)

### Integrações Principais
- **Pagar.me**: Gateway de pagamento (cartão + PIX)
- **RD Station**: Automação de marketing (OAuth)
- **Pixels**: Facebook, Google Ads, GA4, TikTok, Snapchat

## Diferenciais Técnicos

### 1. Sistema de Split Automático
- Divisão automática de comissões entre empresa e afiliados
- Configuração via `SplitConfiguration` e `SplitRecipient`
- **Regra crítica**: Soma das porcentagens sempre = 100%
- Processamento direto pela Pagar.me (sem intermediação)

### 2. Tracking Inteligente
- **Detecção de Origem**: UTMs + Referrer + hostname
- **Disparo Condicional**: Pixels só disparam para tráfego correspondente
  - Facebook Pixel → Facebook/Instagram CPC
  - Google Ads → Google CPC
  - Google Analytics → TODOS os eventos
- **Prevenção de Duplicatas**: Cache por sessão (sessionId)
- **Persistência**: Todos eventos salvos em `PixelEventLog`

### 3. Proteção de Idempotência
- **checkoutId**: UUID único por tentativa de checkout
- Previne duplicação de pedidos em caso de refresh/retry
- Busca pedidos existentes nas últimas 2 horas

### 4. Tratamento de Erros Robusto
- Tradução de erros Pagar.me para português
- Gravação de pedidos falhados com motivo detalhado
- Diferenciação entre erros de validação e transação
- Campo `attempts` e `lastAttemptAt` para retry tracking

## Estrutura de Rotas

```
app/
├── (auth)/              # Público - Login
├── (checkout)/          # Público - Fluxo de compra
│   ├── checkout/
│   ├── processing/
│   ├── success/
│   ├── error/
│   └── unavailable/
├── (dashboard)/         # Protegido - Admin
│   ├── products/
│   ├── analytics/
│   ├── checkout-settings/
│   ├── clientes/
│   ├── coupons/
│   ├── recipients/
│   └── integrations/
└── api/                 # API Routes serverless
```

## Regras de Negócio Críticas

### Checkout
1. **Validação de Produto**: Sempre verificar `active: true` e preço atual
2. **Cupons**: Validar `active`, `maxUses`, `expiresAt` e associação com produto
3. **Duplicatas**: SEMPRE enviar `checkoutId` do frontend
4. **Order Bumps**: Salvos como items separados do pedido

### Split de Pagamento
1. **Soma = 100%**: Total de porcentagens DEVE ser exatamente 100
2. **Recipient Principal**: Empresa sempre como `liable: true`
3. **Afiliado**: `liable: false`, sem taxas de processamento
4. **Validação**: Verificar `recipientId` válido antes de criar split

### Pixels
1. **Eventos Principais**: PageView, ViewContent, InitiateCheckout, AddPaymentInfo, Purchase
2. **Condicionalidade**: Verificar origem do tráfego antes de disparar
3. **Deduplicação**: Usar cache `firedEvents` no frontend
4. **Log**: SEMPRE registrar em `PixelEventLog` para analytics

### RD Station
1. **OAuth**: Tokens expiram, implementar refresh automático
2. **Retry**: Até 3 tentativas com backoff exponencial
3. **Mapeamento**: Eventos de pixel → Eventos RD customizáveis
4. **Status**: Acompanhar via `RDStationSyncLog`

## Variáveis de Ambiente Necessárias

```bash
# Essenciais
DATABASE_URL              # PostgreSQL connection
NEXTAUTH_SECRET          # JWT secret
NEXTAUTH_URL             # Base URL
PAGARME_SECRET_KEY       # Pagar.me backend
PAGARME_PUBLIC_KEY       # Pagar.me frontend
PAGARME_WEBHOOK_SECRET   # Validação de webhooks
PAGARME_MAIN_RECIPIENT_ID # Recipient da empresa

# Opcionais
BLOB_READ_WRITE_TOKEN    # Vercel Blob
RD_STATION_CLIENT_ID     # RD OAuth
RD_STATION_CLIENT_SECRET # RD OAuth
```

## Comandos Importantes

```bash
# Desenvolvimento
npm run dev

# Banco de dados
npx prisma generate          # Gerar cliente
npx prisma migrate dev       # Criar migration
npx prisma migrate deploy    # Deploy production
npx prisma studio            # UI do banco

# Build
npm run build
npm run vercel-build        # Com Prisma
```

## Convenções de Código

### TypeScript
- Tipagem forte obrigatória
- Evitar `any` (usar `unknown` se necessário)
- Interfaces para contratos de API
- Types para dados de domínio

### Componentes
- Server Components por padrão
- `"use client"` apenas quando necessário
- Props tipadas com interface
- Nomenclatura: PascalCase para componentes

### API Routes
- `export const dynamic = "force-dynamic"` para rotas dinâmicas
- Validação de entrada com Zod
- Tratamento de erro com try-catch
- Logs detalhados para debugging

### Prisma
- Includes explícitos (evitar over-fetching)
- Where clauses para soft deletes (`active: true`)
- Transações para operações críticas
- Índices para queries frequentes

## Fluxos Críticos a Preservar

### 1. Fluxo de Checkout
```typescript
// NUNCA pular estas etapas:
1. Validar produto (ativo + preço)
2. Verificar duplicata (checkoutId)
3. Validar cupom (se houver)
4. Buscar afiliado (se houver)
5. Construir split rules
6. Criar transação Pagar.me
7. Criar/atualizar customer
8. Criar order com todos os dados
9. Retornar resposta apropriada
```

### 2. Processamento de Webhook
```typescript
// Sempre validar:
1. Assinatura do webhook
2. Idempotência (evitar processar 2x)
3. Status da transação
4. Atualizar order no banco
5. Disparar evento Purchase (se aprovado)
```

### 3. Sincronização RD Station
```typescript
// Garantir:
1. Token válido (refresh se expirado)
2. Mapear evento corretamente
3. Incluir UTMs e metadata
4. Registrar em RDStationSyncLog
5. Implementar retry em caso de falha
```

## Pontos de Atenção

### Performance
- Usar `prisma.$transaction` para operações atômicas
- Evitar N+1 queries (usar `include` estratégico)
- Cache de pixels no frontend (não recarregar)
- Lazy load de componentes pesados

### Segurança
- NUNCA expor `PAGARME_SECRET_KEY` no frontend
- Validar webhook signatures
- Sanitizar inputs de usuário
- Rate limiting em APIs sensíveis (checkout)

### UX
- Mensagens de erro em português
- Loading states durante processamento
- Confirmação antes de ações destrutivas
- Feedback visual de sucesso/erro

## Links Úteis
- [Pagar.me API Docs](https://docs.pagar.me/)
- [RD Station API Docs](https://developers.rdstation.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Docs](https://www.prisma.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Última Atualização**: 2025-11-03
**Versão**: 1.0
