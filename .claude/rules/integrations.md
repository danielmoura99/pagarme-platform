---
paths:
  - "app/api/integrations/**"
  - "lib/pagarme.ts"
  - "lib/rd-station-auto-sync.ts"
  - "app/api/webhooks/**"
  - "app/api/recipients/**"
---

# External Integrations

## Pagar.me (Gateway de Pagamento)

### Client (`lib/pagarme.ts`)
- Classe `PagarmeClient` com auth via Basic Auth (PAGARME_SECRET_KEY)
- Metodos: `createCreditCardPayment`, `createPixPayment`, `createRecipient`
- NUNCA expor `PAGARME_SECRET_KEY` no frontend

### Split
- Via `SplitConfiguration` + `SplitRecipient` no banco
- Empresa: `PAGARME_MAIN_RECIPIENT_ID` (liable=true)
- Afiliado: `recipientId` do Affiliate (liable=false)
- Soma SEMPRE = 100%

### Recipients
- `POST /api/recipients` -> criar na Pagar.me + banco local
- `POST /api/recipients/sync` -> sincronizar Pagar.me -> banco local
- `GET /api/recipients/all` -> listar da Pagar.me

## RD Station (Marketing Automation)

### OAuth Flow
1. Config salva em `RDStationConfig` (clientId, clientSecret)
2. Redirect para RD Station OAuth
3. Callback em `/api/integrations/rd-station/callback` -> troca code por tokens
4. Tokens salvos no banco (`accessToken`, `refreshToken`, `tokenExpiresAt`)
5. Refresh automatico quando token expira

### Sincronizacao
- Trigger: evento Purchase via pixel events
- Mapeamento: eventos pixel -> eventos RD configuravel via `leadMapping`
- Retry: ate 3 tentativas com backoff exponencial
- Log: `RDStationSyncLog` com status, attempts, errorMessage
- `POST /api/integrations/rd-station/sync` -> sync manual

### Endpoints RD Station
```
GET  /api/integrations/rd-station/config       # Buscar config
POST /api/integrations/rd-station/config       # Salvar config
GET  /api/integrations/rd-station/callback     # OAuth callback
POST /api/integrations/rd-station/sync         # Sync manual
GET  /api/integrations/rd-station/sync-logs    # Logs de sync
POST /api/integrations/rd-station/disconnect   # Desconectar
```
