// app/api/integrations/rd-station/debug/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config) {
      return NextResponse.json({
        found: false,
        message: "Nenhuma configuração encontrada"
      });
    }

    // Não expor dados sensíveis, apenas status
    return NextResponse.json({
      found: true,
      id: config.id,
      enabled: config.enabled,
      hasClientId: !!config.clientId,
      hasClientSecret: !!config.clientSecret,
      hasAccessToken: !!config.accessToken,
      hasRefreshToken: !!config.refreshToken,
      tokenExpiresAt: config.tokenExpiresAt,
      isTokenExpired: config.tokenExpiresAt ? config.tokenExpiresAt < new Date() : null,
      lastSyncAt: config.lastSyncAt,
      totalSynced: config.totalSynced,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    });

  } catch (error) {
    console.error("[RD_STATION_DEBUG_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar configuração" },
      { status: 500 }
    );
  }
}