// app/api/clients/route.ts
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

    // Where clause base para o período
    const baseWhere = {
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    // Construir where clause para orders com filtros
    const ordersWhere: any = { ...baseWhere };
    
    if (statusFilter && statusFilter !== "all") {
      ordersWhere.status = statusFilter;
    }

    if (affiliateFilter && affiliateFilter !== "all") {
      if (affiliateFilter === "with_affiliate") {
        ordersWhere.affiliateId = { not: null };
      } else if (affiliateFilter === "without_affiliate") {
        ordersWhere.affiliateId = null;
      } else {
        ordersWhere.affiliateId = affiliateFilter;
      }
    }

    // Buscar clientes que fizeram pedidos no período com aggregações
    const clients = await prisma.customer.findMany({
      where: {
        orders: {
          some: ordersWhere,
        },
      },
      include: {
        orders: {
          where: ordersWhere,
          include: {
            affiliate: {
              include: {
                user: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Contar total de clientes únicos para paginação
    const totalCount = await prisma.customer.count({
      where: {
        orders: {
          some: ordersWhere,
        },
      },
    });

    // Transformar dados para incluir métricas agregadas
    const clientsWithMetrics = clients.map((client) => {
      const orders = client.orders;
      
      // Calcular métricas
      const totalSpent = orders.reduce((sum, order) => sum + order.amount, 0);
      const totalOrders = orders.length;
      const lastPurchase = orders.length > 0 ? orders[0].createdAt : null;
      const firstPurchase = orders.length > 0 ? orders[orders.length - 1].createdAt : null;
      
      // Status baseado na última compra
      const paidOrders = orders.filter(order => order.status === "paid");
      const failedOrders = orders.filter(order => order.status === "failed");
      const pendingOrders = orders.filter(order => order.status === "pending");
      
      // Determinar status geral do cliente
      let clientStatus: "active" | "inactive" | "problematic" = "inactive";
      if (paidOrders.length > 0) {
        const daysSinceLastPurchase = lastPurchase 
          ? Math.floor((new Date().getTime() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        
        clientStatus = daysSinceLastPurchase <= 30 ? "active" : "inactive";
        
        // Se tem muitas falhas recentes, marcar como problemático
        if (failedOrders.length >= 2 && failedOrders.length > paidOrders.length) {
          clientStatus = "problematic";
        }
      }

      // Informações sobre afiliados (se houve vendas via afiliado)
      const affiliateOrders = orders.filter(order => order.affiliate);
      const hasAffiliateOrders = affiliateOrders.length > 0;
      const affiliatesUsed = affiliateOrders.reduce((acc, order) => {
        if (order.affiliate && !acc.find(a => a.id === order.affiliate!.id)) {
          acc.push({
            id: order.affiliate.id,
            name: order.affiliate.user.name || "Nome não disponível",
            totalOrders: affiliateOrders.filter(o => o.affiliate?.id === order.affiliate!.id).length,
          });
        }
        return acc;
      }, [] as Array<{ id: string; name: string; totalOrders: number }>);

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        document: client.document,
        phone: client.phone,
        
        // Métricas de compra
        totalSpent,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0,
        
        // Datas importantes
        firstPurchase: firstPurchase?.toISOString(),
        lastPurchase: lastPurchase?.toISOString(),
        daysSinceLastPurchase: lastPurchase 
          ? Math.floor((new Date().getTime() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        
        // Status e contadores
        clientStatus,
        paidOrdersCount: paidOrders.length,
        failedOrdersCount: failedOrders.length,
        pendingOrdersCount: pendingOrders.length,
        
        // Informações de afiliado
        hasAffiliateOrders,
        affiliatesUsed,
        
        // Datas do registro
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      };
    });

    // Calcular informações de paginação
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      clients: clientsWithMetrics,
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
    console.error("[CLIENTS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}