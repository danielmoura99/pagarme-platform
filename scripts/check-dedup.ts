// scripts/check-dedup.ts — valida a deduplicação por pedido (read-only)
import { prisma } from "../lib/db";

(async () => {
  const from = new Date("2026-08-01T00:00:00");
  const to = new Date("2026-08-03T23:59:59");

  const antes = await prisma.pixelEventLog.count({
    where: {
      createdAt: { gte: from, lte: to },
      OR: [
        { orderId: { not: null } },
        { eventType: { in: ["Purchase", "InitiateCheckout", "AddPaymentInfo"] } },
      ],
    },
  });

  const depoisRows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM (
      SELECT DISTINCT COALESCE("orderId", id) AS grp
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
        AND ("orderId" IS NOT NULL OR "eventType" IN ('Purchase','InitiateCheckout','AddPaymentInfo'))
    ) t
  `;
  const depois = Number(depoisRows[0]?.count ?? 0);

  console.log(`Linhas ANTES (com duplicata): ${antes}`);
  console.log(`Linhas DEPOIS (deduplicado):  ${depois}`);
  console.log(`Duplicatas removidas:         ${antes - depois}`);

  // Confere a venda específica que o usuário reportou
  const alvo = await prisma.pixelEventLog.findMany({
    where: { eventType: "Purchase", orderId: { not: null }, createdAt: { gte: from, lte: to } },
    select: { orderId: true, pixelConfig: { select: { platform: true } } },
  });
  const porPedido = new Map<string, string[]>();
  for (const e of alvo) {
    const l = porPedido.get(e.orderId!) ?? [];
    l.push(e.pixelConfig.platform);
    porPedido.set(e.orderId!, l);
  }
  const multi = [...porPedido.entries()].filter(([, v]) => v.length > 1);
  console.log(`\nPedidos com múltiplos pixels: ${multi.length}`);
  multi.slice(0, 5).forEach(([id, v]) =>
    console.log(`  ${id.slice(0, 12)} → ${v.join(", ")} (${v.length} linhas → 1)`)
  );

  await prisma.$disconnect();
})();
