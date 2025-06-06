// app/api/transactions/route.ts
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

    // Parâmetros de paginação
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Where clause para filtros
    const whereClause = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Contar total de transações (para calcular total de páginas)
    const totalCount = await prisma.order.count({
      where: whereClause,
    });

    // Buscar transações com paginação
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    // Transformar os dados para o formato esperado pela UI
    const transactions = orders.map((order) => {
      const product = order.items[0]?.product; // Assumindo que queremos mostrar o primeiro produto

      return {
        id: order.id,
        orderId: `#${order.id.slice(0, 8)}`, // Formatado para exibição
        customer: order.customer.name,
        product: product?.name || "Produto não encontrado",
        paymentMethod: order.paymentMethod as "credit_card" | "pix",
        status: order.status as "pending" | "paid" | "failed" | "refunded",
        date: order.createdAt.toISOString(),
        amount: order.amount,
      };
    });

    // Calcular informações de paginação
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPreviousPage,
        startItem: skip + 1,
        endItem: Math.min(skip + limit, totalCount),
      },
    });
  } catch (error) {
    console.error("[TRANSACTIONS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
