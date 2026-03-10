/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/funnel/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const fromParam = searchParams.get("from");

    const fromDate = fromParam
      ? new Date(fromParam + "T00:00:00")
      : (() => { const d = new Date(); d.setDate(d.getDate() - days); return d; })();

    // Eventos do funil (topo e meio): PageView, ViewContent, InitiateCheckout, AddPaymentInfo
    const funnelData = await prisma.$queryRaw`
      SELECT
        "eventType" as event_type,
        COUNT(*) as count
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
      GROUP BY "eventType"
    `;

    const eventCounts = (funnelData as any[]).reduce((acc, item) => {
      acc[item.event_type] = Number(item.count);
      return acc;
    }, {} as Record<string, number>);

    // Purchase: usar Order como fonte confiável (inclui PIX e browser fechado)
    const paidOrderCount = await prisma.order.count({
      where: {
        status: "paid",
        createdAt: { gte: fromDate },
      },
    });

    // Sessões únicas por etapa (PixelEventLog — topo/meio do funil)
    const uniqueSessionFunnel = await prisma.$queryRaw`
      SELECT
        "eventType",
        COUNT(DISTINCT "sessionId") as unique_sessions
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
        AND "sessionId" IS NOT NULL
      GROUP BY "eventType"
    `;

    const uniqueSessionCounts = (uniqueSessionFunnel as any[]).reduce(
      (acc, item) => {
        acc[item.eventType] = Number(item.unique_sessions);
        return acc;
      },
      {} as Record<string, number>
    );

    const initiateCheckout = eventCounts["InitiateCheckout"] || 0;
    const purchases = paidOrderCount; // fonte confiável

    const funnel = {
      pageViews: eventCounts["PageView"] || 0,
      viewContent: eventCounts["ViewContent"] || 0,
      initiateCheckout,
      addPaymentInfo: eventCounts["AddPaymentInfo"] || 0,
      purchases,

      uniqueSessions: {
        pageViews: uniqueSessionCounts["PageView"] || 0,
        viewContent: uniqueSessionCounts["ViewContent"] || 0,
        initiateCheckout: uniqueSessionCounts["InitiateCheckout"] || 0,
        addPaymentInfo: uniqueSessionCounts["AddPaymentInfo"] || 0,
        purchases, // mesmo valor — Order é a verdade
      },

      conversionRates: {
        viewToCheckout:
          eventCounts["ViewContent"] > 0
            ? (initiateCheckout / eventCounts["ViewContent"]) * 100
            : 0,
        checkoutToPurchase:
          initiateCheckout > 0 ? (purchases / initiateCheckout) * 100 : 0,
        overallConversion:
          eventCounts["ViewContent"] > 0
            ? (purchases / eventCounts["ViewContent"]) * 100
            : 0,
      },
    };

    return NextResponse.json(funnel);
  } catch (error) {
    console.error("[FUNNEL_ANALYTICS_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch funnel analytics",
        pageViews: 0,
        viewContent: 0,
        initiateCheckout: 0,
        addPaymentInfo: 0,
        purchases: 0,
        uniqueSessions: {
          pageViews: 0,
          viewContent: 0,
          initiateCheckout: 0,
          addPaymentInfo: 0,
          purchases: 0,
        },
        conversionRates: { viewToCheckout: 0, checkoutToPurchase: 0, overallConversion: 0 },
      },
      { status: 500 }
    );
  }
}
