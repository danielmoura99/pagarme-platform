// app/api/analytics/sales/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const dynamic = "force-dynamic";

// Fuso fixo do negócio (Brasil). Garante agrupamento por mês consistente
// independentemente do fuso do servidor (Vercel roda em UTC).
const TZ = "America/Sao_Paulo";

// Chave de mês "MMM/yy" de um instante, no fuso do Brasil
const monthKeyBR = (date: Date) => formatInTimeZone(date, TZ, "MMM/yy");

// Constrói a lista de meses do período (do mais antigo ao atual) com limites
// em instantes UTC corretos para o fuso do Brasil.
function buildMonthsBR(months: number) {
  const [curY, curM] = formatInTimeZone(new Date(), TZ, "yyyy-MM")
    .split("-")
    .map(Number);

  const list: { key: string; start: Date; end: Date }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    let y = curY;
    let m = curM - i;
    while (m <= 0) { m += 12; y -= 1; }

    const start = fromZonedTime(`${y}-${String(m).padStart(2, "0")}-01T00:00:00`, TZ);

    let ny = y;
    let nm = m + 1;
    if (nm > 12) { nm = 1; ny += 1; }
    const end = new Date(
      fromZonedTime(`${ny}-${String(nm).padStart(2, "0")}-01T00:00:00`, TZ).getTime() - 1
    );

    list.push({ key: monthKeyBR(start), start, end });
  }
  return list;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "12");

    // Meses do período, com limites em instantes UTC corretos p/ o fuso do Brasil
    const monthsBR = buildMonthsBR(months);
    const startDate = monthsBR[0].start;
    const endDate = monthsBR[monthsBR.length - 1].end;

    // Todas as métricas são agregadas NO BANCO.
    // A versão anterior trazia todos os pedidos do período (3.000+ linhas com
    // joins) para somar no Node — ~1 MB por chamada, e a página chama esta
    // rota 6 vezes. A query chegava a derrubar a conexão (P1017).
    // Aqui o Postgres devolve dezenas de linhas já somadas.

    // Datas em ISO para uso direto no SQL
    const ini = startDate.toISOString();
    const fim = endDate.toISOString();

    // 1) Métricas do período + por mês (agrupando no fuso de São Paulo)
    const porMes = await prisma.$queryRaw<
      { mes: string; vendas: number; receita_cents: number }[]
    >`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes,
             COUNT(*)::int AS vendas,
             COALESCE(SUM(amount), 0)::bigint AS receita_cents
      FROM "Order"
      WHERE status = 'paid' AND "createdAt" >= ${ini}::timestamp AND "createdAt" <= ${fim}::timestamp
      GROUP BY 1
    `;

    const mapaMes = new Map(
      porMes.map((r) => [r.mes, { vendas: Number(r.vendas), receita: Number(r.receita_cents) }])
    );

    // Constrói a série preenchendo meses sem venda com zero
    const salesByMonthArray = monthsBR.map((m) => {
      const chaveISO = formatInTimeZone(m.start, TZ, "yyyy-MM");
      const d = mapaMes.get(chaveISO) ?? { vendas: 0, receita: 0 };
      return { month: m.key, sales: d.vendas, revenue: d.receita / 100 };
    });

    const totalSales = salesByMonthArray.reduce((s, m) => s + m.sales, 0);
    const totalRevenue = salesByMonthArray.reduce((s, m) => s + m.revenue, 0) * 100;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // 2) Métricas de todo o período
    const allTimeAgg = await prisma.order.aggregate({
      where: { status: "paid" },
      _count: { _all: true },
      _sum: { amount: true },
    });
    const allTimeTotalSales = allTimeAgg._count._all;
    const allTimeTotalRevenue = allTimeAgg._sum.amount ?? 0;
    const allTimeAverageTicket =
      allTimeTotalSales > 0 ? allTimeTotalRevenue / allTimeTotalSales : 0;

    // 3) Crescimento: mês anterior vs retrasado
    const lastMonth = monthsBR[monthsBR.length - 2]?.key ?? "";
    const twoMonthsAgo = monthsBR[monthsBR.length - 3]?.key ?? "";
    const achaMes = (k: string) => salesByMonthArray.find((m) => m.month === k);
    const lastMonthSales = achaMes(lastMonth)?.sales ?? 0;
    const twoMonthsAgoSales = achaMes(twoMonthsAgo)?.sales ?? 0;
    const lastMonthRevenue = achaMes(lastMonth)?.revenue ?? 0;
    const twoMonthsAgoRevenue = achaMes(twoMonthsAgo)?.revenue ?? 0;

    const salesGrowthRate =
      twoMonthsAgoSales > 0 ? ((lastMonthSales - twoMonthsAgoSales) / twoMonthsAgoSales) * 100 : 0;
    const revenueGrowthRate =
      twoMonthsAgoRevenue > 0 ? ((lastMonthRevenue - twoMonthsAgoRevenue) / twoMonthsAgoRevenue) * 100 : 0;

    // 4) Produtos vendidos — soma por produto no SQL (poucas dezenas de linhas)
    //    e agrupa o nome em JS, reaproveitando a regra já validada.
    const produtos = await prisma.$queryRaw<
      { nome: string; quantidade: number; receita_cents: number }[]
    >`
      SELECT p.name AS nome,
             SUM(oi.quantity)::int AS quantidade,
             COALESCE(SUM(oi.price * oi.quantity), 0)::bigint AS receita_cents
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      JOIN "Product" p ON p.id = oi."productId"
      WHERE o.status = 'paid' AND o."createdAt" >= ${ini}::timestamp AND o."createdAt" <= ${fim}::timestamp
      GROUP BY p.name
    `;

    // Consolida variantes: "Trader 100K - Profit One | THP" -> "Trader 100K"
    const getGroupedProductName = (productName: string): string => {
      const match = productName.match(/^(Trader\s+(?:DIRETO\s+)?\d+K?)/i);
      return match ? match[1] : productName;
    };

    const agrupados: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const p of produtos) {
      const chave = getGroupedProductName(p.nome);
      agrupados[chave] ??= { name: chave, quantity: 0, revenue: 0 };
      agrupados[chave].quantity += Number(p.quantidade);
      agrupados[chave].revenue += Number(p.receita_cents);
    }

    const productsSoldArray = Object.values(agrupados)
      .map((d) => ({ id: d.name, name: d.name, quantity: d.quantity, revenue: d.revenue / 100 }))
      .sort((a, b) => b.quantity - a.quantity);

    // 5) Com vs sem afiliado — totais e série mensal
    const afiliadoPorMes = await prisma.$queryRaw<
      { mes: string; com_afiliado: boolean; vendas: number; receita_cents: number }[]
    >`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes,
             ("affiliateId" IS NOT NULL) AS com_afiliado,
             COUNT(*)::int AS vendas,
             COALESCE(SUM(amount), 0)::bigint AS receita_cents
      FROM "Order"
      WHERE status = 'paid' AND "createdAt" >= ${ini}::timestamp AND "createdAt" <= ${fim}::timestamp
      GROUP BY 1, 2
    `;

    const mapaAfiliado = new Map<string, { com: { c: number; r: number }; sem: { c: number; r: number } }>();
    for (const r of afiliadoPorMes) {
      const atual = mapaAfiliado.get(r.mes) ?? { com: { c: 0, r: 0 }, sem: { c: 0, r: 0 } };
      const alvo = r.com_afiliado ? atual.com : atual.sem;
      alvo.c += Number(r.vendas);
      alvo.r += Number(r.receita_cents);
      mapaAfiliado.set(r.mes, atual);
    }

    const affiliateStatsArray = monthsBR.map((m) => {
      const chaveISO = formatInTimeZone(m.start, TZ, "yyyy-MM");
      const d = mapaAfiliado.get(chaveISO) ?? { com: { c: 0, r: 0 }, sem: { c: 0, r: 0 } };
      return {
        month: m.key,
        withAffiliate: d.com.c,
        withAffiliateRevenue: d.com.r / 100,
        withoutAffiliate: d.sem.c,
        withoutAffiliateRevenue: d.sem.r / 100,
      };
    });

    const totComAfiliado = affiliateStatsArray.reduce(
      (a, m) => ({ c: a.c + m.withAffiliate, r: a.r + m.withAffiliateRevenue }), { c: 0, r: 0 }
    );
    const totSemAfiliado = affiliateStatsArray.reduce(
      (a, m) => ({ c: a.c + m.withoutAffiliate, r: a.r + m.withoutAffiliateRevenue }), { c: 0, r: 0 }
    );

    const affiliateStats = {
      withAffiliate: { count: totComAfiliado.c, revenue: totComAfiliado.r },
      withoutAffiliate: { count: totSemAfiliado.c, revenue: totSemAfiliado.r },
      byMonth: affiliateStatsArray,
    };

    // 6) Top afiliados por receita
    const topAfiliados = await prisma.$queryRaw<
      { id: string; nome: string | null; email: string; receita_cents: number; vendas: number }[]
    >`
      SELECT a.id,
             u.name AS nome,
             u.email,
             COALESCE(SUM(o.amount), 0)::bigint AS receita_cents,
             COUNT(*)::int AS vendas
      FROM "Order" o
      JOIN "Affiliate" a ON a.id = o."affiliateId"
      JOIN "User" u ON u.id = a."userId"
      WHERE o.status = 'paid' AND o."createdAt" >= ${ini}::timestamp AND o."createdAt" <= ${fim}::timestamp
      GROUP BY a.id, u.name, u.email
      ORDER BY receita_cents DESC
      LIMIT 10
    `;

    const topAffiliates = topAfiliados.map((a) => ({
      id: a.id,
      name: a.nome || a.email,
      email: a.email,
      revenue: Number(a.receita_cents) / 100,
      salesCount: Number(a.vendas),
    }));

    const responseData = {
      metrics: {
        totalSales,
        totalRevenue: totalRevenue / 100,
        averageTicket: averageTicket / 100,
        salesGrowthRate: Math.round(salesGrowthRate * 10) / 10,
        revenueGrowthRate: Math.round(revenueGrowthRate * 10) / 10,
      },
      allTimeMetrics: {
        totalSales: allTimeTotalSales,
        totalRevenue: allTimeTotalRevenue / 100,
        averageTicket: allTimeAverageTicket / 100,
      },
      salesByMonth: salesByMonthArray,
      productsSold: productsSoldArray,
      affiliateStats,
      topAffiliates,
    };

    return NextResponse.json(responseData, {
      headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" },
    });
  } catch (error) {
    console.error("Error fetching sales analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales analytics" },
      { status: 500 }
    );
  }
}
