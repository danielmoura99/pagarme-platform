import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Apenas admins podem deslogar outros usuários
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const recipientId = params.recipientId;

    // Buscar o afiliado e seu usuário
    const affiliate = await prisma.affiliate.findUnique({
      where: { recipientId },
      include: { user: true },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: "Afiliado não encontrado" },
        { status: 404 }
      );
    }

    // Deletar todas as sessões do usuário afiliado
    await prisma.userSession.deleteMany({
      where: {
        userId: affiliate.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Todas as sessões de ${affiliate.user.name || affiliate.user.email} foram encerradas`
    });
  } catch (error) {
    console.error("Erro ao encerrar sessões:", error);
    return NextResponse.json(
      { error: "Erro ao encerrar sessões" },
      { status: 500 }
    );
  }
}
