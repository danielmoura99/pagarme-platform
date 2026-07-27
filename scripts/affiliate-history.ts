// scripts/affiliate-history.ts — histórico de vendas com afiliado (read-only)
import { prisma } from "../lib/db";

(async () => {
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      affiliateId: { not: null },
      paymentMethod: "credit_card",
      createdAt: { gte: since },
    },
    select: { id: true, status: true, createdAt: true, amount: true },
    orderBy: { createdAt: "desc" },
  });

  console.log("Pedidos COM afiliado (cartão), últimos 120 dias:", orders.length);

  const paid = orders.filter((o) => o.status === "paid");
  const failed = orders.filter((o) => o.status === "failed");
  console.log("  pagos:", paid.length, "| falhados:", failed.length);

  console.log("\n=== ÚLTIMO PAGO COM AFILIADO ===");
  console.log(
    paid[0]
      ? `${paid[0].createdAt.toISOString()} | ${paid[0].id} | R$ ${(paid[0].amount / 100).toFixed(2)}`
      : "NENHUM nos últimos 120 dias"
  );

  console.log("\n=== ÚLTIMOS 12 (cronológico) ===");
  for (const o of orders.slice(0, 12).reverse()) {
    const flag = o.status === "paid" ? "✅" : o.status === "failed" ? "❌" : "  ";
    console.log(
      `${flag} ${o.createdAt.toISOString().slice(0, 16)} | ${o.status.padEnd(8)} | R$ ${(o.amount / 100).toFixed(2)}`
    );
  }

  // Comparativo: taxa de aprovação com e sem afiliado nos últimos 30 dias
  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [comAfPago, comAfTotal, semAfPago, semAfTotal] = await Promise.all([
    prisma.order.count({ where: { affiliateId: { not: null }, paymentMethod: "credit_card", createdAt: { gte: d30 }, status: "paid" } }),
    prisma.order.count({ where: { affiliateId: { not: null }, paymentMethod: "credit_card", createdAt: { gte: d30 } } }),
    prisma.order.count({ where: { affiliateId: null, paymentMethod: "credit_card", createdAt: { gte: d30 }, status: "paid" } }),
    prisma.order.count({ where: { affiliateId: null, paymentMethod: "credit_card", createdAt: { gte: d30 } } }),
  ]);

  const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "n/a");
  console.log("\n=== APROVAÇÃO (cartão, últimos 30 dias) ===");
  console.log(`COM afiliado: ${comAfPago}/${comAfTotal} = ${pct(comAfPago, comAfTotal)}`);
  console.log(`SEM afiliado: ${semAfPago}/${semAfTotal} = ${pct(semAfPago, semAfTotal)}`);

  await prisma.$disconnect();
})();
