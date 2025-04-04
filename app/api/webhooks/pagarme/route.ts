/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    // Obter o corpo da requisição como texto
    const body = await req.text();
    const headersList = headers();

    console.log(
      "[WEBHOOK_RECEIVED] Headers:",
      Object.fromEntries(headersList.entries())
    );

    // Temporariamente ignorar a validação da assinatura para testar
    // const isValid = await pagarme.processWebhook(headersList, body);
    // if (!isValid) {
    //   console.error("[WEBHOOK_ERROR] Assinatura inválida");
    //   return new NextResponse("Assinatura inválida", { status: 401 });
    // }

    // Converter o corpo para JSON
    const webhookData = JSON.parse(body);

    // Log completo do payload para debug
    console.log("[WEBHOOK_PAYLOAD]", JSON.stringify(webhookData, null, 2));
    console.log("[WEBHOOK_ORDER_ID]", webhookData.data?.id);

    // Processar evento
    switch (webhookData.type) {
      case "order.paid":
        await handleOrderPaid(webhookData.data);
        break;
      case "order.payment_failed":
        await handleOrderFailed(webhookData.data);
        break;
      case "order.refunded":
        await handleOrderRefunded(webhookData.data);
        break;
      case "order.pending":
        await handleOrderPending(webhookData.data);
        break;
      default:
        console.log(`[WEBHOOK_INFO] Evento não tratado: ${webhookData.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[WEBHOOK_ERROR]", error);
    return new NextResponse("Webhook error", { status: 400 });
  }
}

async function handleOrderPaid(data: any) {
  try {
    // Log detalhado
    console.log(
      "[HANDLE_ORDER_PAID] Dados recebidos:",
      JSON.stringify(data, null, 2)
    );

    // Verificar se temos o ID da transação
    const pagarmeTransactionId = data.id;
    console.log("[HANDLE_ORDER_PAID] ID da transação:", pagarmeTransactionId);

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_PAID_ERROR] ID da transação não encontrado no payload"
      );
      return;
    }

    // Tentar encontrar o pedido pelo ID da transação
    try {
      const order = await prisma.order.findUnique({
        where: { pagarmeTransactionId },
        include: {
          items: true,
          customer: true,
        },
      });

      console.log(
        "[HANDLE_ORDER_PAID] Pedido encontrado:",
        order ? "Sim" : "Não"
      );

      if (order) {
        console.log(
          "[HANDLE_ORDER_PAID] Atualizando status do pedido:",
          order.id
        );

        // Atualizar o status
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { status: "paid" },
        });

        console.log(
          "[HANDLE_ORDER_PAID] Pedido atualizado:",
          updatedOrder.id,
          updatedOrder.status
        );

        // Processar cupom
        if (updatedOrder.couponId) {
          await prisma.coupon.update({
            where: { id: updatedOrder.couponId },
            data: {
              usageCount: { increment: 1 },
            },
          });
          console.log("[HANDLE_ORDER_PAID] Uso do cupom incrementado");
        }
      } else {
        console.error(
          "[HANDLE_ORDER_PAID_ERROR] Pedido não encontrado com pagarmeTransactionId:",
          pagarmeTransactionId
        );

        // Tentar busca alternativa pelo ID
        try {
          console.log(
            "[HANDLE_ORDER_PAID] Tentando busca alternativa pelo ID:",
            data.id
          );
          const fallbackOrder = await prisma.order.update({
            where: { id: data.id },
            data: { status: "paid" },
          });

          console.log(
            "[HANDLE_ORDER_PAID] Pedido encontrado por fallback:",
            fallbackOrder.id
          );

          // Processar cupom também
          if (fallbackOrder.couponId) {
            await prisma.coupon.update({
              where: { id: fallbackOrder.couponId },
              data: {
                usageCount: { increment: 1 },
              },
            });
          }
        } catch (fallbackError) {
          console.error(
            "[HANDLE_ORDER_PAID_ERROR] Falha na busca alternativa:",
            fallbackError
          );
        }
      }
    } catch (error) {
      console.error(
        "[HANDLE_ORDER_PAID_ERROR] Erro ao buscar/atualizar pedido:",
        error
      );
      throw error;
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_PAID_ERROR] Erro geral:", error);
    throw error;
  }
}

// Outras funções de manipulação de webhooks existentes
async function handleOrderFailed(data: any) {
  try {
    await prisma.order.update({
      where: { id: data.id },
      data: {
        status: "failed",
      },
    });
  } catch (error) {
    console.error("[HANDLE_ORDER_FAILED_ERROR]", error);
    throw error;
  }
}

async function handleOrderRefunded(data: any) {
  try {
    await prisma.order.update({
      where: { id: data.id },
      data: {
        status: "refunded",
      },
    });
  } catch (error) {
    console.error("[HANDLE_ORDER_REFUNDED_ERROR]", error);
    throw error;
  }
}

async function handleOrderPending(data: any) {
  try {
    await prisma.order.update({
      where: { id: data.id },
      data: {
        status: "pending",
      },
    });
  } catch (error) {
    console.error("[HANDLE_ORDER_PENDING_ERROR]", error);
    throw error;
  }
}

// Configurar apenas o método POST
export const GET = () =>
  new NextResponse("Método não permitido", { status: 405 });
export const PUT = () =>
  new NextResponse("Método não permitido", { status: 405 });
export const DELETE = () =>
  new NextResponse("Método não permitido", { status: 405 });
