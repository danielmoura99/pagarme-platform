// app/api/recipients/all/route.ts
import { NextResponse } from "next/server";
import { pagarme } from "@/lib/pagarme";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Busca todos os recebedores sem filtro de status
    const recipients = await pagarme.listRecipients({
      size: 200, // Aumenta o tamanho para ter certeza de pegar todos
    });

    return NextResponse.json(recipients);
  } catch (error) {
    console.error("Erro ao buscar recebedores:", error);
    return NextResponse.json(
      { error: "Falha ao buscar recebedores" },
      { status: 500 }
    );
  }
}
