// app/api/integrations/rd-station/config/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Buscar configuração RD Station (sempre haverá apenas uma)
    let config = await prisma.rDStationConfig.findFirst();
    
    // Se não existe, criar uma configuração padrão
    if (!config) {
      config = await prisma.rDStationConfig.create({
        data: {
          enabled: false,
          syncEvents: ["pageView", "viewContent", "initiateCheckout", "addPaymentInfo", "purchase"],
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
    }

    // Não retornar dados sensíveis
    const { clientSecret, accessToken, refreshToken, ...safeConfig } = config;
    
    return NextResponse.json({
      ...safeConfig,
      hasCredentials: !!(config.clientId && config.clientSecret),
      isConnected: !!config.accessToken
    });

  } catch (error) {
    console.error("[RD_STATION_CONFIG_GET]", error);
    return NextResponse.json(
      { error: "Erro ao carregar configuração RD Station" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      enabled,
      clientId,
      clientSecret,
      syncEvents,
      leadMapping,
      autoSync,
      syncInterval,
      batchSize
    } = body;

    // Validações básicas
    if (syncInterval && (syncInterval < 60 || syncInterval > 3600)) {
      return NextResponse.json(
        { error: "Intervalo de sincronização deve estar entre 60 e 3600 segundos" },
        { status: 400 }
      );
    }

    if (batchSize && (batchSize < 1 || batchSize > 100)) {
      return NextResponse.json(
        { error: "Tamanho do lote deve estar entre 1 e 100" },
        { status: 400 }
      );
    }

    // Buscar configuração existente
    let config = await prisma.rDStationConfig.findFirst();

    const updateData = {
      enabled: enabled ?? false,
      syncEvents: syncEvents || ["pageView", "viewContent", "initiateCheckout", "addPaymentInfo", "purchase"],
      leadMapping: leadMapping || {},
      autoSync: autoSync ?? true,
      syncInterval: syncInterval || 300,
      batchSize: batchSize || 50,
      ...(clientId && { clientId }),
      ...(clientSecret && { clientSecret })
    };

    if (config) {
      // Atualizar configuração existente
      config = await prisma.rDStationConfig.update({
        where: { id: config.id },
        data: updateData
      });
    } else {
      // Criar nova configuração
      config = await prisma.rDStationConfig.create({
        data: updateData
      });
    }

    // Não retornar dados sensíveis
    const { clientSecret: _, accessToken, refreshToken, ...safeConfig } = config;

    return NextResponse.json({
      ...safeConfig,
      hasCredentials: !!(config.clientId && config.clientSecret),
      isConnected: !!config.accessToken
    });

  } catch (error) {
    console.error("[RD_STATION_CONFIG_POST]", error);
    return NextResponse.json(
      { error: "Erro ao salvar configuração RD Station" },
      { status: 500 }
    );
  }
}