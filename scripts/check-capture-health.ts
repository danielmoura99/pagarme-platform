// scripts/check-capture-health.ts — a captura está funcionando desde o deploy?
import { prisma } from "../lib/db";

(async () => {
  // Existe ALGUM pedido com gclid ou gadCampaignId?
  const comGclid = await prisma.order.findFirst({
    where: { gclid: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, gclid: true, utmSource: true },
  });
  const comGad = await prisma.order.count({ where: { gadCampaignId: { not: null } } });
  const comFbc = await prisma.order.count({ where: { fbc: { not: null } } });

  console.log("=== CAPTURA DE CLICK IDS (histórico completo) ===");
  console.log("Pedidos com gclid:", await prisma.order.count({ where: { gclid: { not: null } } }));
  console.log("Pedidos com gadCampaignId:", comGad);
  console.log("Pedidos com fbc:", comFbc);
  console.log(
    "Mais recente com gclid:",
    comGclid ? `${comGclid.createdAt.toISOString()} (utm=${comGclid.utmSource})` : "NENHUM"
  );

  // Últimos 20 pedidos pagos: o que foi capturado?
  const recentes = await prisma.order.findMany({
    where: { status: "paid" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      createdAt: true,
      utmSource: true,
      utmCampaign: true,
      gclid: true,
      gadCampaignId: true,
      landingPage: true,
    },
  });

  console.log("\n=== ÚLTIMOS 20 PEDIDOS PAGOS ===");
  for (const o of recentes) {
    const d = o.createdAt.toISOString().slice(0, 16).replace("T", " ");
    console.log(
      `${d} | utm=${(o.utmSource ?? "—").padEnd(10).slice(0, 10)} | gclid=${o.gclid ? "SIM" : "—"} | gad=${o.gadCampaignId ? "SIM" : "—"} | landing=${(o.landingPage ?? "—").slice(0, 45)}`
    );
  }

  await prisma.$disconnect();
})();
