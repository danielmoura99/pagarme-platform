/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/pixels/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { maskDocument } from "@/lib/mask";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 200);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const eventTypeParam = searchParams.get("eventType");

    const fromDate = fromParam
      ? new Date(fromParam + "T00:00:00")
      : (() => { const d = new Date(); d.setDate(d.getDate() - days); return d; })();
    const toDate = toParam ? new Date(toParam + "T23:59:59") : new Date();

    // Total de eventos de rastreamento (PixelEventLog — inclui todos os eventos do funil)
    const eventStats = await prisma.$queryRaw`
      SELECT COUNT(*) as total_events
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
    `;
    const stats = Array.isArray(eventStats) ? eventStats[0] : eventStats;
    const totalEvents = Number(stats?.total_events || 0);

    // Conversões e receita reais: Order é a fonte confiável (inclui PIX, browser fechado, etc.)
    const orderStats = await prisma.$queryRaw`
      SELECT
        COUNT(*) as total_conversions,
        COALESCE(SUM(amount), 0) as total_revenue_cents
      FROM "Order"
      WHERE status = 'paid'
        AND "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
    `;
    const oStats = Array.isArray(orderStats) ? orderStats[0] : orderStats;
    const totalConversions = Number(oStats?.total_conversions || 0);
    const totalRevenue = Number(oStats?.total_revenue_cents || 0) / 100;

    const conversionRate = totalEvents > 0 ? (totalConversions / totalEvents) * 100 : 0;

    // Eventos por tipo
    const eventsByType = await prisma.pixelEventLog.groupBy({
      by: ["eventType"],
      _count: { id: true },
      where: { createdAt: { gte: fromDate, lte: toDate } },
      orderBy: { _count: { id: "desc" } },
    });

    // Eventos por dia
    const eventsByDay = await prisma.$queryRaw`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as total_events,
        COUNT(CASE WHEN "eventType" = 'Purchase' THEN 1 END) as conversions
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT ${days}
    `;

    // Pixels ativos por plataforma
    const pixelsByPlatform = await prisma.pixelConfig.groupBy({
      by: ["platform"],
      _count: { id: true },
      where: { enabled: true },
    });

    // Filtro de evento para paginação
    const eventFilter = eventTypeParam
      ? { eventType: eventTypeParam }
      : {
          OR: [
            { orderId: { not: null } },
            { eventType: { in: ["Purchase", "InitiateCheckout", "AddPaymentInfo"] } },
          ],
        };

    // Paginação dos lead events
    const totalCount = await prisma.pixelEventLog.count({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        ...eventFilter,
      },
    });

    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const leadEvents = await prisma.pixelEventLog.findMany({
      take: limit,
      skip,
      orderBy: { createdAt: "desc" },
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        ...eventFilter,
      },
      include: {
        pixelConfig: {
          select: {
            platform: true,
            pixelId: true,
            product: { select: { name: true } },
          },
        },
      },
    });

    // Enriquecer lead events com dados do pedido/cliente
    const orderIds = leadEvents.map((e) => e.orderId).filter(Boolean) as string[];
    const orders = orderIds.length > 0
      ? await prisma.order.findMany({
          where: { id: { in: orderIds } },
          include: { customer: { select: { name: true, email: true, document: true } } },
        })
      : [];
    const orderMap = orders.reduce((acc, o) => { acc[o.id] = o; return acc; }, {} as Record<string, typeof orders[0]>);

    // Top produtos por receita real (Order)
    const topProducts = await prisma.$queryRaw`
      SELECT
        p.name as product_name,
        COUNT(DISTINCT o.id) as conversions,
        COALESCE(SUM(oi.price * oi.quantity), 0) as revenue_cents
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      JOIN "Product" p ON p.id = oi."productId"
      WHERE o.status = 'paid'
        AND o."createdAt" >= ${fromDate}
        AND o."createdAt" <= ${toDate}
      GROUP BY p.id, p.name
      ORDER BY revenue_cents DESC
      LIMIT 5
    `;

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
        totalEvents: Number(item.conversions),
        conversions: Number(item.conversions),
        revenue: Number(item.revenue_cents) / 100,
      })),
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
          value: eventData?.value || null,
          customerName: order?.customer?.name || null,
          customerEmail: order?.customer?.email || null,
          customerDocument: order?.customer?.document ? maskDocument(order.customer.document) : null,
          orderId: event.orderId,
          orderStatus: order?.status || null,
          paymentMethod: order?.paymentMethod || null,
          installments: order?.installments || null,
          source: event.source || null,
          campaign: event.campaign || null,
          medium: event.medium || null,
          referrer: event.referrer || null,
        };
      }),
    });
  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch analytics",
        message: "Erro interno do servidor",
        summary: { totalEvents: 0, totalConversions: 0, totalRevenue: 0, conversionRate: 0 },
        charts: { eventsByType: [], eventsByDay: [] },
        platforms: { pixelsByPlatform: [] },
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
