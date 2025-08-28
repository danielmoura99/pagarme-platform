// app/api/integrations/rd-station/test/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config || !config.accessToken) {
      return NextResponse.json(
        { error: "RD Station não está configurado ou conectado" },
        { status: 400 }
      );
    }

    // Verificar se o token não expirou
    if (config.tokenExpiresAt && config.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token de acesso expirado. Reconecte o RD Station" },
        { status: 401 }
      );
    }

    // Fazer uma requisição de teste para a API do RD Station v2
    const testResponse = await fetch('https://api.rd.services/platform/account_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!testResponse.ok) {
      const errorData = await testResponse.text();
      console.error("[RD_STATION_TEST_ERROR]", {
        status: testResponse.status,
        statusText: testResponse.statusText,
        error: errorData
      });

      // Se token inválido, tentar refresh
      if (testResponse.status === 401 && config.refreshToken) {
        const refreshed = await refreshAccessToken(config);
        if (refreshed) {
          return NextResponse.json({
            success: true,
            message: "Conexão testada com sucesso (token renovado)",
            account: refreshed.accountInfo
          });
        }
      }

      return NextResponse.json(
        { error: `Erro ao testar conexão: ${testResponse.status} ${testResponse.statusText}` },
        { status: testResponse.status }
      );
    }

    const accountInfo = await testResponse.json();

    return NextResponse.json({
      success: true,
      message: "Conexão testada com sucesso",
      account: {
        name: accountInfo.name,
        email: accountInfo.email,
        plan: accountInfo.plan_type,
        timezone: accountInfo.timezone
      }
    });

  } catch (error) {
    console.error("[RD_STATION_TEST_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno ao testar conexão" },
      { status: 500 }
    );
  }
}

// Função auxiliar para renovar token de acesso
async function refreshAccessToken(config: any) {
  try {
    const refreshResponse = await fetch('https://api.rd.services/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!refreshResponse.ok) {
      console.error("[RD_STATION_REFRESH_ERROR]", await refreshResponse.text());
      return null;
    }

    const tokenData = await refreshResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Atualizar tokens no banco
    await prisma.rDStationConfig.update({
      where: { id: config.id },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        updatedAt: new Date()
      }
    });

    // Testar novamente com novo token
    const testResponse = await fetch('https://api.rd.services/platform/account_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (testResponse.ok) {
      const accountInfo = await testResponse.json();
      return { accountInfo };
    }

    return null;
  } catch (error) {
    console.error("[RD_STATION_REFRESH_TOKEN_ERROR]", error);
    return null;
  }
}