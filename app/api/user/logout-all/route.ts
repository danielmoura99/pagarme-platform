import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Deletar todas as sessões do usuário
    await prisma.userSession.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Todas as sessões foram encerradas com sucesso"
    });
  } catch (error) {
    console.error("Erro ao encerrar sessões:", error);
    return NextResponse.json(
      { error: "Erro ao encerrar sessões" },
      { status: 500 }
    );
  }
}
