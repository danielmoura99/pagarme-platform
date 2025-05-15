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

    // Total de transações (todos os status)
    const totalOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    // Total de transações pagas
    const paidOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        status: "paid",
      },
    });

    // Transações PAGAS por método de pagamento
    const cardPayments = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        paymentMethod: "credit_card",
        status: "paid", // Apenas pagas
      },
    });

    const pixPayments = await prisma.order.count({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        paymentMethod: "pix",
        status: "paid", // Apenas pagas
      },
    });

    // Calcular taxa de conversão: (transações pagas / total de transações) * 100
    const conversionRate =
      totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0;

    return NextResponse.json({
      totalTransactions: totalOrders,
      paidTransactions: paidOrders,
      cardPayments,
      pixPayments,
      conversionRate: Number(conversionRate.toFixed(1)), // Arredondar para 1 casa decimal
    });
  } catch (error) {
    console.error("[DASHBOARD_METRICS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
