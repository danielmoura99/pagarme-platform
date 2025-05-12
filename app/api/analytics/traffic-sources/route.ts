/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/traffic-sources/route.ts
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

    // Analisar por fonte de tráfego
    const trafficSources = await prisma.$queryRaw`
      SELECT 
        COALESCE(source, 'direct') as source,
        COALESCE(medium, 'none') as medium,
        COALESCE(campaign, '') as campaign,
        COUNT(DISTINCT "sessionId") as visitors,
        COUNT(*) as total_events,
        COUNT(CASE WHEN "eventType" = 'Purchase' THEN 1 END) as conversions,
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
        ) as revenue
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
        AND "sessionId" IS NOT NULL
      GROUP BY source, medium, campaign
      ORDER BY visitors DESC
    `;

    // Calcular métricas por fonte
    const formattedSources = (trafficSources as any[]).map((source) => ({
      source: source.source || "direct",
      medium: source.medium || "none",
      campaign: source.campaign || "",
      visitors: Number(source.visitors),
      totalEvents: Number(source.total_events),
      conversions: Number(source.conversions),
      revenue: Number(source.revenue),
      conversionRate:
        source.visitors > 0
          ? (Number(source.conversions) / Number(source.visitors)) * 100
          : 0,
      eventsPerVisitor:
        source.visitors > 0
          ? Number(source.total_events) / Number(source.visitors)
          : 0,
      averageOrderValue:
        source.conversions > 0
          ? Number(source.revenue) / Number(source.conversions)
          : 0,
    }));

    // Top campanhas
    const topCampaigns = await prisma.$queryRaw`
      SELECT 
        campaign,
        source,
        medium,
        COUNT(DISTINCT "sessionId") as visitors,
        COUNT(CASE WHEN "eventType" = 'Purchase' THEN 1 END) as conversions,
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
        ) as revenue
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
        AND campaign IS NOT NULL 
        AND campaign != ''
        AND "sessionId" IS NOT NULL
      GROUP BY campaign, source, medium
      ORDER BY conversions DESC, revenue DESC
      LIMIT 10
    `;

    // Análise de páginas de entrada (landing pages)
    const landingPages = await prisma.$queryRaw`
      SELECT 
        "landingPage",
        COUNT(DISTINCT "sessionId") as visitors,
        COUNT(CASE WHEN "eventType" = 'Purchase' THEN 1 END) as conversions,
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
        ) as revenue
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
        AND "landingPage" IS NOT NULL
        AND "sessionId" IS NOT NULL
      GROUP BY "landingPage"
      ORDER BY visitors DESC
      LIMIT 10
    `;

    return NextResponse.json({
      sources: formattedSources,
      summary: {
        totalSources: formattedSources.length,
        totalVisitors: formattedSources.reduce((sum, s) => sum + s.visitors, 0),
        totalConversions: formattedSources.reduce(
          (sum, s) => sum + s.conversions,
          0
        ),
        totalRevenue: formattedSources.reduce((sum, s) => sum + s.revenue, 0),
        averageConversionRate:
          formattedSources.length > 0
            ? formattedSources.reduce((sum, s) => sum + s.conversionRate, 0) /
              formattedSources.length
            : 0,
      },
      topCampaigns: (topCampaigns as any[]).map((campaign) => ({
        campaign: campaign.campaign,
        source: campaign.source,
        medium: campaign.medium,
        visitors: Number(campaign.visitors),
        conversions: Number(campaign.conversions),
        revenue: Number(campaign.revenue),
        conversionRate:
          campaign.visitors > 0
            ? (Number(campaign.conversions) / Number(campaign.visitors)) * 100
            : 0,
      })),
      landingPages: (landingPages as any[]).map((page) => ({
        url: page.landingPage,
        visitors: Number(page.visitors),
        conversions: Number(page.conversions),
        revenue: Number(page.revenue),
        conversionRate:
          page.visitors > 0
            ? (Number(page.conversions) / Number(page.visitors)) * 100
            : 0,
      })),
    });
  } catch (error) {
    console.error("[TRAFFIC_SOURCES_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch traffic sources",
        sources: [],
        summary: {
          totalSources: 0,
          totalVisitors: 0,
          totalConversions: 0,
          totalRevenue: 0,
          averageConversionRate: 0,
        },
        topCampaigns: [],
        landingPages: [],
      },
      { status: 500 }
    );
  }
}
