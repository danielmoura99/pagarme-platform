import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { prisma } from "@/lib/db";

// Rota para admin ver TODAS as sessões ativas de todos os usuários
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Apenas admins podem ver todas as sessões
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar todas as sessões ativas com informações do usuário
    const sessions = await prisma.userSession.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        lastActiveAt: "desc",
      },
    });

    return NextResponse.json({ sessions, total: sessions.length });
  } catch (error) {
    console.error("Erro ao buscar todas as sessões:", error);
    return NextResponse.json(
      { error: "Erro ao buscar sessões" },
      { status: 500 }
    );
  }
}
