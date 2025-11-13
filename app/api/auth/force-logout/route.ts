// app/api/auth/force-logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = cookies();

    // Limpar todos os cookies de sessão do NextAuth
    const cookieNames = [
      "next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
      "__Secure-next-auth.session-token",
      "__Secure-next-auth.csrf-token",
      "__Secure-next-auth.callback-url",
    ];

    cookieNames.forEach((name) => {
      cookieStore.delete(name);
    });

    // Redirecionar para login
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  } catch (error) {
    console.error("[FORCE_LOGOUT_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao forçar logout" },
      { status: 500 }
    );
  }
}
