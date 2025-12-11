// app/api/transactions/[transactionId]/refund/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Apenas admins podem processar reembolsos
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Aguardar a resolução dos parâmetros
    const resolvedParams = await params;
    const transactionId = resolvedParams.transactionId;

    // Buscar a transação
    const order = await prisma.order.findUnique({
      where: { id: transactionId },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Transação não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se a transação está no status "paid"
    if (order.status !== "paid") {
      return NextResponse.json(
        {
          error: `Não é possível reembolsar uma transação com status "${order.status}". Apenas transações pagas podem ser reembolsadas.`,
        },
        { status: 400 }
      );
    }

    // Atualizar o status para "refunded"
    const updatedOrder = await prisma.order.update({
      where: { id: transactionId },
      data: {
        status: "refunded",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reembolso processado com sucesso",
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updatedAt: updatedOrder.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[REFUND_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao processar reembolso" },
      { status: 500 }
    );
  }
}
