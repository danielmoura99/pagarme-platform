// app/api/orders/[orderId]/status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Aguardar a resolução dos parâmetros
    const resolvedParams = await params;
    const orderId = resolvedParams.orderId;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        amount: true,
        createdAt: true,
      },
    });

    if (!order) {
      return new NextResponse("Order not found", { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("[ORDER_STATUS_ERROR]", error);
    return new NextResponse("Error fetching order status", { status: 500 });
  }
}
