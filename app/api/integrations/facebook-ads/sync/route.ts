// app/api/integrations/facebook-ads/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchCampaignInsights,
  refreshLongLivedToken,
  tokenIsExpired,
  tokenNeedsRefresh,
} from "@/lib/facebook-ads";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const startMs = Date.now();
  let configId = "";

  try {
    const body = await request.json().catch(() => ({}));
    const today = new Date().toISOString().split("T")[0];
    const dateFrom: string = body.dateFrom || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split("T")[0];
    })();
    const dateTo: string = body.dateTo || today;

    const config = await prisma.facebookAdsConfig.findFirst();
    if (!config?.accessToken) {
      return NextResponse.json({ error: "Não conectado ao Facebook Ads" }, { status: 401 });
    }
    if (!config.adAccountId) {
      return NextResponse.json({ error: "Nenhuma conta de anúncio selecionada" }, { status: 400 });
    }
    if (tokenIsExpired(config.tokenExpiresAt)) {
      return NextResponse.json({ error: "Token expirado. Reconecte sua conta." }, { status: 401 });
    }

    configId = config.id;
    let accessToken = config.accessToken;

    // Refresh preventivo se expira em < 7 dias
    if (tokenNeedsRefresh(config.tokenExpiresAt)) {
      console.log("[FB_ADS_SYNC] Token próximo do vencimento, renovando...");
      const refreshed = await refreshLongLivedToken(accessToken);
      accessToken = refreshed.accessToken;
      await prisma.facebookAdsConfig.update({
        where: { id: config.id },
        data: { accessToken, tokenExpiresAt: refreshed.expiresAt },
      });
    }

    console.log(`[FB_ADS_SYNC_START] Período: ${dateFrom} → ${dateTo}`);
    const insights = await fetchCampaignInsights(
      accessToken,
      config.adAccountId,
      dateFrom,
      dateTo
    );

    console.log(`[FB_ADS_SYNC] ${insights.length} registros recebidos da API`);

    // Para cada insight, cruzar com Orders do mesmo período e campanha
    let upsertCount = 0;
    for (const insight of insights) {
      const dateStart = new Date(insight.date_start + "T00:00:00");
      const dateEnd = new Date(insight.date_stop + "T23:59:59");
      const spend = parseFloat(insight.spend) || 0;

      // Buscar compras atribuídas à campanha (via utmCampaign)
      const orders = await prisma.order.findMany({
        where: {
          status: "paid",
          createdAt: { gte: dateStart, lte: dateEnd },
          utmCampaign: insight.campaign_name,
        },
        select: { amount: true },
      });

      const purchases = orders.length;
      const revenue = orders.reduce((sum, o) => sum + o.amount, 0) / 100; // centavos → BRL
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = purchases > 0 ? spend / purchases : 0;

      await prisma.facebookAdsCampaignData.upsert({
        where: {
          campaignId_dateStart_dateEnd: {
            campaignId: insight.campaign_id,
            dateStart,
            dateEnd,
          },
        },
        update: {
          campaignName: insight.campaign_name,
          adSetId: insight.adset_id || null,
          adSetName: insight.adset_name || null,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
          spend,
          reach: parseInt(insight.reach) || 0,
          cpc: parseFloat(insight.cpc) || 0,
          cpm: parseFloat(insight.cpm) || 0,
          ctr: parseFloat(insight.ctr) || 0,
          purchases,
          revenue,
          roas,
          cpa,
          syncedAt: new Date(),
        },
        create: {
          campaignId: insight.campaign_id,
          campaignName: insight.campaign_name,
          adSetId: insight.adset_id || null,
          adSetName: insight.adset_name || null,
          dateStart,
          dateEnd,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
          spend,
          reach: parseInt(insight.reach) || 0,
          cpc: parseFloat(insight.cpc) || 0,
          cpm: parseFloat(insight.cpm) || 0,
          ctr: parseFloat(insight.ctr) || 0,
          purchases,
          revenue,
          roas,
          cpa,
        },
      });
      upsertCount++;
    }

    const duration = Date.now() - startMs;
    await prisma.facebookAdsConfig.update({
      where: { id: config.id },
      data: { lastSyncAt: new Date() },
    });

    await prisma.facebookAdsSyncLog.create({
      data: {
        configId: config.id,
        status: "success",
        campaigns: upsertCount,
        dateRange: `${dateFrom} - ${dateTo}`,
        duration,
      },
    });

    console.log(`[FB_ADS_SYNC_SUCCESS] ${upsertCount} campanhas em ${duration}ms`);
    return NextResponse.json({ success: true, campaigns: upsertCount, duration });
  } catch (error) {
    const duration = Date.now() - startMs;
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[FB_ADS_SYNC_ERROR]", msg);

    if (configId) {
      await prisma.facebookAdsSyncLog.create({
        data: {
          configId,
          status: "error",
          campaigns: 0,
          errorMessage: msg,
          duration,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
