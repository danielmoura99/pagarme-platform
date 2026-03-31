// app/api/integrations/facebook-ads/callback/route.ts
import { NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/facebook-ads";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Validar state (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get("fb_oauth_state")?.value;
    if (!state || !storedState || state !== storedState) {
      console.warn("[FB_ADS_CALLBACK_INVALID_STATE]");
      return NextResponse.redirect(
        new URL("/integrations/facebook-ads?error=invalid_state", request.url)
      );
    }

    if (error) {
      console.error("[FB_ADS_CALLBACK_DENIED]", error);
      return NextResponse.redirect(
        new URL("/dashboard/integrations/facebook-ads?error=access_denied", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/integrations/facebook-ads?error=no_code", request.url)
      );
    }

    console.log("[FB_ADS_CALLBACK_START] Trocando code por token...");
    const { accessToken, expiresAt } = await exchangeCodeForToken(code);

    // Upsert na config (garante que há apenas 1 registro)
    const existing = await prisma.facebookAdsConfig.findFirst();
    if (existing) {
      await prisma.facebookAdsConfig.update({
        where: { id: existing.id },
        data: {
          accessToken,
          tokenExpiresAt: expiresAt,
          enabled: true,
        },
      });
    } else {
      await prisma.facebookAdsConfig.create({
        data: {
          accessToken,
          tokenExpiresAt: expiresAt,
          enabled: true,
        },
      });
    }

    console.log("[FB_ADS_CALLBACK_SUCCESS] Token salvo, expira em:", expiresAt);
    return NextResponse.redirect(
      new URL("/dashboard/integrations/facebook-ads?connected=true", request.url)
    );
  } catch (error) {
    console.error("[FB_ADS_CALLBACK_ERROR]", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations/facebook-ads?error=${encodeURIComponent(msg)}`,
        request.url
      )
    );
  }
}
