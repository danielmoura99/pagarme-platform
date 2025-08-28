// app/api/integrations/rd-station/simple-auth/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, enabled = true } = body;

    if (!apiKey || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "API Key é obrigatória" },
        { status: 400 }
      );
    }

    // Testar API Key fazendo uma requisição simples
    const testResponse = await fetch('https://api.rd.services/platform/conversions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        event_type: 'CONVERSION',
        event_family: 'CDP',
        payload: {
          email: 'test@exemplo.com',
          conversion_identifier: 'Teste de Conexão'
        }
      })
    });

    if (!testResponse.ok && testResponse.status !== 422) {
      // 422 é esperado para email de teste, significa que a API Key está válida
      return NextResponse.json(
        { error: "API Key inválida ou sem permissões" },
        { status: 400 }
      );
    }

    // Buscar ou criar configuração
    let config = await prisma.rDStationConfig.findFirst();

    const updateData = {
      enabled,
      // Armazenar API Key no campo clientSecret (reutilizando campo)
      clientSecret: apiKey,
      // Marcar como modo API Key
      clientId: 'API_KEY_MODE',
      // Configurações padrão para API Key (apenas eventos de conversão)
      syncEvents: ['Purchase', 'InitiateCheckout'],
      leadMapping: {
        email: true,
        name: true,
        phone: true
      },
      autoSync: true,
      syncInterval: 300,
      batchSize: 50
    };

    if (config) {
      config = await prisma.rDStationConfig.update({
        where: { id: config.id },
        data: updateData
      });
    } else {
      config = await prisma.rDStationConfig.create({
        data: updateData
      });
    }

    // Criar log de configuração
    await prisma.rDStationSyncLog.create({
      data: {
        configId: config.id,
        eventType: 'api_key_config',
        rdEventType: 'system_config',
        status: 'success',
        leadData: {
          mode: 'api_key',
          configured_at: new Date().toISOString()
        },
        processedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: "API Key configurada com sucesso",
      mode: 'api_key',
      limitations: [
        'Apenas envio de eventos de conversão',
        'Não é possível importar leads',
        'Funcionalidades limitadas comparado ao OAuth'
      ]
    });

  } catch (error) {
    console.error("[RD_STATION_SIMPLE_AUTH_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao configurar API Key" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config) {
      return NextResponse.json({
        configured: false,
        mode: null
      });
    }

    const isApiKeyMode = config.clientId === 'API_KEY_MODE';
    const isOAuthMode = config.clientId && config.clientId !== 'API_KEY_MODE' && config.accessToken;

    return NextResponse.json({
      configured: isApiKeyMode || isOAuthMode,
      mode: isApiKeyMode ? 'api_key' : isOAuthMode ? 'oauth' : null,
      enabled: config.enabled,
      hasApiKey: isApiKeyMode && !!config.clientSecret,
      hasOAuthTokens: isOAuthMode
    });

  } catch (error) {
    console.error("[RD_STATION_SIMPLE_AUTH_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao verificar configuração" },
      { status: 500 }
    );
  }
}