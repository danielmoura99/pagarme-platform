// app/api/transactions/[transactionId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    // Aguardar a resolução dos parâmetros
    const resolvedParams = await params;
    const transactionId = resolvedParams.transactionId;

    // Buscar o pedido com todas as informações relevantes
    const order = await prisma.order.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        affiliate: {
          include: {
            user: true,
          },
        },
        coupon: true,
      },
    });

    if (!order) {
      return new NextResponse("Transação não encontrada", { status: 404 });
    }

    // Formatar os dados para o frontend
    const formattedOrder = {
      id: order.id,
      orderId: `#${order.id.substring(0, 8)}`,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        email: order.customer.email,
        document: order.customer.document,
        phone: order.customer.phone || undefined,
      },
      product: order.items[0]?.product
        ? {
            id: order.items[0].product.id,
            name: order.items[0].product.name,
            description: order.items[0].product.description,
            price: order.items[0].price,
          }
        : {
            id: "unknown",
            name: "Produto não encontrado",
            price: 0,
          },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
      })),
      paymentMethod: order.paymentMethod as "credit_card" | "pix",
      status: order.status as "pending" | "paid" | "failed" | "refunded",
      amount: order.amount,
      installments: order.installments,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      pagarmeTransactionId: order.pagarmeTransactionId || undefined,

      // Informações opcionais
      affiliate: order.affiliate
        ? {
            id: order.affiliate.id,
            name: order.affiliate.user.name || "Afiliado",
            email: order.affiliate.user.email,
            commission: order.affiliate.commission,
            amount: order.splitAmount || 0,
          }
        : undefined,

      coupon: order.coupon
        ? {
            id: order.coupon.id,
            code: order.coupon.code,
            discountPercentage: order.coupon.discountPercentage,
          }
        : undefined,
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error("[TRANSACTION_DETAIL_ERROR]", error);
    return new NextResponse("Erro ao buscar detalhes da transação", {
      status: 500,
    });
  }
}
