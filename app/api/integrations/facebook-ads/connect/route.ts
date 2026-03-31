// app/api/integrations/facebook-ads/connect/route.ts
import { NextResponse } from "next/server";
import { getOAuthUrl } from "@/lib/facebook-ads";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    // CSRF state token
    const state = randomBytes(32).toString("hex");
    const url = getOAuthUrl(state);

    const response = NextResponse.json({ url, state });

    // Armazenar state em cookie httpOnly para validação no callback
    response.cookies.set("fb_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutos
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[FB_ADS_CONNECT_ERROR]", error);
    return NextResponse.json({ error: "Erro ao gerar URL de autorização" }, { status: 500 });
  }
}
