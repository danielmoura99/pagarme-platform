/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // Extrair informações de falha da resposta da Pagar.me se existir
    let failureDetails = null;
    if (order.status === "failed" && order.pagarmeResponse) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pagarmeData = order.pagarmeResponse as any;

        // Tentar extrair detalhes mais específicos da falha
        if (pagarmeData.charges && pagarmeData.charges[0]) {
          const charge = pagarmeData.charges[0];
          const transaction = charge.last_transaction;

          if (transaction) {
            failureDetails = {
              method: transaction.transaction_type || order.paymentMethod,
              code: order.failureCode || transaction.gateway_response?.code,
              message: order.failureReason,

              // ✅ DETALHES DO GATEWAY_RESPONSE
              gatewayCode: transaction.gateway_response?.code,
              gatewayErrors:
                transaction.gateway_response?.errors?.map(
                  (error: any) => error.message
                ) || [],

              // Detalhes específicos do acquirer (emissor)
              acquirerCode: transaction.acquirer_return_code,
              acquirerMessage: transaction.acquirer_message,
              responseCode: transaction.response_code,

              // Para cartão de crédito
              ...(transaction.card && {
                cardLastDigits: transaction.card.last_four_digits,
                cardFlag: transaction.card.brand,
                cardFirstDigits: transaction.card.first_six_digits,
              }),

              // Para PIX
              ...(transaction.pix_qr_code && {
                pixExpiration: transaction.expires_at,
              }),

              // ✅ INFORMAÇÕES TÉCNICAS ADICIONAIS
              installments: transaction.installments,
              operationType: transaction.operation_type,
              success: transaction.success,
            };
          }
        }
      } catch (error) {
        console.error("Erro ao extrair detalhes da falha:", error);
      }
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
      failureReason: order.failureReason || undefined,
      failureCode: order.failureCode || undefined,
      attempts: order.attempts || 1,
      lastAttemptAt: order.lastAttemptAt?.toISOString() || undefined,
      failureDetails, // Detalhes extraídos da resposta da Pagar.me

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
