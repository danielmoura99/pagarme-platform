// app/api/integrations/facebook-ads/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchCampaignInsights,
  refreshLongLivedToken,
  tokenIsExpired,
  tokenNeedsRefresh,
} from "@/lib/facebook-ads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
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

    // Limpar dados do período antes de inserir (evita duplicatas por divergência de timezone)
    const periodStart = new Date(dateFrom + "T00:00:00.000Z");
    const periodEnd = new Date(dateTo + "T23:59:59.999Z");

    const deleted = await prisma.facebookAdsCampaignData.deleteMany({
      where: {
        dateStart: { gte: periodStart },
        dateEnd: { lte: periodEnd },
      },
    });
    console.log(`[FB_ADS_SYNC] ${deleted.count} registros antigos removidos do período`);

    // Agregar insights por campaignId + date (API pode retornar múltiplas linhas por ad set)
    const aggregated = new Map<string, {
      campaignId: string;
      campaignName: string;
      dateStart: string;
      dateStop: string;
      impressions: number;
      clicks: number;
      spend: number;
      reach: number;
    }>();

    for (const insight of insights) {
      const key = `${insight.campaign_id}_${insight.date_start}_${insight.date_stop}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.impressions += parseInt(insight.impressions) || 0;
        existing.clicks += parseInt(insight.clicks) || 0;
        existing.spend += parseFloat(insight.spend) || 0;
        existing.reach += parseInt(insight.reach) || 0;
      } else {
        aggregated.set(key, {
          campaignId: insight.campaign_id,
          campaignName: insight.campaign_name,
          dateStart: insight.date_start,
          dateStop: insight.date_stop,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
          spend: parseFloat(insight.spend) || 0,
          reach: parseInt(insight.reach) || 0,
        });
      }
    }

    console.log(`[FB_ADS_SYNC] ${aggregated.size} campanhas únicas após agregação`);

    // Inserir dados frescos cruzando com Orders
    let insertCount = 0;
    for (const agg of aggregated.values()) {
      const dateStart = new Date(agg.dateStart + "T00:00:00.000Z");
      const dateEnd = new Date(agg.dateStop + "T00:00:00.000Z");
      const spend = agg.spend;

      // Buscar compras atribuídas à campanha (via utmCampaign)
      const dayEnd = new Date(agg.dateStop + "T23:59:59.999Z");
      const orders = await prisma.order.findMany({
        where: {
          status: "paid",
          createdAt: { gte: dateStart, lte: dayEnd },
          utmCampaign: agg.campaignName,
        },
        select: { amount: true },
      });

      const purchases = orders.length;
      const revenue = orders.reduce((sum, o) => sum + o.amount, 0) / 100; // centavos → BRL
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = purchases > 0 ? spend / purchases : 0;
      const cpc = agg.clicks > 0 ? spend / agg.clicks : 0;
      const cpm = agg.impressions > 0 ? (spend / agg.impressions) * 1000 : 0;
      const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;

      await prisma.facebookAdsCampaignData.create({
        data: {
          campaignId: agg.campaignId,
          campaignName: agg.campaignName,
          dateStart,
          dateEnd,
          impressions: agg.impressions,
          clicks: agg.clicks,
          spend,
          reach: agg.reach,
          cpc,
          cpm,
          ctr,
          purchases,
          revenue,
          roas,
          cpa,
        },
      });
      insertCount++;
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
        campaigns: insertCount,
        dateRange: `${dateFrom} - ${dateTo}`,
        duration,
      },
    });

    console.log(`[FB_ADS_SYNC_SUCCESS] ${insertCount} campanhas em ${duration}ms`);
    return NextResponse.json({ success: true, campaigns: insertCount, duration });
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
