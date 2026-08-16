// scripts/check-pixel-growth.ts — crescimento e peso do PixelEventLog (read-only)
import { prisma } from "../lib/db";

(async () => {
  // 1) Volume por mês e por plataforma
  const porMes = await prisma.$queryRawUnsafe<
    { mes: string; plataforma: string; linhas: number; mb: number }[]
  >(`
    SELECT to_char(e."createdAt", 'YYYY-MM') AS mes,
           p.platform AS plataforma,
           COUNT(*)::int AS linhas,
           ROUND(SUM(pg_column_size(e.*))/1048576.0, 1)::float AS mb
    FROM "PixelEventLog" e
    JOIN "PixelConfig" p ON p.id = e."pixelConfigId"
    GROUP BY 1, 2
    ORDER BY 1 DESC, 3 DESC
    LIMIT 14
  `);

  console.log("=== VOLUME POR MÊS / PLATAFORMA ===");
  porMes.forEach((r) =>
    console.log(`${r.mes} | ${r.plataforma.padEnd(11)} | ${String(r.linhas).padStart(7)} linhas | ${r.mb} MB`)
  );

  // 2) Peso por coluna — quais campos realmente pesam
  const colunas = await prisma.$queryRawUnsafe<
    { coluna: string; media_bytes: number; total_mb: number }[]
  >(`
    SELECT * FROM (
      SELECT 'eventData'   AS coluna, ROUND(AVG(pg_column_size("eventData")))::int AS media_bytes,   ROUND(SUM(pg_column_size("eventData"))/1048576.0,1)::float AS total_mb   FROM "PixelEventLog"
      UNION ALL SELECT 'referrer',    ROUND(AVG(pg_column_size("referrer")))::int,    ROUND(SUM(pg_column_size("referrer"))/1048576.0,1)::float    FROM "PixelEventLog"
      UNION ALL SELECT 'landingPage', ROUND(AVG(pg_column_size("landingPage")))::int, ROUND(SUM(pg_column_size("landingPage"))/1048576.0,1)::float FROM "PixelEventLog"
      UNION ALL SELECT 'userAgent',   ROUND(AVG(pg_column_size("userAgent")))::int,   ROUND(SUM(pg_column_size("userAgent"))/1048576.0,1)::float   FROM "PixelEventLog"
      UNION ALL SELECT 'sessionId',   ROUND(AVG(pg_column_size("sessionId")))::int,   ROUND(SUM(pg_column_size("sessionId"))/1048576.0,1)::float   FROM "PixelEventLog"
      UNION ALL SELECT 'campaign',    ROUND(AVG(pg_column_size("campaign")))::int,    ROUND(SUM(pg_column_size("campaign"))/1048576.0,1)::float    FROM "PixelEventLog"
      UNION ALL SELECT 'ipAddress',   ROUND(AVG(pg_column_size("ipAddress")))::int,   ROUND(SUM(pg_column_size("ipAddress"))/1048576.0,1)::float   FROM "PixelEventLog"
    ) t ORDER BY total_mb DESC
  `);

  console.log("\n=== PESO POR COLUNA ===");
  colunas.forEach((c) =>
    console.log(`${c.coluna.padEnd(13)} | média ${String(c.media_bytes).padStart(5)} bytes | total ${c.total_mb} MB`)
  );

  // 3) Distribuição por tipo de evento
  const porTipo = await prisma.pixelEventLog.groupBy({
    by: ["eventType"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("\n=== POR TIPO DE EVENTO ===");
  porTipo.forEach((t) => console.log(`${t.eventType.padEnd(20)} | ${t._count.id}`));

  const total = await prisma.pixelEventLog.count();
  console.log(`\nTotal de eventos: ${total}`);

  await prisma.$disconnect();
})();
