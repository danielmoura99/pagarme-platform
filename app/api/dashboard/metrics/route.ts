// app/api/dashboard/metrics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from")
      ? new Date(searchParams.get("from") as string)
      : new Date(new Date().setDate(1)); // Primeiro dia do mês atual
    const toDate = searchParams.get("to")
      ? new Date(searchParams.get("to") as string)
      : new Date(); // Hoje

    // Total de transações
    const totalOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    // Transações por método de pagamento
    const cardPayments = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        paymentMethod: "credit_card",
      },
    });

    const pixPayments = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        paymentMethod: "pix",
      },
    });

    // Total de visitas ao checkout (assumindo que você tem essa informação)
    // Se não tiver, você pode usar uma estimativa ou um valor fixo
    const checkoutVisits = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        // Considerar todos os pedidos, mesmo os não concluídos
        // Se você tem uma tabela de visitas de checkout, use-a aqui
      },
    });

    // Calcular taxa de conversão
    // Se não tiver dados de visitas, pode usar um valor fixo
    const conversionRate =
      checkoutVisits > 0 ? (totalOrders / checkoutVisits) * 100 : 0;

    return NextResponse.json({
      totalTransactions: totalOrders,
      cardPayments,
      pixPayments,
      conversionRate,
    });
  } catch (error) {
    console.error("[DASHBOARD_METRICS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
