// app/api/user/change-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash, compare } from "bcrypt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export async function POST(req: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validações básicas
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "As novas senhas não coincidem" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar senha atual
    const isPasswordValid = await compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 }
      );
    }

    // Hash da nova senha
    const hashedPassword = await hash(newPassword, 10);

    // Atualizar senha e updatedAt (para invalidar sessões antigas)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(), // Força atualização do timestamp
      },
    });

    return NextResponse.json({
      success: true,
      message: "Senha alterada com sucesso!",
    });
  } catch (error) {
    console.error("[CHANGE_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao alterar senha" },
      { status: 500 }
    );
  }
}
