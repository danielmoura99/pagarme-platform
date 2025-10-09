// app/api/sales/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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

    // Filtros
    const statusFilter = searchParams.get("status");
    const affiliateFilter = searchParams.get("affiliate");

    // Construir where clause para orders
    const where: any = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    if (affiliateFilter && affiliateFilter !== "all") {
      if (affiliateFilter === "with_affiliate") {
        where.affiliateId = { not: null };
      } else if (affiliateFilter === "without_affiliate") {
        where.affiliateId = null;
      } else {
        where.affiliateId = affiliateFilter;
      }
    }

    // Buscar pedidos com relacionamentos
    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        affiliate: {
          include: {
            user: true,
          },
        },
        coupon: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Contar total de pedidos para paginação
    const totalCount = await prisma.order.count({
      where,
    });

    // Transformar dados para o formato esperado
    const sales = orders.map((order) => ({
      id: order.id,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerDocument: order.customer.document,
      productName: order.items[0]?.product?.name || "Produto não encontrado",
      amount: order.amount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      installments: order.installments,
      affiliateId: order.affiliateId,
      affiliateName: order.affiliate?.user?.name || null,
      couponCode: order.coupon?.code || null,
      splitAmount: order.splitAmount,
      createdAt: order.createdAt.toISOString(),
      pagarmeTransactionId: order.pagarmeTransactionId,
    }));

    // Calcular informações de paginação
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      sales,
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
    console.error("[SALES_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}
