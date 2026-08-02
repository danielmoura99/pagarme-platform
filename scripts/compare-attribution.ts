// scripts/compare-attribution.ts
// Compara a atribuição gravada no Order (checkout) com a do PixelEventLog (navegador).
import { prisma } from "../lib/db";

(async () => {
  const eventos = await prisma.pixelEventLog.findMany({
    where: { eventType: "Purchase", orderId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { orderId: true, source: true, campaign: true, eventData: true },
  });

  const ids = eventos.map((e) => e.orderId!) as string[];
  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      utmSource: true,
      utmCampaign: true,
      gclid: true,
      gadCampaignId: true,
    },
  });
  const mapa = new Map(orders.map((o) => [o.id, o]));

  let orderOk = 0;
  let pixelOk = 0;
  let comGclid = 0;

  console.log("ORDER (checkout)          | PIXEL (navegador)");
  console.log("-".repeat(78));

  for (const e of eventos) {
    const o = mapa.get(e.orderId!);
    if (!o) continue;

    const oSrc = o.utmSource ?? "—";
    const pSrc = e.source ?? "—";
    const bomOrder = !!o.utmSource && !o.utmSource.includes("tradershouse") && o.utmSource !== "localhost";
    const bomPixel = !!e.source && !e.source.includes("tradershouse") && e.source !== "localhost";
    if (bomOrder) orderOk++;
    if (bomPixel) pixelOk++;
    if (o.gclid) comGclid++;

    console.log(
      `${(bomOrder ? "✅" : "❌")} ${oSrc.padEnd(22).slice(0, 22)} | ${(bomPixel ? "✅" : "❌")} ${pSrc.slice(0, 30)}`
    );
  }

  const t = eventos.length;
  console.log("-".repeat(78));
  console.log(`Order  com origem aproveitável: ${orderOk}/${t}`);
  console.log(`Pixel  com origem aproveitável: ${pixelOk}/${t}`);
  console.log(`Order  com gclid capturado:     ${comGclid}/${t}`);

  await prisma.$disconnect();
})();
