// scripts/check-data-size.ts — o que mais pesa em tráfego de rede (read-only)
import { prisma } from "../lib/db";

(async () => {
  const tabelas = await prisma.$queryRawUnsafe<
    { tabela: string; total: string; bytes: number }[]
  >(`
    SELECT relname AS tabela,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
           pg_total_relation_size(c.oid)::bigint AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 8
  `);

  console.log("=== MAIORES TABELAS ===");
  tabelas.forEach((t) => console.log(`${t.total.padStart(10)}  ${t.tabela}`));

  // Peso das colunas JSON — são elas que inflam o tráfego por linha
  const json = await prisma.$queryRawUnsafe<
    { coluna: string; media_kb: number; maior_kb: number; total_mb: number }[]
  >(`
    SELECT 'Order.pagarmeResponse' AS coluna,
           ROUND(AVG(pg_column_size("pagarmeResponse"))/1024.0, 1)::float AS media_kb,
           ROUND(MAX(pg_column_size("pagarmeResponse"))/1024.0, 1)::float AS maior_kb,
           ROUND(SUM(pg_column_size("pagarmeResponse"))/1048576.0, 1)::float AS total_mb
    FROM "Order" WHERE "pagarmeResponse" IS NOT NULL
    UNION ALL
    SELECT 'PixelEventLog.eventData',
           ROUND(AVG(pg_column_size("eventData"))/1024.0, 1)::float,
           ROUND(MAX(pg_column_size("eventData"))/1024.0, 1)::float,
           ROUND(SUM(pg_column_size("eventData"))/1048576.0, 1)::float
    FROM "PixelEventLog" WHERE "eventData" IS NOT NULL
  `);

  console.log("\n=== COLUNAS JSON (as que inflam cada linha) ===");
  json.forEach((j) =>
    console.log(
      `${j.coluna.padEnd(26)} média ${String(j.media_kb).padStart(6)} KB | maior ${String(j.maior_kb).padStart(7)} KB | total ${j.total_mb} MB`
    )
  );

  const totalOrders = await prisma.order.count();
  console.log(`\nTotal de pedidos: ${totalOrders}`);

  await prisma.$disconnect();
})();
