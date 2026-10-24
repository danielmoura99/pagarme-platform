import { withDbMonitoring } from "@/lib/monitoring/route";
// app/api/sales/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import { maskDocument, maskPhone } from "@/lib/mask";
import { bloquearSeExterno } from "@/lib/mesma-origem";

export const dynamic = "force-dynamic";

async function monitoredGET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    // /clientes is admin-only; enforce the same rule for direct API requests.
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from")
      ? new Date(searchParams.get("from") as string)
      : new Date(new Date().setDate(1)); // Primeiro dia do mês atual
    const toDate = searchParams.get("to")
      ? new Date(searchParams.get("to") as string)
      : new Date(); // Hoje

    // Parâmetros de paginação
    const page = parseInt(searchParams.get("page") || "1");
    const isExport = searchParams.get("export") === "true";
    const limit = isExport
      ? parseInt(searchParams.get("limit") || "50")
      : Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const skip = (page - 1) * limit;
    const unmask = searchParams.get("unmask") === "true";

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

    // Buscar pedidos — apenas os campos que a resposta abaixo usa.
    //
    // Antes isto era `include` em customer/affiliate.user/coupon/items.product,
    // o que trazia as linhas inteiras de seis tabelas (User sozinho tem ~16 KB
    // por linha) para montar um objeto de poucas centenas de bytes. Com 50
    // pedidos por página dava ~1,7 MB por requisição, e esta rota respondia
    // por quase todo o network transfer do projeto.
    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        amount: true,
        status: true,
        paymentMethod: true,
        installments: true,
        affiliateId: true,
        splitAmount: true,
        createdAt: true,
        pagarmeTransactionId: true,
        utmSource: true,
        utmCampaign: true,
        customer: {
          select: { name: true, email: true, document: true, phone: true },
        },
        affiliate: {
          select: { user: { select: { name: true } } },
        },
        coupon: { select: { code: true } },
        items: {
          select: { product: { select: { name: true } } },
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
      customerDocument: unmask ? order.customer.document : maskDocument(order.customer.document),
      customerPhone: unmask ? order.customer.phone : maskPhone(order.customer.phone),
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
      utmSource: order.utmSource,
      utmCampaign: order.utmCampaign,
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

const monitoredSalesGET = withDbMonitoring("GET /api/sales", monitoredGET);

export async function GET(request: Request) {
  // This endpoint supports from/to, not the analytics-only days parameter.
  // Reject before authentication AND sampling so rejected polling does not
  // read/write UserSession or insert monitoring samples in the database.
  if (new URL(request.url).searchParams.has("days")) {
    return NextResponse.json(
      { error: "Parâmetro days não suportado nesta rota. Informe o período com from e to." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  const externo = bloquearSeExterno(request, "/api/sales");
  if (externo) return externo;
  return monitoredSalesGET(request);
}
