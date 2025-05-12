/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/pixels/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

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

    // Eventos recentes com informações do pixel e produto
    const recentEvents = await prisma.pixelEventLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: {
        createdAt: {
          gte: fromDate,
        },
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
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        platform: event.pixelConfig.platform,
        productName: event.pixelConfig.product.name,
        timestamp: event.createdAt,
        data: event.eventData,
        value: (() => {
          try {
            const data = event.eventData as any;
            return data?.value || null;
          } catch {
            return null;
          }
        })(),
      })),
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
        recentEvents: [],
      },
      { status: 500 }
    );
  }
}
