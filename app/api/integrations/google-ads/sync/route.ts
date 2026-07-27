// app/api/integrations/google-ads/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { fetchCampaignMetrics } from "@/lib/tracking/google-ads-api";

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
    const dateFrom: string =
      body.dateFrom ||
      (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
      })();
    const dateTo: string = body.dateTo || today;

    const config = await prisma.googleAdsConfig.findFirst();
    if (
      !config?.developerToken ||
      !config.clientId ||
      !config.clientSecret ||
      !config.refreshToken ||
      !config.customerId
    ) {
      return NextResponse.json(
        { error: "Credenciais do Google Ads incompletas" },
        { status: 400 }
      );
    }
    configId = config.id;

    console.log(`[GOOGLE_ADS_SYNC_START] Período: ${dateFrom} → ${dateTo}`);

    const { metrics, error } = await fetchCampaignMetrics(
      {
        developerToken: config.developerToken,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        refreshToken: config.refreshToken,
        customerId: config.customerId,
        loginCustomerId: config.loginCustomerId,
      },
      dateFrom,
      dateTo
    );

    if (error || !metrics) {
      throw new Error(error || "Falha ao buscar métricas");
    }

    console.log(`[GOOGLE_ADS_SYNC] ${metrics.length} linhas recebidas`);

    // Limpar o período antes de reinserir (evita duplicatas/divergência de fuso)
    const periodStart = new Date(dateFrom + "T00:00:00.000Z");
    const periodEnd = new Date(dateTo + "T23:59:59.999Z");
    const deleted = await prisma.googleAdsCampaignData.deleteMany({
      where: { dateStart: { gte: periodStart }, dateEnd: { lte: periodEnd } },
    });
    console.log(`[GOOGLE_ADS_SYNC] ${deleted.count} registros antigos removidos`);

    let insertCount = 0;

    for (const m of metrics) {
      if (!m.campaignId || !m.date) continue;

      const dateStart = new Date(m.date + "T00:00:00.000Z");
      const dateEnd = new Date(m.date + "T00:00:00.000Z");
      const dayEnd = new Date(m.date + "T23:59:59.999Z");

      // Cruzar com vendas reais: pedidos pagos daquele dia atribuídos à campanha.
      //
      // ATRIBUIÇÃO POR PRIORIDADE — evita contar a mesma venda em duas campanhas:
      //   1) gadCampaignId (enviado pelo próprio Google) tem precedência absoluta;
      //   2) o fallback por utm_campaign vale SOMENTE para pedidos sem gadCampaignId.
      //
      // Sem essa separação, um pedido com gadCampaignId da campanha A mas
      // utm_campaign apontando para a campanha B seria somado nas duas,
      // inflando a receita total do relatório.
      const utmMatchers: { utmCampaign: string }[] = [];
      if (m.campaignName) utmMatchers.push({ utmCampaign: m.campaignName });
      if (m.campaignId) utmMatchers.push({ utmCampaign: m.campaignId });

      const attributionFilters: object[] = [];
      if (m.campaignId) {
        attributionFilters.push({ gadCampaignId: m.campaignId });
      }
      if (utmMatchers.length > 0) {
        attributionFilters.push({
          AND: [{ gadCampaignId: null }, { OR: utmMatchers }],
        });
      }

      const orders = attributionFilters.length
        ? await prisma.order.findMany({
            where: {
              status: "paid",
              createdAt: { gte: dateStart, lte: dayEnd },
              OR: attributionFilters,
            },
            select: { amount: true },
          })
        : [];

      const purchases = orders.length;
      const revenue = orders.reduce((sum, o) => sum + o.amount, 0) / 100;
      const cost = m.cost;
      const roas = cost > 0 ? revenue / cost : 0;
      const cpa = purchases > 0 ? cost / purchases : 0;
      const cpc = m.clicks > 0 ? cost / m.clicks : 0;
      const cpm = m.impressions > 0 ? (cost / m.impressions) * 1000 : 0;
      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;

      await prisma.googleAdsCampaignData.create({
        data: {
          campaignId: m.campaignId,
          campaignName: m.campaignName,
          dateStart,
          dateEnd,
          impressions: m.impressions,
          clicks: m.clicks,
          cost,
          cpc,
          cpm,
          ctr,
          googleConversions: m.conversions,
          googleConversionsValue: m.conversionsValue,
          purchases,
          revenue,
          roas,
          cpa,
        },
      });
      insertCount++;
    }

    const duration = Date.now() - startMs;

    await prisma.googleAdsConfig.update({
      where: { id: config.id },
      data: { lastSyncAt: new Date() },
    });

    await prisma.googleAdsSyncLog.create({
      data: {
        configId: config.id,
        status: "success",
        campaigns: insertCount,
        dateRange: `${dateFrom} - ${dateTo}`,
        duration,
      },
    });

    console.log(`[GOOGLE_ADS_SYNC_SUCCESS] ${insertCount} registros em ${duration}ms`);
    return NextResponse.json({ success: true, campaigns: insertCount, duration });
  } catch (error) {
    const duration = Date.now() - startMs;
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[GOOGLE_ADS_SYNC_ERROR]", msg);

    if (configId) {
      await prisma.googleAdsSyncLog
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
