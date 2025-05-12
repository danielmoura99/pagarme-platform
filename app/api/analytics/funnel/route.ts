/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/funnel/route.ts
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

    // Contar eventos por tipo (funil)
    const funnelData = await prisma.$queryRaw`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
      GROUP BY event_type
    `;

    // Converter array de resultados em objeto para facilitar o uso
    const eventCounts = (funnelData as any[]).reduce((acc, item) => {
      acc[item.event_type] = Number(item.count);
      return acc;
    }, {});

    // Também vamos contar sessões únicas para cada etapa
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
      {}
    );

    // Estruturar dados do funil
    const funnel = {
      // Contagem total de eventos
      pageViews: eventCounts["PageView"] || 0,
      viewContent: eventCounts["ViewContent"] || 0,
      initiateCheckout: eventCounts["InitiateCheckout"] || 0,
      addPaymentInfo: eventCounts["AddPaymentInfo"] || 0,
      purchases: eventCounts["Purchase"] || 0,

      // Sessões únicas (usuários únicos)
      uniqueSessions: {
        pageViews: uniqueSessionCounts["PageView"] || 0,
        viewContent: uniqueSessionCounts["ViewContent"] || 0,
        initiateCheckout: uniqueSessionCounts["InitiateCheckout"] || 0,
        addPaymentInfo: uniqueSessionCounts["AddPaymentInfo"] || 0,
        purchases: uniqueSessionCounts["Purchase"] || 0,
      },

      // Taxas de conversão
      conversionRates: {
        viewToCheckout:
          eventCounts["ViewContent"] > 0
            ? (eventCounts["InitiateCheckout"] / eventCounts["ViewContent"]) *
              100
            : 0,
        checkoutToPurchase:
          eventCounts["InitiateCheckout"] > 0
            ? (eventCounts["Purchase"] / eventCounts["InitiateCheckout"]) * 100
            : 0,
        overallConversion:
          eventCounts["ViewContent"] > 0
            ? (eventCounts["Purchase"] / eventCounts["ViewContent"]) * 100
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
        conversionRates: {
          viewToCheckout: 0,
          checkoutToPurchase: 0,
          overallConversion: 0,
        },
      },
      { status: 500 }
    );
  }
}
