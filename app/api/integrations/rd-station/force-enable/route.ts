// app/api/integrations/rd-station/force-enable/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Buscar e atualizar configuração
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config) {
      return NextResponse.json(
        { error: "Configuração não encontrada" },
        { status: 404 }
      );
    }

    // Forçar enabled: true se tem tokens
    if (config.accessToken) {
      await prisma.rDStationConfig.update({
        where: { id: config.id },
        data: {
          enabled: true,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: "RD Station habilitado com sucesso",
        hasTokens: true
      });
    } else {
      return NextResponse.json(
        { error: "Tokens não encontrados" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("[RD_STATION_FORCE_ENABLE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao habilitar RD Station" },
      { status: 500 }
    );
  }
}