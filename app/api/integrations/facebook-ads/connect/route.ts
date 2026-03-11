// app/api/integrations/facebook-ads/connect/route.ts
import { NextResponse } from "next/server";
import { getOAuthUrl } from "@/lib/facebook-ads";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // CSRF state token
    const state = randomBytes(16).toString("hex");
    const url = getOAuthUrl(state);

    return NextResponse.json({ url, state });
  } catch (error) {
    console.error("[FB_ADS_CONNECT_ERROR]", error);
    return NextResponse.json({ error: "Erro ao gerar URL de autorização" }, { status: 500 });
  }
}
