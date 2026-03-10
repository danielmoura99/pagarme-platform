---
paths:
  - "components/tracking/**"
  - "app/api/pixels/**"
  - "app/(dashboard)/analytics/**"
  - "lib/pixel-deduplication.ts"
---

# Tracking & Pixels System

## Arquitetura

```
Frontend (PixelManager)          Backend (API)
  |                                |
  |-- Detectar trafego (UTMs)      |
  |-- Verificar cache local        |
  |-- Disparar pixel (FB/GA/etc)   |
  |-- POST /api/pixels/events ---> |-- PixelEventDeduplicator
  |                                |-- Salvar PixelEventLog
  |                                |-- Trigger RD Station sync (se Purchase)
```

## Plataformas Suportadas

| Platform         | Pixel Type        | Dispara Quando                    |
|------------------|-------------------|-----------------------------------|
| facebook         | Facebook Pixel    | Trafego Facebook/Instagram CPC    |
| google_ads       | Google Ads        | Trafego Google CPC                |
| google_analytics | GA4               | TODOS os eventos (sempre)         |
| tiktok           | TikTok Pixel      | Trafego TikTok                    |
| snapchat         | Snapchat Pixel    | Trafego Snapchat                  |

## Eventos (funnel order)

1. `PageView` - Visitou pagina do checkout
2. `ViewContent` - Visualizou detalhes do produto
3. `InitiateCheckout` - Iniciou preenchimento do formulario
4. `AddPaymentInfo` - Preencheu dados de pagamento
5. `Purchase` - Compra finalizada com sucesso

## Deduplicacao (3 estrategias em ordem)

1. `orderId + eventType` -> para eventos Purchase
2. `sessionId + pixelConfigId + eventType` -> ultimos 5 minutos
3. `ipAddress + userAgent + eventType` -> ultimos 2 minutos (fingerprint)

## Frontend (PixelManager)

- Client component em `components/tracking/`
- Usa `firedEvents` ref para cache de sessao
- Detecta fonte de trafego via UTMs + referrer + hostname
- Disparo condicional: so dispara pixel se trafego corresponde a plataforma
- `sessionId` gerado uma vez por sessao

## Backend (API)

- `POST /api/pixels/events` -> salvar + deduplicar
- `GET /api/analytics/funnel` -> funil de conversao
- `GET /api/analytics/traffic-sources` -> fontes de trafego
- `GET /api/analytics/pixels` -> performance por pixel

## Ao Criar Novo Pixel/Evento

1. Adicionar ao enum de `events` em PixelConfig
2. Implementar disparo no PixelManager (frontend)
3. Garantir deduplicacao no backend
4. Adicionar ao funil de analytics se aplicavel
