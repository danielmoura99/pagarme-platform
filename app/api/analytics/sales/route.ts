// app/api/analytics/sales/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

// Cache simples em memória (válido por 5 minutos)
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verificar cache
    const now = Date.now();
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(cachedData);
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "12");

    // Data atual e início do período
    const currentDate = new Date();
    const startDate = subMonths(startOfMonth(currentDate), months - 1);

    // Buscar apenas os dados necessários (sem customer para otimizar)
    const orders = await prisma.order.findMany({
      where: {
        status: "paid",
        createdAt: {
          gte: startDate,
          lte: endOfMonth(currentDate),
        },
      },
      select: {
        id: true,
        amount: true,
        createdAt: true,
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

    // Processar dados para métricas
    const totalSales = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Vendas por mês
    const salesByMonth: { [key: string]: { count: number; revenue: number } } = {};

    for (let i = 0; i < months; i++) {
      const date = subMonths(now, months - 1 - i);
      const monthKey = format(date, "MMM/yy");
      salesByMonth[monthKey] = { count: 0, revenue: 0 };
    }

    orders.forEach((order) => {
      const monthKey = format(order.createdAt, "MMM/yy");
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
    const lastMonth = format(subMonths(currentDate, 1), "MMM/yy");
    const twoMonthsAgo = format(subMonths(currentDate, 2), "MMM/yy");

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

    const responseData = {
      metrics: {
        totalSales,
        totalRevenue: totalRevenue / 100,
        averageTicket: averageTicket / 100,
        salesGrowthRate: Math.round(salesGrowthRate * 10) / 10,
        revenueGrowthRate: Math.round(revenueGrowthRate * 10) / 10,
      },
      salesByMonth: salesByMonthArray,
      productsSold: productsSoldArray,
    };

    // Atualizar cache
    cachedData = responseData;
    cacheTimestamp = Date.now();

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching sales analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales analytics" },
      { status: 500 }
    );
  }
}
