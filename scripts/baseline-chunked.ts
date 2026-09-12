// Captura o baseline mês a mês (a query única de 12 meses derruba a conexão)
import { prisma } from "../lib/db";
import { buildMonthsBR } from "./compare-sales-route";

const grp = (n: string) => {
  const m = n.match(/^(Trader\s+(?:DIRETO\s+)?\d+K?)/i);
  return m ? m[1] : n;
};

(async () => {
  const monthsBR = buildMonthsBR(12);
  const salesByMonth: { month: string; sales: number; revenue: number }[] = [];
  const ps: Record<string, { name: string; quantity: number; revenue: number }> = {};
  const aff: Record<string, { name: string; email: string; revenue: number; salesCount: number }> = {};
  let totalSales = 0, totalRevenue = 0, comAff = 0, comAffRev = 0, semAff = 0, semAffRev = 0;

  for (const m of monthsBR) {
    const orders = await prisma.order.findMany({
      where: { status: "paid", createdAt: { gte: m.start, lte: m.end } },
      select: {
        amount: true, affiliateId: true,
        affiliate: { select: { id: true, user: { select: { name: true, email: true } } } },
        items: { select: { quantity: true, price: true, product: { select: { name: true } } } },
      },
    });
    const rev = orders.reduce((s, o) => s + o.amount, 0);
    salesByMonth.push({ month: m.key, sales: orders.length, revenue: rev / 100 });
    totalSales += orders.length; totalRevenue += rev;
    for (const o of orders) {
      if (o.affiliateId) { comAff++; comAffRev += o.amount; } else { semAff++; semAffRev += o.amount; }
      if (o.affiliate) {
        const id = o.affiliate.id;
        aff[id] ??= { name: o.affiliate.user.name || o.affiliate.user.email, email: o.affiliate.user.email, revenue: 0, salesCount: 0 };
        aff[id].revenue += o.amount; aff[id].salesCount++;
      }
      for (const it of o.items) {
        const k = grp(it.product.name);
        ps[k] ??= { name: k, quantity: 0, revenue: 0 };
        ps[k].quantity += it.quantity; ps[k].revenue += it.price * it.quantity;
      }
    }
    process.stdout.write(".");
  }
  console.log("");

  const agg = await prisma.order.aggregate({ where: { status: "paid" }, _count: { _all: true }, _sum: { amount: true } });

  const out = {
    metrics: { totalSales, totalRevenue: totalRevenue / 100, averageTicket: totalSales ? totalRevenue / totalSales / 100 : 0 },
    allTimeMetrics: { totalSales: agg._count._all, totalRevenue: (agg._sum.amount ?? 0) / 100 },
    salesByMonth,
    productsSold: Object.values(ps).map(d => ({ ...d, revenue: d.revenue / 100 })).sort((a, b) => b.quantity - a.quantity),
    affiliateStats: {
      withAffiliate: { count: comAff, revenue: comAffRev / 100 },
      withoutAffiliate: { count: semAff, revenue: semAffRev / 100 },
    },
    topAffiliates: Object.entries(aff).map(([id, d]) => ({ id, ...d, revenue: d.revenue / 100 })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };

  require("fs").writeFileSync("scripts/.baseline.json", JSON.stringify(out, null, 2));
  console.log("BASELINE capturado:");
  console.log("  metrics :", JSON.stringify(out.metrics));
  console.log("  allTime :", JSON.stringify(out.allTimeMetrics));
  console.log("  produtos:", out.productsSold.length, "| afiliados:", out.topAffiliates.length);
  await prisma.$disconnect();
})();
