// scripts/check-pixel-events.ts — que eventos cada pixel está configurado para enviar
import { prisma } from "../lib/db";

const ORDER_ID = "cmsc1rddu0004xp702ptyozba";

(async () => {
  const order = await prisma.order.findUnique({
    where: { id: ORDER_ID },
    select: { items: { select: { productId: true, product: { select: { name: true } } } } },
  });
  const productId = order?.items[0]?.productId;
  console.log("Produto:", order?.items[0]?.product.name, `(${productId})`);

  const pixels = await prisma.pixelConfig.findMany({
    where: { productId },
    select: { platform: true, pixelId: true, enabled: true, events: true },
  });

  console.log("\n=== PIXELS DO PRODUTO ===");
  for (const p of pixels) {
    console.log(
      `${p.platform} | enabled=${p.enabled} | eventos: ${JSON.stringify(p.events)}`
    );
  }

  // Quantos eventos de cada tipo esse pedido gerou
  const porTipo = await prisma.pixelEventLog.groupBy({
    by: ["eventType"],
    _count: { id: true },
    where: { orderId: ORDER_ID },
  });
  console.log("\n=== EVENTOS GERADOS PARA ESTE PEDIDO ===");
  porTipo.forEach((t) => console.log(`${t.eventType}: ${t._count.id}`));

  // E na mesma sessão? (InitiateCheckout normalmente não tem orderId)
  const evento = await prisma.pixelEventLog.findFirst({
    where: { orderId: ORDER_ID },
    select: { sessionId: true },
  });
  if (evento?.sessionId) {
    const daSessao = await prisma.pixelEventLog.groupBy({
      by: ["eventType"],
      _count: { id: true },
      where: { sessionId: evento.sessionId },
    });
    console.log("\n=== EVENTOS DA MESMA SESSÃO ===");
    daSessao.forEach((t) => console.log(`${t.eventType}: ${t._count.id}`));
  } else {
    console.log("\n(evento server-side não tem sessionId — sessão não rastreável)");
  }

  await prisma.$disconnect();
})();
