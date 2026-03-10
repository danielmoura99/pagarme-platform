/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/traffic-sources/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const fromDate = fromParam
      ? new Date(fromParam + "T00:00:00")
      : (() => { const d = new Date(); d.setDate(d.getDate() - days); return d; })();
    const toDate = toParam ? new Date(toParam + "T23:59:59") : new Date();

    // Visitantes por fonte (PixelEventLog — inclui quem não comprou)
    const visitorsBySource = await prisma.$queryRaw`
      SELECT
        COALESCE(source, 'direct') as source,
        COALESCE(medium, 'none') as medium,
        COALESCE(campaign, '') as campaign,
        COUNT(DISTINCT "sessionId") as visitors,
        COUNT(*) as total_events
      FROM "PixelEventLog"
      WHERE "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
        AND "sessionId" IS NOT NULL
      GROUP BY source, medium, campaign
      ORDER BY visitors DESC
    `;

    // Conversões e receita por fonte (Order — fonte confiável, inclui PIX e browser fechado)
    const conversionsBySource = await prisma.$queryRaw`
      SELECT
        COALESCE("utmSource", 'direct') as source,
        COALESCE("utmMedium", 'none') as medium,
        COALESCE("utmCampaign", '') as campaign,
        COUNT(*) as conversions,
        SUM(amount) as revenue_cents
      FROM "Order"
      WHERE status = 'paid'
        AND "createdAt" >= ${fromDate}
        AND "createdAt" <= ${toDate}
      GROUP BY "utmSource", "utmMedium", "utmCampaign"
    `;

    // Indexar conversões para merge eficiente
    const convMap = new Map<string, { conversions: number; revenue: number }>();
    (conversionsBySource as any[]).forEach((row) => {
      const key = `${row.source}||${row.medium}||${row.campaign}`;
      convMap.set(key, {
        conversions: Number(row.conversions) || 0,
        revenue: Number(row.revenue_cents) / 100 || 0,
      });
    });

    // Merge visitantes + conversões
    const formattedSources = (visitorsBySource as any[]).map((row) => {
      const visitors = Number(row.visitors) || 0;
      const totalEvents = Number(row.total_events) || 0;
      const key = `${row.source}||${row.medium}||${row.campaign}`;
      const conv = convMap.get(key) || { conversions: 0, revenue: 0 };

      return {
        source: row.source || "direct",
        medium: row.medium || "none",
        campaign: row.campaign || null,
        visitors,
        totalEvents,
        conversions: conv.conversions,
        revenue: conv.revenue,
        conversionRate: visitors > 0 ? (conv.conversions / visitors) * 100 : 0,
        eventsPerVisitor: visitors > 0 ? totalEvents / visitors : 0,
        averageOrderValue: conv.conversions > 0 ? conv.revenue / conv.conversions : 0,
      };
    });

    // Adicionar fontes com conversões mas sem visitantes rastreados (ex: PIX sem pixel)
    (conversionsBySource as any[]).forEach((row) => {
      const key = `${row.source}||${row.medium}||${row.campaign}`;
      const alreadyInList = formattedSources.some(
        (s) => `${s.source}||${s.medium}||${s.campaign || ""}` === key
      );
      if (!alreadyInList) {
        const conv = convMap.get(key) || { conversions: 0, revenue: 0 };
        formattedSources.push({
          source: row.source || "direct",
          medium: row.medium || "none",
          campaign: row.campaign || null,
          visitors: 0,
          totalEvents: 0,
          conversions: conv.conversions,
          revenue: conv.revenue,
          conversionRate: 0,
          eventsPerVisitor: 0,
          averageOrderValue: conv.conversions > 0 ? conv.revenue / conv.conversions : 0,
        });
      }
    });

    // Campanhas: UNION entre Order (compras) e PixelEventLog (acessos)
    // Inclui campanhas com trafego mesmo sem conversao
    const topCampaigns = await prisma.$queryRaw`
      SELECT
        campaign,
        source,
        medium,
        SUM(conversions)       as conversions,
        SUM(revenue_cents)     as revenue_cents,
        SUM(initiate_checkout) as initiate_checkout
      FROM (
        SELECT
          "utmCampaign"  as campaign,
          "utmSource"    as source,
          "utmMedium"    as medium,
          COUNT(*)       as conversions,
          SUM(amount)    as revenue_cents,
          0              as initiate_checkout
        FROM "Order"
        WHERE status = 'paid'
          AND "createdAt" >= ${fromDate}
          AND "createdAt" <= ${toDate}
          AND "utmCampaign" IS NOT NULL
          AND "utmCampaign" != ''
        GROUP BY "utmCampaign", "utmSource", "utmMedium"

        UNION ALL

        SELECT
          campaign,
          COALESCE(source, 'direct') as source,
          COALESCE(medium, 'none')   as medium,
          0                          as conversions,
          0                          as revenue_cents,
          COUNT(*)                   as initiate_checkout
        FROM "PixelEventLog"
        WHERE "eventType" = 'InitiateCheckout'
          AND "createdAt" >= ${fromDate}
          AND "createdAt" <= ${toDate}
          AND campaign IS NOT NULL
          AND campaign != ''
        GROUP BY campaign, source, medium
      ) combined
      GROUP BY campaign, source, medium
      ORDER BY conversions DESC, initiate_checkout DESC
      LIMIT 20
    `;

    // Landing pages (PixelEventLog — é onde registramos a primeira visita)
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
        AND "createdAt" <= ${toDate}
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
        totalConversions: formattedSources.reduce((sum, s) => sum + s.conversions, 0),
        totalRevenue: formattedSources.reduce((sum, s) => sum + s.revenue, 0),
        averageConversionRate:
          formattedSources.length > 0
            ? formattedSources.reduce((sum, s) => sum + s.conversionRate, 0) /
              formattedSources.length
            : 0,
      },
      topCampaigns: (topCampaigns as any[]).map((campaign) => {
        const conversions = Number(campaign.conversions) || 0;
        const revenue = Number(campaign.revenue_cents) / 100 || 0;
        const initiateCheckout = Number(campaign.initiate_checkout) || 0;

        return {
          campaign: campaign.campaign,
          source: campaign.source,
          medium: campaign.medium,
          initiateCheckout,
          conversions,
          revenue,
          conversionRate: initiateCheckout > 0 ? (conversions / initiateCheckout) * 100 : 0,
        };
      }),
      landingPages: (landingPages as any[]).map((page) => {
        const visitors = Number(page.visitors) || 0;
        const conversions = Number(page.conversions) || 0;
        const revenue = Number(page.revenue) || 0;

        return {
          url: page.landingPage,
          visitors,
          conversions,
          revenue,
          conversionRate: visitors > 0 ? (conversions / visitors) * 100 : 0,
        };
      }),
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
