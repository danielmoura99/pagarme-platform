// app/api/cron/sync-facebook-ads/route.ts
// Chamado pelo Vercel Cron Jobs (vercel.json) a cada 6 horas
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  fetchCampaignInsights,
  refreshLongLivedToken,
  tokenIsExpired,
  tokenNeedsRefresh,
} from "@/lib/facebook-ads";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // segundos (Vercel Pro/Hobby limit)

export async function GET(request: Request) {
  // Validar CRON_SECRET para evitar chamadas não autorizadas
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startMs = Date.now();
  let configId = "";

  try {
    const config = await prisma.facebookAdsConfig.findFirst();

    // Sem config ou desabilitado: sair silenciosamente
    if (!config?.accessToken || !config.enabled) {
      return NextResponse.json({ skipped: true, reason: "not configured or disabled" });
    }

    if (!config.adAccountId) {
      return NextResponse.json({ skipped: true, reason: "no ad account selected" });
    }

    if (tokenIsExpired(config.tokenExpiresAt)) {
      console.warn("[FB_ADS_CRON] Token expirado — sync cancelado");
      return NextResponse.json({ skipped: true, reason: "token expired" });
    }

    // Verificar se autoSync está ativado
    if (!config.autoSync) {
      return NextResponse.json({ skipped: true, reason: "autoSync disabled" });
    }

    // Verificar se já sincronizou recentemente (dentro do intervalo configurado)
    if (config.lastSyncAt) {
      const intervalMs = (config.syncInterval || 360) * 60 * 1000;
      const timeSinceSync = Date.now() - new Date(config.lastSyncAt).getTime();
      if (timeSinceSync < intervalMs) {
        return NextResponse.json({
          skipped: true,
          reason: `synced ${Math.round(timeSinceSync / 60000)}min ago, interval is ${config.syncInterval}min`,
        });
      }
    }

    configId = config.id;
    let accessToken = config.accessToken;

    // Refresh preventivo se expira em < 7 dias
    if (tokenNeedsRefresh(config.tokenExpiresAt)) {
      console.log("[FB_ADS_CRON] Token próximo do vencimento, renovando...");
      try {
        const refreshed = await refreshLongLivedToken(accessToken);
        accessToken = refreshed.accessToken;
        await prisma.facebookAdsConfig.update({
          where: { id: config.id },
          data: { accessToken, tokenExpiresAt: refreshed.expiresAt },
        });
      } catch (err) {
        console.warn("[FB_ADS_CRON] Falha ao renovar token:", err);
        // Continuar com token atual (System User tokens não expiram)
      }
    }

    // Período de sync: últimos 7 dias (para reprocessar dados recentes)
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    })();

    console.log(`[FB_ADS_CRON_START] Período: ${sevenDaysAgo} → ${today}`);

    const insights = await fetchCampaignInsights(
      accessToken,
      config.adAccountId,
      sevenDaysAgo,
      today
    );

    console.log(`[FB_ADS_CRON] ${insights.length} registros recebidos da API`);

    // Limpar dados do período antes de inserir (evita duplicatas)
    const periodStart = new Date(sevenDaysAgo + "T00:00:00.000Z");
    const periodEnd = new Date(today + "T23:59:59.999Z");

    const deleted = await prisma.facebookAdsCampaignData.deleteMany({
      where: {
        dateStart: { gte: periodStart },
        dateEnd: { lte: periodEnd },
      },
    });
    console.log(`[FB_ADS_CRON] ${deleted.count} registros antigos removidos`);

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

    let insertCount = 0;
    for (const agg of aggregated.values()) {
      const dateStart = new Date(agg.dateStart + "T00:00:00.000Z");
      const dateEnd = new Date(agg.dateStop + "T00:00:00.000Z");
      const spend = agg.spend;

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
      const revenue = orders.reduce((sum, o) => sum + o.amount, 0) / 100;
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
        dateRange: `${sevenDaysAgo} - ${today}`,
        duration,
      },
    });

    console.log(`[FB_ADS_CRON_SUCCESS] ${insertCount} campanhas em ${duration}ms`);
    return NextResponse.json({ success: true, campaigns: insertCount, duration });
  } catch (error) {
    const duration = Date.now() - startMs;
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[FB_ADS_CRON_ERROR]", msg);

    if (configId) {
      await prisma.facebookAdsSyncLog
        .create({
          data: {
            configId,
            status: "error",
            campaigns: 0,
            errorMessage: msg,
            duration,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
