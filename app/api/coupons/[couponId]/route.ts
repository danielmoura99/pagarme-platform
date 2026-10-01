import { withDbMonitoring } from "@/lib/monitoring/route";
// app/api/coupons/[couponId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

async function monitoredDELETE(
  req: Request,
  { params }: { params: { couponId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar se o cupom está sendo usado em algum pedido
    const ordersUsingCoupon = await prisma.order.findFirst({
      where: {
        couponId: params.couponId,
      },
    });

    if (ordersUsingCoupon) {
      // Se estiver em uso, apenas inative
      await prisma.coupon.update({
        where: {
          id: params.couponId,
        },
        data: {
          active: false,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          "Cupom inativado com sucesso, pois já foi utilizado em pedidos.",
      });
    }

    // Se não estiver em uso, podemos excluir
    await prisma.coupon.delete({
      where: {
        id: params.couponId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[COUPON_DELETE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao processar cupom",
      },
      { status: 500 }
    );
  }
}

export const DELETE = withDbMonitoring("DELETE /api/coupons/[couponId]", monitoredDELETE);
