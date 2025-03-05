/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/webhooks/pagarme/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pagarme } from "@/lib/pagarme";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    // Obter o corpo da requisição como texto para validação da assinatura
    const body = await req.text();
    const headersList = headers();

    console.log(
      "[WEBHOOK_RECEIVED] Headers:",
      Object.fromEntries(headersList.entries())
    );

    // Validar a assinatura do webhook
    const isValid = await pagarme.processWebhook(await headersList, body);
    if (!isValid) {
      console.error("[WEBHOOK_ERROR] Assinatura inválida");
      return new NextResponse("Assinatura inválida", { status: 401 });
    }

    // Converter o corpo para JSON após validação
    const webhookData = JSON.parse(body);

    // Log completo do payload para debug
    console.log("[WEBHOOK_PAYLOAD]", JSON.stringify(webhookData, null, 2));
    console.log("[WEBHOOK_ORDER_ID]", webhookData.data?.order?.id);

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

    const pagarmeTransactionId = data.order.id;

    console.log(
      `[WEBHOOK_INFO] Buscando pedido pelo ID da transação Pagar.me: ${pagarmeTransactionId}`
    );

    const order = await prisma.order.update({
      where: { pagarmeTransactionId },
      data: {
        status: "paid",
      },
      include: {
        items: true,
      },
    });

    // Se houver cupom, incrementar o uso
    if (order.couponId) {
      await prisma.coupon.update({
        where: { id: order.couponId },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    }

    // Aqui você pode adicionar outras ações pós-pagamento
    // Por exemplo: enviar email, criar acesso ao produto, etc.
  } catch (error) {
    console.error("[HANDLE_ORDER_PAID_ERROR]", error);
    throw error;
  }
}

async function handleOrderFailed(data: any) {
  try {
    await prisma.order.update({
      where: { id: data.order.id },
      data: {
        status: "failed",
      },
    });

    // Aqui você pode adicionar ações para falha
    // Por exemplo: notificar o cliente, tentar reprocessar, etc.
  } catch (error) {
    console.error("[HANDLE_ORDER_FAILED_ERROR]", error);
    throw error;
  }
}

async function handleOrderRefunded(data: any) {
  try {
    await prisma.order.update({
      where: { id: data.order.id },
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
      where: { id: data.order.id },
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
