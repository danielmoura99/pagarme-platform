// app/api/analytics/sales/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
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
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "12");

    // Meses do período, com limites em instantes UTC corretos p/ o fuso do Brasil
    const monthsBR = buildMonthsBR(months);
    const startDate = monthsBR[0].start;
    const endDate = monthsBR[monthsBR.length - 1].end;

    // Buscar apenas os dados necessários (sem customer para otimizar)
    const orders = await prisma.order.findMany({
      where: {
        status: "paid",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        affiliateId: true,
        affiliate: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        items: {
          select: {
            quantity: true,
            price: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Métricas de todo o período (sem filtro de data) para os cards de resumo
    const allTimeOrders = await prisma.order.findMany({
      where: { status: "paid" },
      select: { amount: true },
    });
    const allTimeTotalSales = allTimeOrders.length;
    const allTimeTotalRevenue = allTimeOrders.reduce((sum, o) => sum + o.amount, 0);
    const allTimeAverageTicket = allTimeTotalSales > 0 ? allTimeTotalRevenue / allTimeTotalSales : 0;

    // Processar dados para métricas do período selecionado
    const totalSales = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Vendas por mês
    const salesByMonth: { [key: string]: { count: number; revenue: number } } = {};

    monthsBR.forEach(({ key }) => {
      salesByMonth[key] = { count: 0, revenue: 0 };
    });

    orders.forEach((order) => {
      const monthKey = monthKeyBR(order.createdAt);
      if (salesByMonth[monthKey]) {
        salesByMonth[monthKey].count += 1;
        salesByMonth[monthKey].revenue += order.amount;
      }
    });

    // Produtos mais vendidos
    const productSales: { [key: string]: { name: string; count: number; revenue: number } } = {};

    // Função para agrupar produtos pelo nome base
    const getGroupedProductName = (productName: string): string => {
      // Padrão: pega apenas "Trader XXXXX" ou "Trader DIRETO XX"
      // Exemplos:
      // "Trader 50K - Profit One | THP" → "Trader 50K"
      // "Trader DIRETO 5 - Profit Pro | THP" → "Trader DIRETO 5"
      // "Trader 100K - Profit One + Flash Trader + Planilha de Aprovação" → "Trader 100K"

      const match = productName.match(/^(Trader\s+(?:DIRETO\s+)?\d+K?)/i);

      if (match) {
        return match[1];
      }

      // Se não corresponder ao padrão, retorna o nome original
      return productName;
    };

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const originalProductName = item.product.name;
        const groupedProductName = getGroupedProductName(originalProductName);

        // Usar o nome agrupado como chave para consolidar variantes
        if (!productSales[groupedProductName]) {
          productSales[groupedProductName] = {
            name: groupedProductName,
            count: 0,
            revenue: 0,
          };
        }

        productSales[groupedProductName].count += item.quantity;
        productSales[groupedProductName].revenue += item.price * item.quantity;
      });
    });

    // Converter para arrays
    const salesByMonthArray = Object.entries(salesByMonth).map(([month, data]) => ({
      month,
      sales: data.count,
      revenue: data.revenue / 100, // Converter de centavos para reais
    }));

    const productsSoldArray = Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        quantity: data.count,
        revenue: data.revenue / 100,
      }))
      .sort((a, b) => b.quantity - a.quantity);

    // Calcular crescimento: mês anterior vs mês retrasado
    // Exemplo: Se estamos em Janeiro, compara Dezembro com Novembro
    const lastMonth = monthsBR[monthsBR.length - 2]?.key ?? "";
    const twoMonthsAgo = monthsBR[monthsBR.length - 3]?.key ?? "";

    // Crescimento em quantidade
    const lastMonthSales = salesByMonth[lastMonth]?.count || 0;
    const twoMonthsAgoSales = salesByMonth[twoMonthsAgo]?.count || 0;

    const salesGrowthRate = twoMonthsAgoSales > 0
      ? ((lastMonthSales - twoMonthsAgoSales) / twoMonthsAgoSales) * 100
      : 0;

    // Crescimento em faturamento
    const lastMonthRevenue = salesByMonth[lastMonth]?.revenue || 0;
    const twoMonthsAgoRevenue = salesByMonth[twoMonthsAgo]?.revenue || 0;

    const revenueGrowthRate = twoMonthsAgoRevenue > 0
      ? ((lastMonthRevenue - twoMonthsAgoRevenue) / twoMonthsAgoRevenue) * 100
      : 0;

    // Análise de vendas com/sem afiliação por mês
    const affiliateSalesByMonth: { [key: string]: { withAffiliate: { count: number; revenue: number }, withoutAffiliate: { count: number; revenue: number } } } = {};

    // Inicializar todos os meses
    monthsBR.forEach(({ key }) => {
      affiliateSalesByMonth[key] = {
        withAffiliate: { count: 0, revenue: 0 },
        withoutAffiliate: { count: 0, revenue: 0 },
      };
    });

    // Agrupar por mês e tipo
    orders.forEach((order) => {
      const monthKey = monthKeyBR(order.createdAt);
      if (affiliateSalesByMonth[monthKey]) {
        if (order.affiliateId !== null) {
          affiliateSalesByMonth[monthKey].withAffiliate.count += 1;
          affiliateSalesByMonth[monthKey].withAffiliate.revenue += order.amount;
        } else {
          affiliateSalesByMonth[monthKey].withoutAffiliate.count += 1;
          affiliateSalesByMonth[monthKey].withoutAffiliate.revenue += order.amount;
        }
      }
    });

    // Converter para array
    const affiliateStatsArray = Object.entries(affiliateSalesByMonth).map(([month, data]) => ({
      month,
      withAffiliate: data.withAffiliate.count,
      withAffiliateRevenue: data.withAffiliate.revenue / 100,
      withoutAffiliate: data.withoutAffiliate.count,
      withoutAffiliateRevenue: data.withoutAffiliate.revenue / 100,
    }));

    // Totais gerais
    const withAffiliate = orders.filter(order => order.affiliateId !== null);
    const withoutAffiliate = orders.filter(order => order.affiliateId === null);

    const affiliateStats = {
      withAffiliate: {
        count: withAffiliate.length,
        revenue: withAffiliate.reduce((sum, order) => sum + order.amount, 0) / 100,
      },
      withoutAffiliate: {
        count: withoutAffiliate.length,
        revenue: withoutAffiliate.reduce((sum, order) => sum + order.amount, 0) / 100,
      },
      byMonth: affiliateStatsArray,
    };

    // Top afiliados por faturamento
    const affiliateSales: { [key: string]: { name: string; email: string; revenue: number; count: number } } = {};

    withAffiliate.forEach((order) => {
      if (order.affiliate) {
        const affiliateId = order.affiliate.id;
        const affiliateName = order.affiliate.user.name || order.affiliate.user.email;
        const affiliateEmail = order.affiliate.user.email;

        if (!affiliateSales[affiliateId]) {
          affiliateSales[affiliateId] = {
            name: affiliateName,
            email: affiliateEmail,
            revenue: 0,
            count: 0,
          };
        }

        affiliateSales[affiliateId].revenue += order.amount;
        affiliateSales[affiliateId].count += 1;
      }
    });

    const topAffiliates = Object.entries(affiliateSales)
      .map(([id, data]) => ({
        id,
        name: data.name,
        email: data.email,
        revenue: data.revenue / 100,
        salesCount: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 afiliados

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
