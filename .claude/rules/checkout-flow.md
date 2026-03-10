---
paths:
  - "app/(checkout)/**"
  - "app/api/checkout/**"
  - "app/api/webhooks/**"
  - "app/api/orders/**"
---

# Checkout Flow Rules

## Fluxo de Pagamento (ordem obrigatoria)

1. Validar produto (`active: true` + preco atual da tabela Price)
2. Verificar duplicata via `checkoutId` (buscar Order nas ultimas 2h)
3. Validar cupom se presente (`active`, `maxUses`, `expiresAt`, associacao com produto)
4. Buscar afiliado se `affiliateRef` presente
5. Construir split rules (soma DEVE = 100%)
6. Criar transacao na Pagar.me (credito ou PIX)
7. Criar/atualizar Customer no banco
8. Criar Order com todos os dados (incluindo `pagarmeTransactionId`, `checkoutId`)
9. Retornar resposta com status apropriado

## Split Rules

```typescript
// Empresa: liable=true, charge_processing_fee=true, charge_remainder_fee=true
// Afiliado: liable=false, charge_processing_fee=false, charge_remainder_fee=false
// SEMPRE validar recipientId antes de criar split
```

## Tratamento de Erros

- Traduzir erros Pagar.me para portugues (mapear codigos como INSUFFICIENT_FUNDS, INVALID_CARD_NUMBER)
- Diferenciar `errorType: "validation"` vs `errorType: "transaction"`
- Gravar pedidos falhados no banco com `failureReason`, `failureCode`, `pagarmeResponse`
- Incrementar `attempts` e atualizar `lastAttemptAt`

## Webhook Processing

1. Validar assinatura do webhook (header X-Hub-Signature)
2. Buscar Order por `pagarmeTransactionId` (fallback por `id`)
3. Processar por tipo de evento:
   - `order.paid` -> status="paid", incrementar uso cupom
   - `order.payment_failed` -> status="failed", extrair failureReason
   - `order.refunded` -> status="refunded"
   - `order.pending` -> status="pending"
4. NUNCA processar mesmo webhook 2x (verificar status atual)

## PIX

- Retornar `qrCode`, `qrCodeUrl`, `expiresAt` na resposta
- Status inicial sempre "pending"
- Confirmacao vem via webhook

## Componentes Frontend

- `checkout-form.tsx`: Client component, usa React Hook Form + Zod
- `order-summary.tsx`: Resumo do pedido com precos
- `order-bumps.tsx`: Produtos adicionais
- Usar `uuid` para gerar `checkoutId` no frontend
- Redirecionar para `/processing` apos submit, depois `/success` ou `/error`
