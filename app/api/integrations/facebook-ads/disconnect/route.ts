// app/api/integrations/facebook-ads/disconnect/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const config = await prisma.facebookAdsConfig.findFirst();
    if (!config) {
      return NextResponse.json({ success: true });
    }

    await prisma.facebookAdsConfig.update({
      where: { id: config.id },
      data: {
        accessToken: null,
        tokenExpiresAt: null,
        adAccountId: null,
        adAccountName: null,
        enabled: false,
        lastSyncAt: null,
      },
    });

    console.log("[FB_ADS_DISCONNECT] Conta desconectada.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FB_ADS_DISCONNECT_ERROR]", error);
    return NextResponse.json({ error: "Erro ao desconectar" }, { status: 500 });
  }
}
