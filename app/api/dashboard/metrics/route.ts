// app/api/dashboard/metrics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verificar autenticação e obter sessão
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from")
      ? new Date(searchParams.get("from") as string)
      : new Date(new Date().setDate(1)); // Primeiro dia do mês atual
    const toDate = searchParams.get("to")
      ? new Date(searchParams.get("to") as string)
      : new Date(); // Hoje

    // Preparar filtro base de datas
    const dateFilter = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Se o usuário é afiliado, buscar seu affiliateId
    let affiliateFilter = {};
    if (session.user.role === "affiliate") {
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!affiliate) {
        return NextResponse.json({
          totalTransactions: 0,
          paidTransactions: 0,
          cardPayments: 0,
          pixPayments: 0,
          conversionRate: 0,
        });
      }

      affiliateFilter = { affiliateId: affiliate.id };
    }

    // Total de transações (todos os status)
    const totalOrders = await prisma.order.count({
      where: {
        ...dateFilter,
        ...affiliateFilter,
      },
    });

    // Total de transações pagas
    const paidOrders = await prisma.order.count({
      where: {
        ...dateFilter,
        ...affiliateFilter,
        status: "paid",
      },
    });

    // Transações PAGAS por método de pagamento
    const cardPayments = await prisma.order.count({
      where: {
        ...dateFilter,
        ...affiliateFilter,
        paymentMethod: "credit_card",
        status: "paid", // Apenas pagas
      },
    });

    const pixPayments = await prisma.order.count({
      where: {
        ...dateFilter,
        ...affiliateFilter,
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
