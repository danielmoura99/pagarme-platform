# Pagarme Platform

Plataforma SaaS de vendas de infoprodutos digitais com checkout, afiliados, tracking de marketing e automacao de leads.

## Comandos

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Build production
npx prisma generate      # Gerar cliente Prisma
npx prisma migrate dev   # Criar migration
npx prisma studio        # UI do banco
```

## Stack

Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + shadcn/ui + Prisma (PostgreSQL) + NextAuth.js

## Estrutura

```
app/
  (auth)/           # Login (publico)
  (checkout)/       # Checkout, success, error, processing (publico)
  (dashboard)/      # Admin protegido (products, analytics, coupons, recipients, integrations)
  api/              # API Routes serverless
components/
  ui/               # shadcn/ui primitives
  tracking/         # Pixel manager (client component)
  dashboard/        # Dashboard components
lib/
  db.ts             # Prisma client singleton
  pagarme.ts        # Gateway de pagamento client
  pixel-deduplication.ts
  rd-station-auto-sync.ts
prisma/
  schema.prisma     # Schema do banco
```

## Convencoes Core

- Server Components por padrao; `"use client"` apenas com hooks/browser APIs
- Validacao de entrada com Zod em todas as APIs
- `export const dynamic = "force-dynamic"` em API routes dinamicas
- Precos SEMPRE em centavos (Int). Exibicao: `amount / 100`
- Logs: `[CONTEXTO_ACAO_TIPO]` (ex: `[CHECKOUT_VALIDATION_ERROR]`)
- TypeScript strict; evitar `any`
- React Hook Form + Zod para formularios
- TanStack Query para data fetching client-side
- Prisma includes explicitos (evitar over-fetching)

## Regras de Negocio Criticas

Estas regras NUNCA devem ser violadas:

1. **Idempotencia**: Todo checkout envia `checkoutId` (UUID) - previne pedidos duplicados
2. **Split = 100%**: Soma das porcentagens de split DEVE ser exatamente 100%
3. **Validacao de produto**: SEMPRE verificar `active: true` e preco atual antes de processar
4. **Webhook signature**: SEMPRE validar assinatura antes de processar webhook Pagar.me
5. **Pixel condicional**: Pixels so disparam para trafego da origem correspondente (Facebook pixel -> Facebook CPC)
6. **Deduplicacao de eventos**: Cache `firedEvents` no frontend + `PixelEventDeduplicator` no backend

## Integracoes Externas

| Servico       | Uso                          | Config          |
|---------------|------------------------------|-----------------|
| Pagar.me      | Gateway (cartao + PIX)       | PAGARME_*       |
| RD Station    | Automacao marketing (OAuth)  | RD_STATION_*    |
| Vercel Blob   | Storage de imagens           | BLOB_*          |
| Pixels        | FB, Google, TikTok, Snapchat | Via PixelConfig |

## Orquestracao - Delegacao de Contexto

O conhecimento deste projeto esta distribuido para eficiencia de contexto:

### Rules (carregadas automaticamente por path)
Regras especificas por dominio, ativadas quando voce edita arquivos no path correspondente:
- `checkout-flow.md` -> fluxo de checkout e pagamento
- `api-patterns.md` -> padroes de desenvolvimento de APIs
- `dashboard-ui.md` -> padroes do dashboard e componentes
- `database.md` -> Prisma, queries, migrations
- `tracking-pixels.md` -> sistema de pixels e analytics
- `integrations.md` -> Pagar.me, RD Station, webhooks

### Skills (invocaveis sob demanda)
- `/new-endpoint` -> guia completo para criar novo endpoint API
- `/new-feature` -> workflow de desenvolvimento end-to-end

### Agents (delegacao automatica)
- `code-reviewer` -> revisao de codigo pos-mudanca
- `domain-expert` -> consulta regras de negocio e fluxos criticos
- `db-architect` -> schema design, migrations, queries complexas

### Referencia Detalhada (arquivos legados, consultar quando necessario)
- `.claude/ARCHITECTURE.md` -> diagramas e fluxos detalhados
- `.claude/PROJECT_CONTEXT.md` -> contexto completo do projeto
- `.claude/API_ENDPOINTS.md` -> documentacao de todos os endpoints
- `.claude/COMMON_TASKS.md` -> receitas de tarefas comuns
