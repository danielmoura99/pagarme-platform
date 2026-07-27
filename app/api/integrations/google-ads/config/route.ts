// app/api/integrations/google-ads/config/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { validateGoogleAdsCredentials } from "@/lib/tracking/google-ads-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const config = await prisma.googleAdsConfig.findFirst();

    if (!config) {
      return NextResponse.json({
        connected: false,
        enabled: false,
        customerId: null,
        loginCustomerId: null,
        conversionActionId: null,
        hasDeveloperToken: false,
        hasClientSecret: false,
        hasRefreshToken: false,
        lastUploadAt: null,
      });
    }

    // Segredos nunca voltam ao navegador — só indicamos se existem.
    return NextResponse.json({
      connected: Boolean(
        config.developerToken &&
          config.clientId &&
          config.clientSecret &&
          config.refreshToken &&
          config.customerId &&
          config.conversionActionId
      ),
      enabled: config.enabled,
      customerId: config.customerId,
      loginCustomerId: config.loginCustomerId,
      conversionActionId: config.conversionActionId,
      clientId: config.clientId,
      hasDeveloperToken: !!config.developerToken,
      hasClientSecret: !!config.clientSecret,
      hasRefreshToken: !!config.refreshToken,
      lastUploadAt: config.lastUploadAt,
      lastSyncAt: config.lastSyncAt,
    });
  } catch (error) {
    console.error("[GOOGLE_ADS_CONFIG_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar configuração" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      developerToken,
      clientId,
      clientSecret,
      refreshToken,
      customerId,
      loginCustomerId,
      conversionActionId,
      enabled,
    } = body;

    const existing = await prisma.googleAdsConfig.findFirst();

    // Segredos só são sobrescritos quando vem valor novo (em branco mantém).
    const data: Record<string, string | boolean | null> = {};
    if (developerToken) data.developerToken = developerToken.trim();
    if (clientId) data.clientId = clientId.trim();
    if (clientSecret) data.clientSecret = clientSecret.trim();
    if (refreshToken) data.refreshToken = refreshToken.trim();
    if (customerId !== undefined) {
      data.customerId = customerId ? customerId.replace(/\D/g, "") : null;
    }
    if (loginCustomerId !== undefined) {
      data.loginCustomerId = loginCustomerId
        ? loginCustomerId.replace(/\D/g, "")
        : null;
    }
    if (conversionActionId !== undefined) {
      data.conversionActionId = conversionActionId
        ? conversionActionId.replace(/\D/g, "")
        : null;
    }
    if (enabled !== undefined) data.enabled = enabled;

    const saved = existing
      ? await prisma.googleAdsConfig.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.googleAdsConfig.create({ data });

    // Se temos o conjunto completo de credenciais, valida contra a API real
    let validation: { valid: boolean; error?: string } | null = null;
    if (
      saved.developerToken &&
      saved.clientId &&
      saved.clientSecret &&
      saved.refreshToken &&
      saved.customerId
    ) {
      validation = await validateGoogleAdsCredentials({
        developerToken: saved.developerToken,
        clientId: saved.clientId,
        clientSecret: saved.clientSecret,
        refreshToken: saved.refreshToken,
        customerId: saved.customerId,
        loginCustomerId: saved.loginCustomerId,
      });
    }

    return NextResponse.json({
      success: true,
      validation,
    });
  } catch (error) {
    console.error("[GOOGLE_ADS_CONFIG_POST_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao salvar configuração" },
      { status: 500 }
    );
  }
}
