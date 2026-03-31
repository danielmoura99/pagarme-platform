// app/api/integrations/facebook-ads/config/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateToken } from "@/lib/facebook-ads";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const config = await prisma.facebookAdsConfig.findFirst();

    if (!config) {
      return NextResponse.json({
        connected: false,
        enabled: false,
        adAccountId: null,
        adAccountName: null,
        lastSyncAt: null,
        tokenExpired: false,
      });
    }

    return NextResponse.json({
      connected: !!config.accessToken,
      enabled: config.enabled,
      adAccountId: config.adAccountId,
      adAccountName: config.adAccountName,
      lastSyncAt: config.lastSyncAt,
      tokenExpired: false,
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
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { accessToken, adAccountId, adAccountName, autoSync, syncInterval } = body;

    const existing = await prisma.facebookAdsConfig.findFirst();

    // Salvar System User Token — valida na API antes de salvar
    if (accessToken) {
      const validation = await validateToken(accessToken);
      if (!validation.valid) {
        console.warn("[FB_ADS_CONFIG] Token inválido:", validation.error);
        return NextResponse.json(
          { error: `Token inválido: ${validation.error}` },
          { status: 400 }
        );
      }

      console.log("[FB_ADS_CONFIG] Token válido para:", validation.name, `(${validation.id})`);

      if (existing) {
        await prisma.facebookAdsConfig.update({
          where: { id: existing.id },
          data: { accessToken, enabled: true, tokenExpiresAt: null },
        });
      } else {
        await prisma.facebookAdsConfig.create({
          data: { accessToken, enabled: true },
        });
      }

      return NextResponse.json({ success: true, user: validation.name });
    }

    // Atualizar outros campos (conta de anúncios, configurações de sync)
    if (!existing) {
      return NextResponse.json({ error: "Salve o token primeiro." }, { status: 400 });
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
