// app/api/recipients/[recipientId]/reset-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hash } from "bcrypt";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

// Gerar senha aleatória segura (12 chars: letras, números, símbolo)
function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const symbols = "@#$!";
  let password = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 10; i++) {
    password += chars[bytes[i] % chars.length];
  }
  // Adicionar um símbolo e um número garantidos
  password += symbols[bytes[10] % symbols.length];
  password += String(bytes[11] % 10);
  return password;
}

export async function POST(
  req: Request,
  { params }: { params: { recipientId: string } }
) {
  try {
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
      where: { id: params.recipientId },
      include: { user: true },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: "Afiliado não encontrado" },
        { status: 404 }
      );
    }

    // Gerar senha aleatória segura
    const newPassword = generateSecurePassword();
    const hashedPassword = await hash(newPassword, 12);

    // Atualizar senha e invalidar sessões antigas
    await prisma.user.update({
      where: { id: affiliate.userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log("[RESET_PASSWORD] Senha resetada para afiliado:", affiliate.id);

    return NextResponse.json({
      success: true,
      message: "Senha resetada com sucesso",
      newPassword, // Retornada uma única vez para o admin copiar
      affiliateName: affiliate.user.name,
      affiliateEmail: affiliate.user.email,
    });
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao resetar senha" },
      { status: 500 }
    );
  }
}

// GET não deve resetar senhas — retornar 405
export async function GET() {
  return new NextResponse("Método não permitido", { status: 405 });
}
