// app/api/recipients/[recipientId]/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

async function resetPassword(recipientId: string) {
  // Verificar autenticação
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Unauthorized - Admin only" },
      { status: 403 }
    );
  }

  // Buscar afiliado
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: recipientId },
    include: {
      user: true,
    },
  });

  if (!affiliate) {
    return NextResponse.json(
      { error: "Afiliado não encontrado" },
      { status: 404 }
    );
  }

  // Senha padrão
  const defaultPassword = "Senha@123";
  const hashedPassword = await hash(defaultPassword, 10);

  // Atualizar senha do usuário e updatedAt (para invalidar sessões antigas)
  await prisma.user.update({
    where: { id: affiliate.userId },
    data: {
      password: hashedPassword,
      updatedAt: new Date(), // Força atualização do timestamp
    },
  });

  return NextResponse.json({
    success: true,
    message: "Senha resetada com sucesso para 'Senha@123'",
    affiliateName: affiliate.user.name,
    affiliateEmail: affiliate.user.email,
  });
}

export async function POST(
  req: Request,
  { params }: { params: { recipientId: string } }
) {
  try {
    return await resetPassword(params.recipientId);
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao resetar senha" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: { recipientId: string } }
) {
  try {
    return await resetPassword(params.recipientId);
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao resetar senha" },
      { status: 500 }
    );
  }
}
