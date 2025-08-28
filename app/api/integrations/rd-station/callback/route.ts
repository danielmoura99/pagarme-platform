// app/api/integrations/rd-station/callback/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log("[RD_STATION_CALLBACK_START]", {
      code: code ? "RECEIVED" : "MISSING",
      state,
      error,
      url: request.url
    });

    // Se houve erro na autorização
    if (error) {
      console.error("[RD_STATION_OAUTH_ERROR]", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations/rd-station?error=oauth_error&message=${encodeURIComponent(error)}`
      );
    }

    // Se não recebeu o código de autorização
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations/rd-station?error=missing_code`
      );
    }

    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    console.log("[RD_STATION_CALLBACK_CONFIG]", {
      configFound: !!config,
      hasClientId: !!(config?.clientId),
      hasClientSecret: !!(config?.clientSecret)
    });
    
    if (!config || !config.clientId || !config.clientSecret) {
      console.error("[RD_STATION_CALLBACK_NO_CREDENTIALS]");
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations/rd-station?error=missing_credentials`
      );
    }

    // Trocar código por tokens de acesso (URL correta da API v2)
    const tokenResponse = await fetch('https://api.rd.services/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[RD_STATION_TOKEN_ERROR]", errorData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations/rd-station?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    
    console.log("[RD_STATION_CALLBACK_TOKENS]", {
      hasAccessToken: !!access_token,
      hasRefreshToken: !!refresh_token,
      expiresIn: expires_in
    });

    // Calcular data de expiração
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Salvar tokens na configuração
    await prisma.rDStationConfig.update({
      where: { id: config.id },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: expiresAt,
        enabled: true, // Habilitar automaticamente após conexão bem-sucedida
        updatedAt: new Date()
      }
    });

    console.log("[RD_STATION_CALLBACK_SUCCESS]", {
      tokensStored: true,
      redirectingTo: `${process.env.NEXTAUTH_URL}/integrations/rd-station?success=connected`
    });

    // Redirecionar de volta para a página de configuração com sucesso
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/integrations/rd-station?success=connected`
    );

  } catch (error) {
    console.error("[RD_STATION_CALLBACK_ERROR]", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/integrations/rd-station?error=callback_failed`
    );
  }
}