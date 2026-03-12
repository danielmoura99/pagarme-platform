// app/api/analytics/paid-media/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const fromDate = fromParam
      ? new Date(fromParam + "T00:00:00")
      : (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })();
    const toDate = toParam
      ? new Date(toParam + "T23:59:59")
      : new Date();

    // Verificar se há integração configurada
    const config = await prisma.facebookAdsConfig.findFirst({
      select: { enabled: true, accessToken: true, lastSyncAt: true },
    });

    if (!config?.accessToken) {
      return NextResponse.json({ connected: false, campaigns: [], summary: null });
    }

    // Buscar dados de campanhas no período
    const campaigns = await prisma.facebookAdsCampaignData.findMany({
      where: {
        dateStart: { gte: fromDate },
        dateEnd: { lte: toDate },
      },
      orderBy: { spend: "desc" },
    });

    // Agregar por campanha (pode haver múltiplos dias por campanha)
    const campaignMap = new Map<string, {
      campaignId: string;
      campaignName: string;
      spend: number;
      clicks: number;
      impressions: number;
      reach: number;
      purchases: number;
      revenue: number;
    }>();

    for (const row of campaigns) {
      const existing = campaignMap.get(row.campaignId);
      if (existing) {
        existing.spend += row.spend;
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.reach += row.reach;
        existing.purchases += row.purchases;
        existing.revenue += row.revenue;
      } else {
        campaignMap.set(row.campaignId, {
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          spend: row.spend,
          clicks: row.clicks,
          impressions: row.impressions,
          reach: row.reach,
          purchases: row.purchases,
          revenue: row.revenue,
        });
      }
    }

    const aggregated = Array.from(campaignMap.values())
      .map((c) => ({
        ...c,
        roas: c.spend > 0 ? c.revenue / c.spend : 0,
        cpa: c.purchases > 0 ? c.spend / c.purchases : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);

    // Totais gerais
    const totalSpend = aggregated.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = aggregated.reduce((s, c) => s + c.revenue, 0);
    const totalPurchases = aggregated.reduce((s, c) => s + c.purchases, 0);
    const totalClicks = aggregated.reduce((s, c) => s + c.clicks, 0);
    const totalImpressions = aggregated.reduce((s, c) => s + c.impressions, 0);

    const summary = {
      totalSpend,
      totalRevenue,
      totalPurchases,
      totalClicks,
      totalImpressions,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
      profit: totalRevenue - totalSpend,
      lastSyncAt: config.lastSyncAt,
    };

    return NextResponse.json({ connected: true, summary, campaigns: aggregated });
  } catch (error) {
    console.error("[PAID_MEDIA_ANALYTICS_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar dados de mídia paga" }, { status: 500 });
  }
}
