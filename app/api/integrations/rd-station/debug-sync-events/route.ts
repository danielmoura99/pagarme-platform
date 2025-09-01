// app/api/integrations/rd-station/debug-sync-events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config) {
      return NextResponse.json({
        error: "Nenhuma configuração RD Station encontrada",
        hasConfig: false
      });
    }

    // Debug completo da configuração
    const debugInfo = {
      hasConfig: true,
      configId: config.id,
      enabled: config.enabled,
      syncEvents: config.syncEvents,
      syncEventsType: typeof config.syncEvents,
      syncEventsIsArray: Array.isArray(config.syncEvents),
      syncEventsLength: Array.isArray(config.syncEvents) ? config.syncEvents.length : 'N/A',
      rawSyncEvents: JSON.stringify(config.syncEvents),
      leadMapping: config.leadMapping,
      autoSync: config.autoSync,
      lastSyncAt: config.lastSyncAt,
      totalSynced: config.totalSynced,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt
    };

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      recommendation: config.syncEvents && Array.isArray(config.syncEvents) && config.syncEvents.length === 0 
        ? "syncEvents está vazio - precisa ser configurado com eventos padrão"
        : "syncEvents parece estar configurado corretamente"
    });

  } catch (error) {
    console.error("[RD_STATION_DEBUG_SYNC_EVENTS]", error);
    return NextResponse.json(
      { 
        error: "Erro ao buscar configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}

// POST para corrigir syncEvents se necessário
export async function POST() {
  try {
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config) {
      // Criar nova configuração se não existir
      const newConfig = await prisma.rDStationConfig.create({
        data: {
          enabled: false,
          syncEvents: ["purchase", "initiateCheckout", "addPaymentInfo", "viewContent", "pageView"],
          leadMapping: {
            email: true,
            name: true,
            phone: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
            utmTerm: true,
            utmContent: true
          },
          autoSync: true,
          syncInterval: 300,
          batchSize: 50
        }
      });

      return NextResponse.json({
        success: true,
        message: "Nova configuração criada com syncEvents padrão",
        configId: newConfig.id,
        syncEvents: newConfig.syncEvents
      });
    }

    // Verificar se syncEvents está vazio ou inválido
    const needsUpdate = !config.syncEvents || 
                       !Array.isArray(config.syncEvents) || 
                       config.syncEvents.length === 0;

    if (needsUpdate) {
      const updatedConfig = await prisma.rDStationConfig.update({
        where: { id: config.id },
        data: {
          syncEvents: ["purchase", "initiateCheckout", "addPaymentInfo", "viewContent", "pageView"],
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: "syncEvents corrigido com valores padrão",
        configId: updatedConfig.id,
        oldSyncEvents: config.syncEvents,
        newSyncEvents: updatedConfig.syncEvents
      });
    }

    return NextResponse.json({
      success: true,
      message: "syncEvents já está configurado corretamente",
      configId: config.id,
      syncEvents: config.syncEvents
    });

  } catch (error) {
    console.error("[RD_STATION_FIX_SYNC_EVENTS]", error);
    return NextResponse.json(
      { 
        error: "Erro ao corrigir configuração",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}