/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/pixels/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Calcular data de início
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Usar query SQL raw para estatísticas principais (corrigindo nomes das colunas)
    const eventStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN "eventType" = 'Purchase' THEN 1 END) as total_conversions,
        COALESCE(
          SUM(
            CASE 
              WHEN "eventType" = 'Purchase' 
              AND jsonb_typeof("eventData"->'value') = 'number'
              THEN ("eventData"->>'value')::float 
              ELSE 0 
            END
          ), 
          0
        ) as total_revenue
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
    `;

    // Converter o resultado para formato TypeScript
    const stats = Array.isArray(eventStats) ? eventStats[0] : eventStats;
    const totalEvents = Number(stats?.total_events || 0);
    const totalConversions = Number(stats?.total_conversions || 0);
    const totalRevenue = Number(stats?.total_revenue || 0);

    // Calcular taxa de conversão
    const conversionRate =
      totalEvents > 0 ? (totalConversions / totalEvents) * 100 : 0;

    // Eventos por tipo (usando Prisma ORM)
    const eventsByType = await prisma.pixelEventLog.groupBy({
      by: ["eventType"],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: fromDate,
        },
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Eventos por dia (últimos N dias) - corrigindo nomes das colunas
    const eventsByDay = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as total_events,
        COUNT(CASE WHEN "eventType" = 'Purchase' THEN 1 END) as conversions
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT ${days}
    `;

    // Pixels por plataforma
    const pixelsByPlatform = await prisma.pixelConfig.groupBy({
      by: ["platform"],
      _count: {
        id: true,
      },
      where: {
        enabled: true,
      },
    });

    // Contar total de eventos para paginação
    const totalCount = await prisma.pixelEventLog.count({
      where: {
        createdAt: {
          gte: fromDate,
        },
        OR: [
          { orderId: { not: null } }, // Eventos com pedidos
          { eventType: { in: ["Purchase", "InitiateCheckout", "AddPaymentInfo"] } } // Eventos importantes
        ]
      }
    });

    // Calcular paginação
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Eventos com dados de leads (do mais novo para o mais antigo)
    const leadEvents = await prisma.pixelEventLog.findMany({
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" }, // Do mais novo para o mais antigo
      where: {
        createdAt: {
          gte: fromDate,
        },
        OR: [
          { orderId: { not: null } }, // Eventos com pedidos
          { eventType: { in: ["Purchase", "InitiateCheckout", "AddPaymentInfo"] } } // Eventos importantes
        ]
      },
      include: {
        pixelConfig: {
          select: {
            platform: true,
            pixelId: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Buscar dados dos pedidos para os eventos que têm orderId
    const orderIds = leadEvents
      .map(event => event.orderId)
      .filter(Boolean) as string[];

    const orders = orderIds.length > 0 ? await prisma.order.findMany({
      where: {
        id: { in: orderIds }
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
            document: true
          }
        }
      }
    }) : [];

    // Criar um mapa de pedidos para facilitar o lookup
    const orderMap = orders.reduce((acc, order) => {
      acc[order.id] = order;
      return acc;
    }, {} as Record<string, typeof orders[0]>);

    // Top produtos por conversões - corrigindo nomes das colunas
    const topProducts = await prisma.$queryRaw`
      SELECT 
        p.name as product_name,
        COUNT(pel.id) as total_events,
        COUNT(CASE WHEN pel."eventType" = 'Purchase' THEN 1 END) as conversions,
        COALESCE(
          SUM(
            CASE 
              WHEN pel."eventType" = 'Purchase' 
              AND jsonb_typeof(pel."eventData"->'value') = 'number'
              THEN (pel."eventData"->>'value')::float 
              ELSE 0 
            END
          ), 
          0
        ) as revenue
      FROM "PixelEventLog" pel
      JOIN "PixelConfig" pc ON pc.id = pel."pixelConfigId"
      JOIN "Product" p ON p.id = pc."productId"
      WHERE pel."createdAt" >= ${fromDate}
      GROUP BY p.id, p.name
      ORDER BY conversions DESC, revenue DESC
      LIMIT 5
    `;

    // Formatar dados para retorno
    return NextResponse.json({
      summary: {
        totalEvents,
        totalConversions,
        totalRevenue,
        conversionRate: Number(conversionRate.toFixed(2)),
      },
      charts: {
        eventsByType: eventsByType.map((item) => ({
          eventType: item.eventType,
          count: item._count.id,
        })),
        eventsByDay: (eventsByDay as any[]).map((item) => ({
          date: item.date,
          totalEvents: Number(item.total_events),
          conversions: Number(item.conversions),
        })),
      },
      platforms: {
        pixelsByPlatform: pixelsByPlatform.map((item) => ({
          platform: item.platform,
          count: item._count.id,
        })),
      },
      topProducts: (topProducts as any[]).map((item) => ({
        productName: item.product_name,
        totalEvents: Number(item.total_events),
        conversions: Number(item.conversions),
        revenue: Number(item.revenue),
      })),
      // Dados de paginação
      totalCount,
      currentPage: page,
      totalPages,
      leadEvents: leadEvents.map((event) => {
        const order = event.orderId ? orderMap[event.orderId] : null;
        const eventData = event.eventData as any;
        
        return {
          id: event.id,
          eventType: event.eventType,
          platform: event.pixelConfig.platform,
          productName: event.pixelConfig.product.name,
          timestamp: event.createdAt,
          data: eventData,
          value: (() => {
            try {
              return eventData?.value || null;
            } catch {
              return null;
            }
          })(),
          // Dados do lead/cliente
          customerName: order?.customer?.name || null,
          customerEmail: order?.customer?.email || null,
          customerDocument: order?.customer?.document || null,
          // Dados do pedido
          orderId: event.orderId,
          orderStatus: order?.status || null,
          paymentMethod: order?.paymentMethod || null,
          installments: order?.installments || null,
          // Dados de tracking
          source: event.source || null,
          campaign: event.campaign || null,
          medium: event.medium || null,
          referrer: event.referrer || null,
        };
      }),
    });
  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);

    // Retornar uma resposta de erro estruturada
    return NextResponse.json(
      {
        error: "Failed to fetch analytics",
        message: error instanceof Error ? error.message : "Unknown error",
        summary: {
          totalEvents: 0,
          totalConversions: 0,
          totalRevenue: 0,
          conversionRate: 0,
        },
        charts: {
          eventsByType: [],
          eventsByDay: [],
        },
        platforms: {
          pixelsByPlatform: [],
        },
        topProducts: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
        leadEvents: [],
      },
      { status: 500 }
    );
  }
}
