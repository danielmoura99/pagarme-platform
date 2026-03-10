/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
// import { sendPurchaseToRDStation } from "@/lib/rd-station-auto-sync"; // Removido - sync via pixel event

export async function POST(req: Request) {
  try {
    // Obter o corpo da requisição como texto
    const body = await req.text();
    const headersList = headers();

    console.log(
      "[WEBHOOK_RECEIVED] Headers:",
      Object.fromEntries(headersList.entries())
    );

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
    console.log(
      "[HANDLE_ORDER_PAID] Dados recebidos:",
      JSON.stringify(data, null, 2)
    );

    const pagarmeTransactionId = data.id;
    console.log("[HANDLE_ORDER_PAID] ID da transação:", pagarmeTransactionId);

    if (!pagarmeTransactionId) {
      console.error(
        "[HANDLE_ORDER_PAID_ERROR] ID da transação não encontrado no payload"
      );
      return;
    }

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

        // Atualizar o status e salvar resposta da Pagar.me
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "paid",
            pagarmeResponse: data, // Salvar resposta completa
            lastAttemptAt: new Date(),
          },
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

        // 🚀 RD STATION SYNC DESABILITADO - Agora enviado via pixel event Purchase
        // Para evitar duplicatas, o envio para RD Station agora acontece quando
        // o evento Purchase é registrado em /api/pixels/events
        console.log("[HANDLE_ORDER_PAID] RD Station sync via pixel event - webhook sync disabled to prevent duplicates");

        // Gerar Purchase pixel event server-side (garante analytics mesmo sem frontend)
        await createPurchasePixelEvents(updatedOrder.id);
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
            data: {
              status: "paid",
              pagarmeResponse: data,
              lastAttemptAt: new Date(),
            },
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

          // 🚀 RD STATION SYNC DESABILITADO - Fallback também usa pixel event
          console.log("[HANDLE_ORDER_PAID_FALLBACK] RD Station sync via pixel event - webhook sync disabled to prevent duplicates");

          // Gerar Purchase pixel event server-side (fallback flow)
          await createPurchasePixelEvents(fallbackOrder.id);
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

// ✅ FUNÇÃO MELHORADA PARA CAPTURAR DETALHES DA FALHA
async function handleOrderFailed(data: any) {
  try {
    console.log(
      "[HANDLE_ORDER_FAILED] Dados da falha:",
      JSON.stringify(data, null, 2)
    );

    // Extrair informações da falha
    let failureReason = "Falha no pagamento";
    let failureCode = "UNKNOWN";

    // Tentar extrair o motivo da falha da resposta da Pagar.me
    if (data.charges && data.charges[0]) {
      const charge = data.charges[0];
      const transaction = charge.last_transaction;

      if (transaction) {
        // ✅ CAPTURAR INFORMAÇÕES DO GATEWAY_RESPONSE
        if (transaction.gateway_response) {
          const gatewayResponse = transaction.gateway_response;

          // Pegar código do gateway
          if (gatewayResponse.code) {
            failureCode = gatewayResponse.code;
          }

          // Pegar mensagem de erro do gateway
          if (gatewayResponse.errors && gatewayResponse.errors.length > 0) {
            const error = gatewayResponse.errors[0];
            if (error.message) {
              failureReason = error.message;

              // Tentar extrair um código mais específico da mensagem
              // Ex: "validation_error | customer | Invalid CPF" -> extrair "validation_error"
              const messageParts = error.message.split(" | ");
              if (messageParts.length > 0) {
                failureCode = messageParts[0].toUpperCase();
              }
            }
          }
        }
        // ✅ FALLBACK: Tentar outras fontes se gateway_response não tiver informações
        else if (transaction.acquirer_message || transaction.reason) {
          failureReason = transaction.acquirer_message || transaction.reason;
          failureCode =
            transaction.acquirer_return_code ||
            transaction.response_code ||
            "ACQUIRER_ERROR";
        }
        // ✅ IDENTIFICAR TIPO DE PAGAMENTO E APLICAR LÓGICAS ESPECÍFICAS
        else {
          // PIX
          if (transaction.pix_qr_code && transaction.status === "failed") {
            failureReason = transaction.reason || "PIX expirado ou falhou";
            failureCode = transaction.acquirer_return_code || "PIX_FAILED";
          }
          // Cartão de crédito
          else if (transaction.card) {
            failureReason =
              transaction.acquirer_message ||
              transaction.reason ||
              "Cartão negado";
            failureCode =
              transaction.acquirer_return_code ||
              transaction.response_code ||
              "CARD_DENIED";
          }
          // Outros métodos
          else {
            failureReason = transaction.reason || "Pagamento falhou";
            failureCode = transaction.response_code || "PAYMENT_FAILED";
          }
        }
      }
    }

    console.log("[HANDLE_ORDER_FAILED] Informações extraídas:", {
      failureReason,
      failureCode,
    });

    // Buscar pedido por ID da transação Pagar.me
    let order = await prisma.order.findUnique({
      where: { pagarmeTransactionId: data.id },
    });

    // Se não encontrar, tentar pelo ID direto
    if (!order) {
      order = await prisma.order.findUnique({
        where: { id: data.id },
      });
    }

    if (order) {
      // Incrementar tentativas
      const newAttempts = (order.attempts || 0) + 1;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "failed",
          failureReason,
          failureCode,
          pagarmeResponse: data, // Salvar resposta completa para análise
          attempts: newAttempts,
          lastAttemptAt: new Date(),
        },
      });

      console.log(
        `[HANDLE_ORDER_FAILED] Pedido ${order.id} atualizado como falhou:`,
        {
          failureReason,
          failureCode,
          attempts: newAttempts,
        }
      );
    } else {
      console.error(
        "[HANDLE_ORDER_FAILED_ERROR] Pedido não encontrado:",
        data.id
      );
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_FAILED_ERROR]", error);
    throw error;
  }
}

async function handleOrderRefunded(data: any) {
  try {
    console.log(
      "[HANDLE_ORDER_REFUNDED] Dados do reembolso:",
      JSON.stringify(data, null, 2)
    );

    // Buscar pelo ID da transação Pagar.me ou ID direto
    let order = await prisma.order.findUnique({
      where: { pagarmeTransactionId: data.id },
    });

    if (!order) {
      order = await prisma.order.findUnique({
        where: { id: data.id },
      });
    }

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "refunded",
          pagarmeResponse: data,
          lastAttemptAt: new Date(),
        },
      });

      console.log(`[HANDLE_ORDER_REFUNDED] Pedido ${order.id} reembolsado`);
    }
  } catch (error) {
    console.error("[HANDLE_ORDER_REFUNDED_ERROR]", error);
    throw error;
  }
}

async function handleOrderPending(data: any) {
  try {
    console.log(
      "[HANDLE_ORDER_PENDING] Dados pendente:",
      JSON.stringify(data, null, 2)
    );

    // Buscar pelo ID da transação Pagar.me ou ID direto
    let order = await prisma.order.findUnique({
      where: { pagarmeTransactionId: data.id },
    });

    if (!order) {
      order = await prisma.order.findUnique({
        where: { id: data.id },
      });
    }

    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "pending",
          pagarmeResponse: data,
          lastAttemptAt: new Date(),
        },
      });

      console.log(`[HANDLE_ORDER_PENDING] Pedido ${order.id} pendente`);
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

// Gera PixelEventLog de Purchase server-side (fonte confiável, independente do browser)
// Chamada APÓS atualizar o status da Order — não interfere no fluxo Pagar.me
async function createPurchasePixelEvents(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                pixelConfigs: {
                  where: { enabled: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      console.log("[PIXEL_SERVER_SIDE] Order não encontrada:", orderId);
      return;
    }

    for (const item of order.items) {
      for (const pixelConfig of item.product.pixelConfigs) {
        // Deduplicar: só criar se ainda não existir Purchase para este orderId + pixelConfig
        const existing = await prisma.pixelEventLog.findFirst({
          where: {
            pixelConfigId: pixelConfig.id,
            eventType: "Purchase",
            orderId: order.id,
          },
        });

        if (existing) {
          console.log(
            `[PIXEL_SERVER_SIDE] Purchase já existe para pixelConfig=${pixelConfig.id} orderId=${order.id} — ignorando`
          );
          continue;
        }

        await prisma.pixelEventLog.create({
          data: {
            pixelConfigId: pixelConfig.id,
            eventType: "Purchase",
            eventData: {
              value: order.amount / 100,
              currency: "BRL",
              content_name: item.product.name,
              email: order.customer?.email ?? null,
              server_side: true,
            },
            orderId: order.id,
            source:      order.utmSource   ?? null,
            medium:      order.utmMedium   ?? null,
            campaign:    order.utmCampaign ?? null,
            term:        order.utmTerm     ?? null,
            content:     order.utmContent  ?? null,
            referrer:    order.referrer    ?? null,
            landingPage: order.landingPage ?? null,
          },
        });

        console.log(
          `[PIXEL_SERVER_SIDE] Purchase criado — pixelConfig=${pixelConfig.id} orderId=${order.id} source=${order.utmSource}`
        );
      }
    }
  } catch (error) {
    // Não relançar — falha no pixel não pode derrubar o webhook
    console.error("[PIXEL_SERVER_SIDE_ERROR] Erro ao criar Purchase events:", error);
  }
}
