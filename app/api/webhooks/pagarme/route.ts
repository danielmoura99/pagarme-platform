/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhooks/pagarme/route.ts
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

    // Converter o corpo para JSON diretamente (sem validação)
    const webhookData = JSON.parse(body);

    // Log do payload para debug
    console.log("[WEBHOOK_PAYLOAD]", JSON.stringify(webhookData, null, 2));
    console.log("[WEBHOOK_TYPE]", webhookData.type);
    console.log("[WEBHOOK_ORDER_ID]", webhookData.data?.id); // Corrigido para extrair o ID correto

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
    // Log mais detalhado
    console.log(
      "[HANDLE_ORDER_PAID] Dados recebidos:",
      JSON.stringify(data, null, 2)
    );

    // Verificar se temos o ID da transação - CORRIGIDO
    const pagarmeTransactionId = data.id; // Extraindo diretamente do data.id
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

        // Tentar busca alternativa pelo código (que também pode estar nos metadados)
        try {
          const orderCode = data.code || data.charges?.[0]?.code; // Tenta outras possibilidades
          console.log(
            "[HANDLE_ORDER_PAID] Tentando busca alternativa pelo código:",
            orderCode
          );

          // Verificando se temos algum outro identificador nos metadados
          const productId = data.metadata?.product_id;
          console.log(
            "[HANDLE_ORDER_PAID] Product ID dos metadados:",
            productId
          );

          // Buscar por pedidos recentes com o mesmo produto
          const recentOrders = await prisma.order.findMany({
            where: {
              items: {
                some: {
                  productId: productId,
                },
              },
              status: {
                in: ["pending", "processing"],
              },
              createdAt: {
                // Pedidos nas últimas 24 horas
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
            include: { items: true },
          });

          console.log(
            "[HANDLE_ORDER_PAID] Pedidos recentes encontrados:",
            recentOrders.length
          );

          if (recentOrders.length > 0) {
            // Atualizar o primeiro pedido recente (mais recente)
            const orderToUpdate = recentOrders[0];

            // Atualizar o pedido com o ID da transação do Pagar.me
            const updatedOrder = await prisma.order.update({
              where: { id: orderToUpdate.id },
              data: {
                status: "paid",
                pagarmeTransactionId, // Atualiza com o ID da transação para futuros webhooks
              },
              include: { items: true },
            });

            console.log(
              "[HANDLE_ORDER_PAID] Pedido recente atualizado:",
              updatedOrder.id
            );

            // Processar cupom
            if (updatedOrder.couponId) {
              await prisma.coupon.update({
                where: { id: updatedOrder.couponId },
                data: {
                  usageCount: { increment: 1 },
                },
              });
            }
          } else {
            console.error(
              "[HANDLE_ORDER_PAID_ERROR] Nenhum pedido recente encontrado para atualizar"
            );
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

// Atualizar também as outras funções para usar a estrutura correta
async function handleOrderFailed(data: any) {
  try {
    const pagarmeTransactionId = data.id; // ID correto

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_FAILED_ERROR] ID da transação não encontrado"
      );
      return;
    }

    const order = await prisma.order.findUnique({
      where: { pagarmeTransactionId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "failed",
        },
      });
      console.log(
        "[HANDLE_ORDER_FAILED] Pedido atualizado como falha:",
        order.id
      );
    } else {
      console.error(
        "[HANDLE_ORDER_FAILED_ERROR] Pedido não encontrado:",
        pagarmeTransactionId
      );
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_FAILED_ERROR]", error);
    throw error;
  }
}

async function handleOrderRefunded(data: any) {
  try {
    const pagarmeTransactionId = data.id; // ID correto

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_REFUNDED_ERROR] ID da transação não encontrado"
      );
      return;
    }

    const order = await prisma.order.findUnique({
      where: { pagarmeTransactionId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "refunded",
        },
      });
      console.log(
        "[HANDLE_ORDER_REFUNDED] Pedido atualizado como reembolsado:",
        order.id
      );
    } else {
      console.error(
        "[HANDLE_ORDER_REFUNDED_ERROR] Pedido não encontrado:",
        pagarmeTransactionId
      );
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_REFUNDED_ERROR]", error);
    throw error;
  }
}

async function handleOrderPending(data: any) {
  try {
    const pagarmeTransactionId = data.id; // ID correto

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_PENDING_ERROR] ID da transação não encontrado"
      );
      return;
    }

    const order = await prisma.order.findUnique({
      where: { pagarmeTransactionId },
    });

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "pending",
        },
      });
      console.log(
        "[HANDLE_ORDER_PENDING] Pedido atualizado como pendente:",
        order.id
      );
    } else {
      console.error(
        "[HANDLE_ORDER_PENDING_ERROR] Pedido não encontrado:",
        pagarmeTransactionId
      );
    }
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
