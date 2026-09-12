import { prisma } from "../lib/db";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
const TZ = "America/Sao_Paulo";
(async () => {
  const [cy, cm] = formatInTimeZone(new Date(), TZ, "yyyy-MM").split("-").map(Number);
  let y = cy, m = cm - 11; while (m <= 0) { m += 12; y -= 1; }
  const ini = fromZonedTime(`${y}-${String(m).padStart(2,"0")}-01T00:00:00`, TZ).toISOString();
  const fim = new Date().toISOString();

  const t0 = Date.now();
  const porMes = await prisma.$queryRaw<any[]>`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') AS mes,
           COUNT(*)::int AS v, COALESCE(SUM(amount),0)::bigint AS r
    FROM "Order" WHERE status='paid' AND "createdAt" >= ${ini}::timestamp AND "createdAt" <= ${fim}::timestamp GROUP BY 1`;
  const prod = await prisma.$queryRaw<any[]>`
    SELECT p.name, SUM(oi.quantity)::int AS q, COALESCE(SUM(oi.price*oi.quantity),0)::bigint AS r
    FROM "Order" o JOIN "OrderItem" oi ON oi."orderId"=o.id JOIN "Product" p ON p.id=oi."productId"
    WHERE o.status='paid' AND o."createdAt" >= ${ini}::timestamp AND o."createdAt" <= ${fim}::timestamp GROUP BY p.name`;
  const af = await prisma.$queryRaw<any[]>`
    SELECT a.id, u.name, u.email, COALESCE(SUM(o.amount),0)::bigint AS r, COUNT(*)::int AS v
    FROM "Order" o JOIN "Affiliate" a ON a.id=o."affiliateId" JOIN "User" u ON u.id=a."userId"
    WHERE o.status='paid' AND o."createdAt" >= ${ini}::timestamp AND o."createdAt" <= ${fim}::timestamp
    GROUP BY a.id,u.name,u.email ORDER BY r DESC LIMIT 10`;
  const afMes = await prisma.$queryRaw<any[]>`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo','YYYY-MM') AS mes,
           ("affiliateId" IS NOT NULL) AS ca, COUNT(*)::int AS v, COALESCE(SUM(amount),0)::bigint AS r
    FROM "Order" WHERE status='paid' AND "createdAt" >= ${ini}::timestamp AND "createdAt" <= ${fim}::timestamp GROUP BY 1,2`;
  const ms = Date.now() - t0;

  const linhas = porMes.length + prod.length + af.length + afMes.length;
  const bytes = Buffer.byteLength(JSON.stringify([porMes, prod, af, afMes], (_k, v) => typeof v === "bigint" ? Number(v) : v), "utf8");
  console.log(`  ${linhas} linhas do banco | ${(bytes/1024).toFixed(1)} KB | ${ms}ms`);
  console.log(`\n  ANTES: ~3349 pedidos com joins, ~1 MB por chamada x 6 chamadas = ~6 MB`);
  console.log(`  AGORA: ${(bytes/1024).toFixed(1)} KB x 1 chamada`);
  console.log(`  reducao: ~${(100 - (bytes/1024)/(6*1024)*100).toFixed(1)}%`);
  await prisma.$disconnect();
})();
