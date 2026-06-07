// scripts/audit-installments.ts
// Auditoria: vendas parceladas (cartão, > 1x) cobradas SEM juros.
// Lê o nº de parcelas do pagarmeResponse (a coluna Order.installments não é gravada).
// Read-only — não altera nada no banco.
import { prisma } from "../lib/db";

const BASE_INTEREST = 1.67; // mesma constante de _utils/installments.ts
const WINDOW_START = new Date("2026-04-01T00:00:00-03:00");
const TOL = 3; // tolerância de centavos para arredondamento

function expectedWithInterest(baseCents: number, n: number): number {
  return Math.round(baseCents * (1 + (BASE_INTEREST * n) / 100));
}

function getInstallments(pagarmeResponse: unknown): number | null {
  try {
    const resp: any = typeof pagarmeResponse === "string" ? JSON.parse(pagarmeResponse) : pagarmeResponse;
    const n = resp?.charges?.[0]?.last_transaction?.installments;
    return typeof n === "number" ? n : null;
  } catch {
    return null;
  }
}

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      status: "paid",
      paymentMethod: "credit_card",
      createdAt: { gte: WINDOW_START },
    },
    select: {
      id: true,
      amount: true,
      createdAt: true,
      pagarmeResponse: true,
      coupon: { select: { discountPercentage: true, code: true } },
      items: {
        select: {
          product: {
            select: {
              name: true,
              prices: { where: { active: true }, orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const affected: any[] = [];
  const ambiguous: any[] = [];
  let okCount = 0;
  let parceladoTotal = 0;
  let totalLoss = 0;

  for (const o of orders) {
    const n = getInstallments(o.pagarmeResponse);
    if (n === null || n <= 1) continue; // só interessam parceladas (>1x)
    parceladoTotal++;

    const productBase = o.items[0]?.product?.prices[0]?.amount ?? null;
    if (!productBase) {
      ambiguous.push({ id: o.id, parcelas: n, motivo: "sem preço base de referência" });
      continue;
    }

    const disc = o.coupon?.discountPercentage ?? 0;
    const baseAfterCoupon = Math.round(productBase * (1 - disc / 100));
    const expNoInterest = baseAfterCoupon;
    const expWithInterest = expectedWithInterest(baseAfterCoupon, n);

    if (Math.abs(o.amount - expNoInterest) <= TOL) {
      const loss = expWithInterest - o.amount;
      totalLoss += loss;
      affected.push({
        id: o.id,
        data: o.createdAt.toISOString().slice(0, 10),
        produto: o.items[0]?.product?.name?.slice(0, 30),
        parcelas: n,
        cupom: o.coupon?.code ?? "-",
        cobrado: (o.amount / 100).toFixed(2),
        deveriaSer: (expWithInterest / 100).toFixed(2),
        prejuizo: (loss / 100).toFixed(2),
      });
    } else if (Math.abs(o.amount - expWithInterest) <= TOL) {
      okCount++;
    } else {
      ambiguous.push({
        id: o.id,
        data: o.createdAt.toISOString().slice(0, 10),
        produto: o.items[0]?.product?.name?.slice(0, 30),
        parcelas: n,
        cobrado: (o.amount / 100).toFixed(2),
        semJuros: (expNoInterest / 100).toFixed(2),
        comJuros: (expWithInterest / 100).toFixed(2),
        motivo: o.amount > expWithInterest ? "acima do esperado (provável order bump)" : "não bate com nenhum cenário",
      });
    }
  }

  console.log("\n===== AUDITORIA DE PARCELAMENTO SEM JUROS =====");
  console.log(`Janela: ${WINDOW_START.toISOString().slice(0, 10)} → hoje`);
  console.log(`Vendas cartão pagas no período: ${orders.length}`);
  console.log(`Dessas, parceladas (>1x): ${parceladoTotal}`);
  console.log(`  ✓ Com juros correto:         ${okCount}`);
  console.log(`  ✗ SEM juros (afetadas):      ${affected.length}`);
  console.log(`  ? Ambíguas (revisar manual): ${ambiguous.length}`);
  console.log(`\n>>> PREJUÍZO TOTAL (juros não cobrados nas afetadas): R$ ${(totalLoss / 100).toFixed(2)}\n`);

  if (affected.length) {
    console.log("--- VENDAS AFETADAS ---");
    console.table(affected);
  }
  if (ambiguous.length) {
    console.log(`--- AMBÍGUAS: ${ambiguous.length} (amostra de até 15) ---`);
    console.table(ambiguous.slice(0, 15));
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
