// scripts/check-evento-origem.ts — de onde veio o evento (navegador ou servidor)?
import { prisma } from "../lib/db";

const ORDER_ID = "cmhx3zfmi0002h10jajtcc482";

(async () => {
  const eventos = await prisma.pixelEventLog.findMany({
    where: { orderId: ORDER_ID },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      eventType: true,
      createdAt: true,
      eventData: true,
      sessionId: true,
      userAgent: true,
      ipAddress: true,
      referrer: true,
      pixelConfig: { select: { platform: true } },
    },
  });

  console.log(`=== EVENTOS DO PEDIDO ${ORDER_ID} (${eventos.length}) ===`);
  for (const e of eventos) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = e.eventData as any;
    const origem = d?.server_side
      ? "SERVIDOR (webhook)"
      : e.userAgent
        ? "NAVEGADOR"
        : "indefinido";
    console.log(`
data......: ${e.createdAt.toISOString()}
tipo......: ${e.eventType} | plataforma: ${e.pixelConfig.platform}
ORIGEM....: ${origem}
sessionId.: ${e.sessionId ?? "—"}
userAgent.: ${(e.userAgent ?? "—").slice(0, 90)}
ip........: ${e.ipAddress ?? "—"}
referrer..: ${(e.referrer ?? "—").slice(0, 90)}`);
  }

  // Houve outros eventos na mesma sessão? (indica navegação real)
  const sess = eventos.find((e) => e.sessionId)?.sessionId;
  if (sess) {
    const mesmaSessao = await prisma.pixelEventLog.findMany({
      where: { sessionId: sess },
      orderBy: { createdAt: "asc" },
      select: { eventType: true, createdAt: true, orderId: true },
    });
    console.log(`\n=== OUTROS EVENTOS DA MESMA SESSÃO (${mesmaSessao.length}) ===`);
    mesmaSessao.forEach((m) =>
      console.log(`${m.createdAt.toISOString()} | ${m.eventType} | order=${m.orderId ?? "—"}`)
    );
  }

  await prisma.$disconnect();
})();
