// app/api/integrations/facebook-ads/config/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { tokenIsExpired } from "@/lib/facebook-ads";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.facebookAdsConfig.findFirst();

    if (!config) {
      return NextResponse.json({
        connected: false,
        enabled: false,
        adAccountId: null,
        adAccountName: null,
        lastSyncAt: null,
        tokenExpiresAt: null,
        tokenExpired: false,
      });
    }

    return NextResponse.json({
      connected: !!config.accessToken,
      enabled: config.enabled,
      adAccountId: config.adAccountId,
      adAccountName: config.adAccountName,
      lastSyncAt: config.lastSyncAt,
      tokenExpiresAt: config.tokenExpiresAt,
      tokenExpired: tokenIsExpired(config.tokenExpiresAt),
      autoSync: config.autoSync,
      syncInterval: config.syncInterval,
    });
  } catch (error) {
    console.error("[FB_ADS_CONFIG_GET_ERROR]", error);
    return NextResponse.json({ error: "Erro ao buscar configuração" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adAccountId, adAccountName, autoSync, syncInterval } = body;

    const existing = await prisma.facebookAdsConfig.findFirst();
    if (!existing) {
      return NextResponse.json({ error: "Nenhuma configuração encontrada. Conecte primeiro." }, { status: 400 });
    }

    const updated = await prisma.facebookAdsConfig.update({
      where: { id: existing.id },
      data: {
        ...(adAccountId !== undefined && { adAccountId }),
        ...(adAccountName !== undefined && { adAccountName }),
        ...(autoSync !== undefined && { autoSync }),
        ...(syncInterval !== undefined && { syncInterval }),
      },
    });

    return NextResponse.json({ success: true, adAccountId: updated.adAccountId });
  } catch (error) {
    console.error("[FB_ADS_CONFIG_POST_ERROR]", error);
    return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
  }
}
