import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar todas as sessões ativas do usuário
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: session.user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastActiveAt: "desc",
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Erro ao buscar sessões:", error);
    return NextResponse.json(
      { error: "Erro ao buscar sessões" },
      { status: 500 }
    );
  }
}
