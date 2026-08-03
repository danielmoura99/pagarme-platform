// scripts/check-pix-dup.ts — investiga dupla contagem de conversão PIX na Meta
import { prisma } from "../lib/db";

const EMAIL = "mateus.investimentos99@gmail.com";

(async () => {
  const order = await prisma.order.findFirst({
    where: { customer: { email: EMAIL } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      amount: true,
      paymentMethod: true,
      createdAt: true,
      updatedAt: true,
      utmSource: true,
      checkoutId: true,
    },
  });

  if (!order) {
    console.log("Pedido não encontrado");
    await prisma.$disconnect();
    return;
  }

  console.log("=== PEDIDO ===");
  console.log("id:", order.id);
  console.log("status:", order.status, "| método:", order.paymentMethod, "| valor:", order.amount);
  console.log("criado:", order.createdAt.toISOString());
  console.log("atualizado:", order.updatedAt.toISOString());
  console.log("utmSource:", order.utmSource);

  // Todos os eventos de pixel desse pedido
  const eventos = await prisma.pixelEventLog.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      eventType: true,
      createdAt: true,
      eventData: true,
      pixelConfig: { select: { platform: true } },
    },
  });

  console.log(`\n=== EVENTOS DE PIXEL (${eventos.length}) ===`);
  for (const e of eventos) {
    const d = e.eventData as any;
    console.log(
      `${e.createdAt.toISOString()} | ${e.eventType.padEnd(18)} | ${e.pixelConfig.platform.padEnd(11)} | server_side=${d?.server_side ?? false} | id=${e.id}`
    );
  }

  // Todos os pedidos do cliente — a Meta pode estar contando compras distintas
  const todos = await prisma.order.findMany({
    where: { customer: { email: EMAIL } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      amount: true,
      paymentMethod: true,
      createdAt: true,
      checkoutId: true,
      items: { select: { product: { select: { name: true } } } },
    },
  });

  console.log(`\n=== TODOS OS PEDIDOS DO CLIENTE (${todos.length}) ===`);
  for (const o of todos) {
    const eventos = await prisma.pixelEventLog.count({
      where: { orderId: o.id, eventType: "Purchase" },
    });
    console.log(
      `${o.createdAt.toISOString()} | ${o.status.padEnd(8)} | ${o.paymentMethod.padEnd(12)} | R$ ${(o.amount / 100).toFixed(2).padStart(9)} | Purchase events: ${eventos} | ${o.items[0]?.product.name?.slice(0, 28) ?? "?"}`
    );
  }

  await prisma.$disconnect();
})();
