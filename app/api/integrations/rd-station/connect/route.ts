// app/api/integrations/rd-station/connect/route.ts
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    // Buscar client_id do banco (salvo pelo usuário na configuração)
    const config = await prisma.rDStationConfig.findFirst();
    if (!config?.clientId) {
      return NextResponse.json(
        { error: "Client ID não configurado. Salve as configurações primeiro." },
        { status: 400 }
      );
    }

    const state = randomBytes(32).toString("hex");
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/rd-station/callback`;

    const authUrl = new URL("https://api.rd.services/auth/dialog");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.json({ url: authUrl.toString(), state });

    // Armazenar state em cookie httpOnly para validação no callback
    response.cookies.set("rd_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutos
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[RD_STATION_CONNECT_ERROR]", error);
    return NextResponse.json({ error: "Erro ao gerar URL de autorização" }, { status: 500 });
  }
}
