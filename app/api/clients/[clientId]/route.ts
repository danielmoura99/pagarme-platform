// app/api/clients/[clientId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { clientId: string } }
) {
  try {
    const clientId = params.clientId;

    // Buscar cliente com todos os relacionamentos
    const client = await prisma.customer.findUnique({
      where: {
        id: clientId,
      },
      include: {
        orders: {
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
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Calcular métricas
    const orders = client.orders;
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

    // Informações sobre afiliados
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

    // Formatar histórico de pedidos
    const formattedOrders = orders.map(order => ({
      id: order.id,
      amount: order.amount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
      productName: order.items[0]?.product?.name || "Produto não encontrado",
      affiliateName: order.affiliate ? order.affiliate.user.name : null,
    }));

    // Retornar dados detalhados do cliente
    const clientDetails = {
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
      firstPurchase: firstPurchase?.toISOString() || null,
      lastPurchase: lastPurchase?.toISOString() || null,
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
      
      // Histórico de pedidos
      orders: formattedOrders,
      
      // Datas do registro
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };

    return NextResponse.json(clientDetails);
  } catch (error) {
    console.error("[CLIENT_DETAILS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch client details" },
      { status: 500 }
    );
  }
}