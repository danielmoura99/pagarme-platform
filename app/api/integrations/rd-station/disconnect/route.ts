// app/api/integrations/rd-station/disconnect/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config) {
      return NextResponse.json(
        { error: "Configuração RD Station não encontrada" },
        { status: 404 }
      );
    }

    // Tentar revogar o token no RD Station (opcional)
    if (config.accessToken) {
      try {
        await fetch('https://api.rd.services/auth/revoke', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        // Ignorar erros de revogação - vamos limpar os dados locais mesmo assim
        console.warn("[RD_STATION_REVOKE_WARNING]", error);
      }
    }

    // Limpar tokens e desabilitar integração
    await prisma.rDStationConfig.update({
      where: { id: config.id },
      data: {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        enabled: false,
        updatedAt: new Date()
      }
    });

    // Criar log de desconexão
    await prisma.rDStationSyncLog.create({
      data: {
        configId: config.id,
        eventType: "disconnect",
        rdEventType: "system_disconnect",
        status: "success",
        leadData: {
          action: "disconnect",
          timestamp: new Date().toISOString()
        },
        processedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: "RD Station desconectado com sucesso"
    });

  } catch (error) {
    console.error("[RD_STATION_DISCONNECT_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao desconectar RD Station" },
      { status: 500 }
    );
  }
}