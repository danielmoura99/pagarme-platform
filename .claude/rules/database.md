---
paths:
  - "prisma/**"
  - "lib/db.ts"
---

# Database & Prisma Patterns

## Client Singleton

```typescript
// lib/db.ts - NUNCA criar outra instancia
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Modelos Principais

| Model              | Proposito                          | Relacoes Chave                    |
|--------------------|------------------------------------|-----------------------------------|
| User               | Usuarios do sistema                | -> Affiliate, UserSession         |
| Customer           | Clientes compradores               | -> Orders                         |
| Product            | Produtos vendidos                  | -> Prices, PixelConfigs, OrderBumps, SplitConfiguration |
| Price              | Precos (historico)                 | -> Product                        |
| Order              | Pedidos                            | -> Customer, Affiliate, Coupon, OrderItems |
| OrderItem          | Itens do pedido                    | -> Order, Product                 |
| Affiliate          | Afiliados com comissao             | -> User, Orders                   |
| Coupon             | Cupons de desconto                 | -> Products (N:N), Orders         |
| PixelConfig        | Config de pixels por produto       | -> Product, PixelEventLog         |
| PixelEventLog      | Log de eventos de tracking         | -> PixelConfig                    |
| SplitConfiguration | Config de split de pagamento       | -> SplitRecipients, Products      |
| CheckoutSettings   | Personalizacao visual do checkout  | (singleton)                       |
| RDStationConfig    | Config global RD Station           | -> RDStationSyncLog               |

## Query Patterns

```typescript
// CORRETO: includes explicitos
const product = await prisma.product.findUnique({
  where: { id },
  include: {
    prices: { where: { active: true } },
    pixelConfigs: { where: { enabled: true } }
  }
});

// EVITAR: over-fetching com include: true em tudo
```

## Convencoes

- Precos em centavos (Int): `19900` = R$ 199,00
- Soft delete via `active: boolean` (nunca deletar registros de negocio)
- `createdAt`/`updatedAt` em todos os models
- Usar `prisma.$transaction` para operacoes atomicas criticas
- Indices ja definidos para queries frequentes (ver schema)
- IDs: `cuid()` (padrao Prisma)

## Migrations

```bash
npx prisma migrate dev --name descricao_curta   # Desenvolvimento
npx prisma migrate deploy                        # Producao (Vercel)
npx prisma generate                              # Regenerar client apos mudar schema
```

## Gotchas

- `@@unique` constraints ja existem em `PixelConfig` (productId + platform + pixelId)
- `pagarmeTransactionId` em Order e `@unique`
- `CheckoutSettings` usa `@@map("checkout_settings")` (nome diferente no banco)
- Order.checkoutId nao e unique (pode haver tentativas falhadas com mesmo checkoutId)
