// scripts/compare-sales-route.ts
// Compara a resposta ANTIGA (em memória, 3349 pedidos) com a NOVA (agregada em SQL).
// Uso: npx tsx scripts/compare-sales-route.ts [--save]
import { prisma } from "../lib/db";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const TZ = "America/Sao_Paulo";
const monthKeyBR = (d: Date) => formatInTimeZone(d, TZ, "MMM/yy");

export function buildMonthsBR(months: number) {
  const [curY, curM] = formatInTimeZone(new Date(), TZ, "yyyy-MM").split("-").map(Number);
  const list: { key: string; start: Date; end: Date }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    let y = curY, m = curM - i;
    while (m <= 0) { m += 12; y -= 1; }
    const start = fromZonedTime(`${y}-${String(m).padStart(2, "0")}-01T00:00:00`, TZ);
    let ny = y, nm = m + 1;
    if (nm > 12) { nm = 1; ny += 1; }
    const end = new Date(fromZonedTime(`${ny}-${String(nm).padStart(2, "0")}-01T00:00:00`, TZ).getTime() - 1);
    list.push({ key: monthKeyBR(start), start, end });
  }
  return list;
}

const grp = (n: string) => {
  const m = n.match(/^(Trader\s+(?:DIRETO\s+)?\d+K?)/i);
  return m ? m[1] : n;
};

/** Implementação ATUAL: traz todos os pedidos e calcula no Node. */
export async function antiga(months = 12) {
  const monthsBR = buildMonthsBR(months);
  const startDate = monthsBR[0].start;
  const endDate = monthsBR[monthsBR.length - 1].end;

  const orders = await prisma.order.findMany({
    where: { status: "paid", createdAt: { gte: startDate, lte: endDate } },
    select: {
      id: true, amount: true, createdAt: true, affiliateId: true,
      affiliate: { select: { id: true, user: { select: { name: true, email: true } } } },
      items: { select: { quantity: true, price: true, product: { select: { name: true } } } },
    },
  });

  const agg = await prisma.order.aggregate({
    where: { status: "paid" }, _count: { _all: true }, _sum: { amount: true },
  });

  const salesByMonth: Record<string, { count: number; revenue: number }> = {};
  monthsBR.forEach(({ key }) => (salesByMonth[key] = { count: 0, revenue: 0 }));
  orders.forEach((o) => {
    const k = monthKeyBR(o.createdAt);
    if (salesByMonth[k]) { salesByMonth[k].count++; salesByMonth[k].revenue += o.amount; }
  });

  const ps: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach((o) =>
    o.items.forEach((it) => {
      const k = grp(it.product.name);
      ps[k] ??= { name: k, count: 0, revenue: 0 };
      ps[k].count += it.quantity;
      ps[k].revenue += it.price * it.quantity;
    })
  );

  const withAff = orders.filter((o) => o.affiliateId !== null);
  const aff: Record<string, { name: string; email: string; revenue: number; count: number }> = {};
  withAff.forEach((o) => {
    if (!o.affiliate) return;
    const id = o.affiliate.id;
    aff[id] ??= { name: o.affiliate.user.name || o.affiliate.user.email, email: o.affiliate.user.email, revenue: 0, count: 0 };
    aff[id].revenue += o.amount;
    aff[id].count++;
  });

  const totalRevenue = orders.reduce((s, o) => s + o.amount, 0);
  return {
    metrics: {
      totalSales: orders.length,
      totalRevenue: totalRevenue / 100,
      averageTicket: orders.length ? totalRevenue / orders.length / 100 : 0,
    },
    allTimeMetrics: {
      totalSales: agg._count._all,
      totalRevenue: (agg._sum.amount ?? 0) / 100,
    },
    salesByMonth: Object.entries(salesByMonth).map(([month, d]) => ({ month, sales: d.count, revenue: d.revenue / 100 })),
    productsSold: Object.values(ps).map((d) => ({ name: d.name, quantity: d.count, revenue: d.revenue / 100 })).sort((a, b) => b.quantity - a.quantity),
    affiliateStats: {
      withAffiliate: { count: withAff.length, revenue: withAff.reduce((s, o) => s + o.amount, 0) / 100 },
      withoutAffiliate: { count: orders.length - withAff.length, revenue: orders.filter(o => o.affiliateId === null).reduce((s, o) => s + o.amount, 0) / 100 },
    },
    topAffiliates: Object.entries(aff).map(([id, d]) => ({ id, name: d.name, email: d.email, revenue: d.revenue / 100, salesCount: d.count })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}

if (require.main === module) {
  (async () => {
    const t0 = Date.now();
    const r = await antiga(12);
    console.log(`baseline capturado em ${Date.now() - t0}ms`);
    console.log("  metrics    :", JSON.stringify(r.metrics));
    console.log("  allTime    :", JSON.stringify(r.allTimeMetrics));
    console.log("  meses      :", r.salesByMonth.length);
    console.log("  produtos   :", r.productsSold.length);
    console.log("  afiliados  :", r.topAffiliates.length);
    require("fs").writeFileSync("scripts/.baseline.json", JSON.stringify(r, null, 2));
    console.log("  -> salvo em scripts/.baseline.json");
    await prisma.$disconnect();
  })();
}
