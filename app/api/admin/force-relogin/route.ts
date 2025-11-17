import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { prisma } from "@/lib/db";

// Rota para admin forçar todos os usuários a fazerem login novamente
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Apenas admins podem executar esta ação
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Deletar todas as sessões existentes
    const result = await prisma.userSession.deleteMany({});

    // Atualizar o updatedAt de todos os usuários para invalidar tokens JWT antigos
    await prisma.user.updateMany({
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} sessões foram deletadas. Todos os usuários precisarão fazer login novamente.`,
      sessionsDeleted: result.count,
    });
  } catch (error) {
    console.error("Erro ao forçar relogin:", error);
    return NextResponse.json(
      { error: "Erro ao forçar relogin" },
      { status: 500 }
    );
  }
}
