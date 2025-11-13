// app/api/user/affiliate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function GET() {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    // Buscar afiliado do usuário
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        commission: true,
        active: true,
        recipientId: true,
      },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: "Afiliado não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      affiliateId: affiliate.id,
      commission: affiliate.commission,
      active: affiliate.active,
      recipientId: affiliate.recipientId,
    });
  } catch (error) {
    console.error("[USER_AFFILIATE_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar informações do afiliado" },
      { status: 500 }
    );
  }
}
