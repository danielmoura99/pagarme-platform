// app/api/analytics/paid-media/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

type Platform = "meta" | "google";

interface CampaignRow {
  id: string; // "plataforma:campaignId" — evita colisão entre plataformas
  platform: Platform;
  campaignId: string;
  campaignName: string;
  spend: number;
  clicks: number;
  impressions: number;
  reach: number;
  purchases: number;
  revenue: number;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const fromDate = fromParam
      ? new Date(fromParam + "T00:00:00")
      : (() => {
          const d = new Date();
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        })();
    const toDate = toParam ? new Date(toParam + "T23:59:59") : new Date();

    const period = { dateStart: { gte: fromDate }, dateEnd: { lte: toDate } };

    // Configurações e dados das duas plataformas em paralelo
    const [metaConfig, googleConfig, metaRows, googleRows] = await Promise.all([
      prisma.facebookAdsConfig.findFirst({
        select: { accessToken: true, lastSyncAt: true },
      }),
      prisma.googleAdsConfig.findFirst({
        select: { refreshToken: true, enabled: true, lastSyncAt: true },
      }),
      prisma.facebookAdsCampaignData.findMany({ where: period }),
      prisma.googleAdsCampaignData.findMany({ where: period }),
    ]);

    const metaConnected = !!metaConfig?.accessToken;
    const googleConnected = !!googleConfig?.refreshToken;

    // Agrega por campanha (as tabelas têm granularidade diária)
    const map = new Map<string, CampaignRow>();

    const add = (
      platform: Platform,
      campaignId: string,
      campaignName: string,
      values: {
        spend: number;
        clicks: number;
        impressions: number;
        reach: number;
        purchases: number;
        revenue: number;
      }
    ) => {
      const id = `${platform}:${campaignId}`;
      const existing = map.get(id);
      if (existing) {
        existing.spend += values.spend;
        existing.clicks += values.clicks;
        existing.impressions += values.impressions;
        existing.reach += values.reach;
        existing.purchases += values.purchases;
        existing.revenue += values.revenue;
      } else {
        map.set(id, { id, platform, campaignId, campaignName, ...values });
      }
    };

    for (const r of metaRows) {
      add("meta", r.campaignId, r.campaignName, {
        spend: r.spend,
        clicks: r.clicks,
        impressions: r.impressions,
        reach: r.reach,
        purchases: r.purchases,
        revenue: r.revenue,
      });
    }

    for (const r of googleRows) {
      // Google usa "cost" no lugar de "spend" e não expõe alcance
      add("google", r.campaignId, r.campaignName, {
        spend: r.cost,
        clicks: r.clicks,
        impressions: r.impressions,
        reach: 0,
        purchases: r.purchases,
        revenue: r.revenue,
      });
    }

    const campaigns = Array.from(map.values())
      .map((c) => ({
        ...c,
        roas: c.spend > 0 ? c.revenue / c.spend : 0,
        cpa: c.purchases > 0 ? c.spend / c.purchases : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      }))
      .sort((a, b) => b.spend - a.spend);

    if (!metaConnected && !googleConnected) {
      return NextResponse.json({
        connected: false,
        platforms: {
          meta: { connected: false, lastSyncAt: null },
          google: { connected: false, lastSyncAt: null },
        },
        campaigns: [],
        summary: null,
      });
    }

    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0);
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);

    // Sync mais recente entre as plataformas conectadas
    const syncDates = [
      metaConnected ? metaConfig?.lastSyncAt : null,
      googleConnected ? googleConfig?.lastSyncAt : null,
    ].filter(Boolean) as Date[];
    const lastSyncAt =
      syncDates.length > 0
        ? new Date(Math.max(...syncDates.map((d) => d.getTime()))).toISOString()
        : null;

    return NextResponse.json({
      connected: true,
      platforms: {
        meta: {
          connected: metaConnected,
          lastSyncAt: metaConfig?.lastSyncAt ?? null,
        },
        google: {
          connected: googleConnected,
          lastSyncAt: googleConfig?.lastSyncAt ?? null,
        },
      },
      summary: {
        totalSpend,
        totalRevenue,
        totalPurchases,
        totalClicks,
        totalImpressions,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
        profit: totalRevenue - totalSpend,
        lastSyncAt,
      },
      campaigns,
    });
  } catch (error) {
    console.error("[PAID_MEDIA_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch paid media data",
        connected: false,
        platforms: {
          meta: { connected: false, lastSyncAt: null },
          google: { connected: false, lastSyncAt: null },
        },
        campaigns: [],
        summary: null,
      },
      { status: 500 }
    );
  }
}
