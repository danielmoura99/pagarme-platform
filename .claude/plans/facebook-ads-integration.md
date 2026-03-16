# Integração Facebook Ads (Meta Marketing API)

> **Status:** CONCLUÍDA — Todas as 7 fases implementadas e validadas
> **Criado em:** 2026-03-11
> **Última atualização:** 2026-03-12
> **Objetivo:** Conectar conta de anúncios do Facebook/Meta para importar dados de campanhas (spend, impressões, cliques) e cruzar com dados de receita (Order) para calcular ROAS, CPA e CPL.

---

## Visão Geral

```
┌─────────────────┐  System User  ┌──────────────────┐
│  Dashboard UI   │  Token (API)  │  Meta Graph API  │
│  (Integrations) │ ◄───────────► │  Marketing API   │
└────────┬────────┘               └──────────────────┘
         │                                 │
         ▼                                 ▼
┌─────────────────┐               ┌──────────────────┐
│  FacebookAds    │  Sync manual  │  Dados importados│
│  Config (DB)    │ ◄───────────► │  spend, cliques  │
└─────────────────┘   (botão UI)  │  impressões, CPM │
         │                        └──────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│  Analytics Dashboard (/analytics)                    │
│  ┌─────────────────────────────────────────────────┐│
│  │ Filtro: [Todas as campanhas ▼] [Sincronizar]    ││
│  └─────────────────────────────────────────────────┘│
│  ┌───────────┐  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │ Investido │  │  ROAS  │  │  CPA   │  │ Lucro  │ │
│  │ R$1.200   │  │  3.2x  │  │ R$45   │  │R$2.640 │ │
│  └───────────┘  └────────┘  └────────┘  └────────┘ │
│  ┌──────────────────────────────────────────────────┐│
│  │ Campanha      │ Spend │ Cliques │ Compras │ ROAS ││
│  │ Venda Flash   │ R$500 │   320   │    8    │ 4.2x ││
│  │ Remarketing   │ R$300 │   180   │    5    │ 3.1x ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

---

## Pré-requisitos Meta

1. **App criado no Meta for Developers** — tipo Business, com produto "Marketing API"
2. **System User criado no Business Manager** — com acesso à conta de anúncios (permissão Analista)
3. **Token de System User gerado** — com scope `ads_read`, nunca expira
4. **Variáveis de ambiente configuradas:**
   ```
   META_APP_ID=950078520842133
   META_APP_SECRET=b889c53d7d8e5bad9df55ebb7406e289
   META_REDIRECT_URI=https://checkout.tradershouse.com.br/api/integrations/facebook-ads/callback
   ```

---

## FASE 1: Schema do Banco de Dados
**Status:** [x] CONCLUÍDA — migration `20260311152312_add_facebook_ads_integration` aplicada

### Modelos criados em `prisma/schema.prisma`

- `FacebookAdsConfig` — configuração da integração (token, conta, sync settings)
- `FacebookAdsCampaignData` — dados de campanhas importados (@@unique: campaignId + dateStart + dateEnd)
- `FacebookAdsSyncLog` — histórico de sincronizações (configId como FK)

---

## FASE 2: Conexão via System User Token
**Status:** [x] CONCLUÍDA — abordagem simplificada (sem OAuth redirect)

### Decisão: System User Token vs OAuth

Optamos por **System User Token** em vez de OAuth flow porque:
- Token **nunca expira** (não precisa de refresh)
- **Sem redirect** (não precisa de App Review para `ads_read`)
- Mais simples para single-account use case

### Endpoints implementados

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/integrations/facebook-ads/config` | Retorna status da conexão |
| POST | `/api/integrations/facebook-ads/config` | Salva token (com validação via API) ou atualiza config |
| GET | `/api/integrations/facebook-ads/accounts` | Lista contas de anúncio (filtra status 1 e 101) |
| POST | `/api/integrations/facebook-ads/disconnect` | Remove token e desativa |
| GET | `/api/integrations/facebook-ads/sync-logs` | Histórico de syncs |

### Validação de token

Ao salvar o token, o backend chama `GET /me?fields=id,name` na API do Facebook para verificar se é válido antes de persistir. Tokens inválidos são rejeitados com erro 400.

### Lib: `lib/facebook-ads.ts`

Client para Meta Marketing API v21.0 com:
- `validateToken()` — verifica token contra API antes de salvar
- `fetchAdAccounts()` — lista contas de anúncio
- `fetchCampaignInsights()` — busca insights com paginação
- `tokenIsExpired()` — retorna `false` para `null` (System User tokens não expiram)
- `tokenNeedsRefresh()` — verifica se token OAuth expira em < 7 dias (fallback)
- Funções OAuth mantidas como fallback: `getOAuthUrl()`, `exchangeCodeForToken()`, `refreshLongLivedToken()`

---

## FASE 3: Sync de Dados (Marketing API)
**Status:** [x] CONCLUÍDA — strategy "delete + insert" com agregação por campanha

### Endpoint

```
POST /api/integrations/facebook-ads/sync
Body: { dateFrom?: string, dateTo?: string }  // default: últimos 30 dias
```

### Lógica de Sync (v2 — corrigida)

1. **Busca insights** da API do Facebook (level: adset, time_increment: 1)
2. **Agrega por `campaignId + date`** — API retorna múltiplas linhas por ad set, soma impressions/clicks/spend/reach
3. **Deleta dados existentes** do período (strategy "replace" — evita duplicatas por divergência de timezone)
4. **Insere dados frescos** com datas UTC explícitas (`T00:00:00.000Z`)
5. **Cruza com Orders** — busca pedidos `paid` com `utmCampaign = campaignName` no mesmo dia
6. **Calcula métricas**: ROAS, CPA, CPC, CPM, CTR
7. **Registra log** em `FacebookAdsSyncLog`

### Bugs corrigidos

- **Token expirado para System User**: `tokenIsExpired(null)` retornava `true` — corrigido para `false`
- **Duplicatas no sync**: upsert falhava por divergência de timezone local vs UTC — resolvido com strategy "delete + insert" + datas UTC
- **Unique constraint violation**: API retorna múltiplas linhas por ad set para mesma campanha/dia — resolvido com agregação prévia via Map

---

## FASE 4: Dashboard de Configuração
**Status:** [x] CONCLUÍDA — `/app/(dashboard)/integrations/facebook-ads/page.tsx`

### Funcionalidades

- Input de System User Token com instruções passo-a-passo
- Validação do token antes de salvar (mostra nome do usuário conectado)
- Seletor de conta de anúncio (dropdown com nome, ID e currency)
- Botão "Sincronizar Agora" com feedback
- Botão "Desconectar" com confirmação
- Tabela de histórico de syncs (data, status, campanhas, duração)

---

## FASE 5: Dashboard Analytics — Visão de Mídia Paga
**Status:** [x] CONCLUÍDA — componente `paid-media.tsx` na página `/analytics`

### API

```
GET /api/analytics/paid-media?from=2026-03-01&to=2026-03-12
```

Retorna dados agregados por campanha do `FacebookAdsCampaignData` com totais recalculados.

### Componente: `analytics/_components/paid-media.tsx`

**Filtro multi-campanha:**
- Dropdown com checkboxes para selecionar uma ou mais campanhas
- Cada item mostra nome + spend para referência rápida
- Botões "Todas" e "Limpar" para ações rápidas
- Tags/badges com as campanhas selecionadas (clicáveis para remover)
- Cards e tabela atualizam dinamicamente com base na seleção

**4 Cards de resumo** (recalculam com filtro):
- Total Investido (com cliques e impressões)
- ROAS (colorido: verde >=3x, amarelo >=1.5x, vermelho abaixo)
- CPA (com total de compras atribuídas)
- Lucro Estimado (receita - spend, verde/vermelho)

**Tabela de campanhas:**
- Colunas: Campanha | Investido | Cliques | Compras | Receita | ROAS (badge) | CPA
- Mostra "(N de M)" quando filtrada

**Botão "Sincronizar":**
- Na barra de filtro, à direita
- Chama `POST /api/integrations/facebook-ads/sync`
- Loading spinner durante sync
- Feedback inline (sucesso/erro)
- Atualiza dados após sync

**Estados especiais:**
- Não conectado: banner com link para configurar
- Sem dados no período: banner com botão de sync

### Integração na página `/analytics`

Seção "Performance de Mídia Paga" posicionada entre os cards de resumo (PixelAnalytics) e a análise de tráfego (TrafficSources). Recebe `fromDate` e `toDate` do filtro de período da página.

---

## FASE 6: Sync Manual (botão no Analytics)
**Status:** [x] CONCLUÍDA — abordagem manual preferida sobre cron automático

### Decisão: Manual vs Automático

Optamos por **sync manual via botão** em vez de cron automático para:
- Evitar chamadas desnecessárias à API do Facebook
- Dar controle ao usuário sobre quando sincronizar
- Simplificar a infraestrutura (sem vercel.json/CRON_SECRET)

### Implementação

- Botão "Sincronizar" no componente `PaidMedia` (analytics)
- Botão "Sincronizar Agora" na página de configuração (`/integrations/facebook-ads`)
- Endpoint cron (`/api/cron/sync-facebook-ads`) mantido como fallback para uso futuro

---

## FASE 7: Validação
**Status:** [x] CONCLUÍDA — testado em produção

### Checklist

- [x] Conexão via System User Token: validação → seleção de conta → dados aparecem
- [x] Token inválido rejeitado com erro específico
- [x] Sync manual funciona e popula `FacebookAdsCampaignData`
- [x] Sync não duplica dados (strategy delete + insert + agregação)
- [x] System User Token funciona sem expiração (tokenIsExpired retorna false para null)
- [x] Filtro de data no analytics funciona com dados de mídia paga
- [x] Filtro multi-campanha funciona (cards recalculam)
- [x] Desconectar limpa tokens
- [x] Sync logs registram sucesso e falha
- [x] Build passa sem erros

---

## Arquivos Criados/Modificados

### Novos
| Arquivo | Descrição |
|---------|-----------|
| `lib/facebook-ads.ts` | Client Meta Marketing API v21.0 |
| `app/api/integrations/facebook-ads/config/route.ts` | GET/POST config |
| `app/api/integrations/facebook-ads/accounts/route.ts` | Lista ad accounts |
| `app/api/integrations/facebook-ads/sync/route.ts` | Sync manual |
| `app/api/integrations/facebook-ads/disconnect/route.ts` | Desconectar |
| `app/api/integrations/facebook-ads/sync-logs/route.ts` | Histórico |
| `app/api/analytics/paid-media/route.ts` | API analytics mídia paga |
| `app/api/cron/sync-facebook-ads/route.ts` | Endpoint cron (fallback) |
| `app/(dashboard)/integrations/facebook-ads/page.tsx` | Página de config |
| `app/(dashboard)/analytics/_components/paid-media.tsx` | Componente analytics |

### Modificados
| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | +3 models (FacebookAdsConfig, CampaignData, SyncLog) |
| `app/(dashboard)/analytics/page.tsx` | +import PaidMedia, +seção "Performance de Mídia Paga" |
| `app/(dashboard)/integrations/page.tsx` | Card Facebook Ads na lista de integrações |
| `.env` | +META_APP_ID, +META_APP_SECRET, +META_REDIRECT_URI, +CRON_SECRET |

---

## Mapeamento UTM ↔ Facebook Campaign

O cruzamento de dados depende da configuração de UTMs nos anúncios:

```
URL do anúncio no Facebook:
https://checkout.tradershouse.com.br/checkout?productId=XXX
  &utm_source=facebook
  &utm_medium=cpc
  &utm_campaign={{campaign.name}}   ← template dinâmico do Facebook
```

O `{{campaign.name}}` é substituído automaticamente pelo nome da campanha no Facebook Ads Manager. Este valor deve bater com o campo `utmCampaign` na tabela `Order`.

---

## Referências

- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-apis)
- [Insights API](https://developers.facebook.com/docs/marketing-api/insights)
- [System Users](https://developers.facebook.com/docs/marketing-api/system-users)
- Padrão existente: ver integração RD Station em `/app/api/integrations/rd-station/`
