/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pagarme } from "@/lib/pagarme";
import { headers } from "next/headers";

// Função compartilhada para processar o webhook independente do método HTTP
async function processWebhook(req: Request) {
  try {
    // Obter o corpo da requisição como texto para validação da assinatura
    const body = await req.text();
    const headersList = headers();

    console.log(
      "[WEBHOOK_RECEIVED] Headers:",
      Object.fromEntries(headersList.entries())
    );
    console.log("[WEBHOOK_RECEIVED] Method:", req.method);

    // Validar a assinatura do webhook
    const isValid = await pagarme.processWebhook(await headersList, body);
    console.log("[WEBHOOK_SIGNATURE_VALID]:", isValid);

    if (!isValid) {
      console.error("[WEBHOOK_ERROR] Assinatura inválida");
      return new NextResponse("Assinatura inválida", { status: 401 });
    }

    // Converter o corpo para JSON após validação
    const webhookData = JSON.parse(body);

    // Log para debug
    console.log("[WEBHOOK_PAYLOAD]", JSON.stringify(webhookData, null, 2));
    console.log("[WEBHOOK_TYPE]", webhookData.type);
    console.log("[WEBHOOK_ORDER_ID]", webhookData.data?.order?.id);

    // Processar evento
    switch (webhookData.type) {
      case "order.paid":
        console.log("[WEBHOOK_HANDLER] Chamando handleOrderPaid");
        await handleOrderPaid(webhookData.data);
        break;
      case "order.payment_failed":
        console.log("[WEBHOOK_HANDLER] Chamando handleOrderFailed");
        await handleOrderFailed(webhookData.data);
        break;
      case "order.refunded":
        console.log("[WEBHOOK_HANDLER] Chamando handleOrderRefunded");
        await handleOrderRefunded(webhookData.data);
        break;
      case "order.pending":
        console.log("[WEBHOOK_HANDLER] Chamando handleOrderPending");
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

// Exportar handlers para diferentes métodos HTTP
export async function POST(req: Request) {
  return await processWebhook(req);
}

export async function GET(req: Request) {
  return await processWebhook(req);
}

export async function PUT(req: Request) {
  return await processWebhook(req);
}

export async function DELETE(req: Request) {
  return await processWebhook(req);
}

async function handleOrderPaid(data: any) {
  try {
    console.log(
      "[HANDLE_ORDER_PAID] Dados recebidos:",
      JSON.stringify(data, null, 2)
    );

    // Verificar se temos o ID da transação
    const pagarmeTransactionId = data.order?.id;
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
          include: { items: true },
        });

        console.log(
          "[HANDLE_ORDER_PAID] Pedido atualizado:",
          updatedOrder.id,
          updatedOrder.status
        );

        // Se houver cupom, incrementar o uso
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

        // Fallback: tentar atualizar pelo ID do pedido diretamente
        try {
          console.log(
            "[HANDLE_ORDER_PAID] Tentando busca alternativa pelo ID:",
            data.order.id
          );
          const fallbackOrder = await prisma.order.update({
            where: { id: data.order.id },
            data: { status: "paid" },
            include: { items: true },
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

// Aplicar a mesma estrutura lógica às outras funções de handler
async function handleOrderFailed(data: any) {
  try {
    console.log(
      "[HANDLE_ORDER_FAILED] Dados recebidos:",
      JSON.stringify(data, null, 2)
    );

    const pagarmeTransactionId = data.order?.id;
    console.log("[HANDLE_ORDER_FAILED] ID da transação:", pagarmeTransactionId);

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_FAILED_ERROR] ID da transação não encontrado no payload"
      );
      return;
    }

    const order = await prisma.order.findUnique({
      where: { pagarmeTransactionId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "failed" },
      });

      console.log(
        "[HANDLE_ORDER_FAILED] Pedido atualizado para failed:",
        order.id
      );
    } else {
      console.error(
        "[HANDLE_ORDER_FAILED_ERROR] Pedido não encontrado com pagarmeTransactionId:",
        pagarmeTransactionId
      );

      try {
        await prisma.order.update({
          where: { id: data.order.id },
          data: { status: "failed" },
        });
        console.log(
          "[HANDLE_ORDER_FAILED] Pedido atualizado por fallback:",
          data.order.id
        );
      } catch (fallbackError) {
        console.error(
          "[HANDLE_ORDER_FAILED_ERROR] Falha na busca alternativa:",
          fallbackError
        );
      }
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_FAILED_ERROR]", error);
    throw error;
  }
}

async function handleOrderRefunded(data: any) {
  try {
    console.log(
      "[HANDLE_ORDER_REFUNDED] Dados recebidos:",
      JSON.stringify(data, null, 2)
    );

    const pagarmeTransactionId = data.order?.id;
    console.log(
      "[HANDLE_ORDER_REFUNDED] ID da transação:",
      pagarmeTransactionId
    );

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_REFUNDED_ERROR] ID da transação não encontrado no payload"
      );
      return;
    }

    const order = await prisma.order.findUnique({
      where: { pagarmeTransactionId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "refunded" },
      });

      console.log(
        "[HANDLE_ORDER_REFUNDED] Pedido atualizado para refunded:",
        order.id
      );
    } else {
      console.error(
        "[HANDLE_ORDER_REFUNDED_ERROR] Pedido não encontrado com pagarmeTransactionId:",
        pagarmeTransactionId
      );

      try {
        await prisma.order.update({
          where: { id: data.order.id },
          data: { status: "refunded" },
        });
        console.log(
          "[HANDLE_ORDER_REFUNDED] Pedido atualizado por fallback:",
          data.order.id
        );
      } catch (fallbackError) {
        console.error(
          "[HANDLE_ORDER_REFUNDED_ERROR] Falha na busca alternativa:",
          fallbackError
        );
      }
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_REFUNDED_ERROR]", error);
    throw error;
  }
}

async function handleOrderPending(data: any) {
  try {
    console.log(
      "[HANDLE_ORDER_PENDING] Dados recebidos:",
      JSON.stringify(data, null, 2)
    );

    const pagarmeTransactionId = data.order?.id;
    console.log(
      "[HANDLE_ORDER_PENDING] ID da transação:",
      pagarmeTransactionId
    );

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_PENDING_ERROR] ID da transação não encontrado no payload"
      );
      return;
    }

    const order = await prisma.order.findUnique({
      where: { pagarmeTransactionId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "pending" },
      });

      console.log(
        "[HANDLE_ORDER_PENDING] Pedido atualizado para pending:",
        order.id
      );
    } else {
      console.error(
        "[HANDLE_ORDER_PENDING_ERROR] Pedido não encontrado com pagarmeTransactionId:",
        pagarmeTransactionId
      );

      try {
        await prisma.order.update({
          where: { id: data.order.id },
          data: { status: "pending" },
        });
        console.log(
          "[HANDLE_ORDER_PENDING] Pedido atualizado por fallback:",
          data.order.id
        );
      } catch (fallbackError) {
        console.error(
          "[HANDLE_ORDER_PENDING_ERROR] Falha na busca alternativa:",
          fallbackError
        );
      }
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_PENDING_ERROR]", error);
    throw error;
  }
}
