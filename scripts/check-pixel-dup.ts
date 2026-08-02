// scripts/check-pixel-dup.ts — investiga duplicação e atribuição em PixelEventLog
import { prisma } from "../lib/db";

const PRODUCT_ID = "cm7w0gb1b0005mrzkm3rod259";

(async () => {
  // 1) Quantos pixels o produto tem?
  const pixels = await prisma.pixelConfig.findMany({
    where: { productId: PRODUCT_ID },
    select: { id: true, platform: true, enabled: true },
  });
  console.log("=== PIXELS DO PRODUTO ===");
  pixels.forEach((p) =>
    console.log(`- ${p.platform} | enabled: ${p.enabled} | ${p.id}`)
  );

  // 2) Purchases recentes: quantas linhas por orderId?
  const recent = await prisma.pixelEventLog.findMany({
    where: { eventType: "Purchase", orderId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      orderId: true,
      source: true,
      medium: true,
      pixelConfig: { select: { platform: true } },
    },
  });

  const porPedido = new Map<string, { plataformas: string[]; source: string | null; medium: string | null }>();
  for (const e of recent) {
    const k = e.orderId!;
    const atual = porPedido.get(k) ?? { plataformas: [], source: e.source, medium: e.medium };
    atual.plataformas.push(e.pixelConfig.platform);
    porPedido.set(k, atual);
  }

  console.log("\n=== LINHAS DE 'Purchase' POR PEDIDO (últimos 40 eventos) ===");
  for (const [orderId, v] of porPedido) {
    const flag = v.plataformas.length > 1 ? "⚠️ MÚLTIPLAS" : "  ";
    console.log(
      `${flag} ${orderId.slice(0, 12)} | ${v.plataformas.length}x [${v.plataformas.join(", ")}] | source=${v.source} medium=${v.medium}`
    );
  }

  // 3) Quantos eventos têm auto-referência (nosso próprio domínio como fonte)?
  const selfRef = await prisma.pixelEventLog.count({
    where: {
      eventType: "Purchase",
      OR: [
        { source: { contains: "checkout.tradershouse" } },
        { source: { contains: "thprop" } },
      ],
    },
  });
  const totalPurchase = await prisma.pixelEventLog.count({ where: { eventType: "Purchase" } });
  console.log(
    `\n=== AUTO-REFERÊNCIA ===\n${selfRef} de ${totalPurchase} eventos 'Purchase' têm nosso próprio domínio como fonte`
  );

  await prisma.$disconnect();
})();
