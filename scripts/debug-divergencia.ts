import { prisma } from "../lib/db";
(async () => {
  // 1) createdAt e timestamptz ou timestamp?
  const t = await prisma.$queryRawUnsafe<any[]>(`
    SELECT data_type FROM information_schema.columns
    WHERE table_name='Order' AND column_name='createdAt'`);
  console.log("=== Tipo da coluna createdAt ===");
  console.log("  ", t[0].data_type);

  // 2) A conversao de fuso esta indo na direcao certa?
  const c = await prisma.$queryRawUnsafe<any[]>(`
    SELECT "createdAt" AS bruto,
           "createdAt" AT TIME ZONE 'America/Sao_Paulo' AS com_at_time_zone,
           to_char("createdAt" AT TIME ZONE 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') AS formatado
    FROM "Order" WHERE status='paid' ORDER BY "createdAt" DESC LIMIT 2`);
  console.log("\n=== Conversao de fuso ===");
  c.forEach(x => console.log(`  bruto=${x.bruto?.toISOString?.() ?? x.bruto} -> ${x.formatado}`));

  // 3) A regex funciona no Postgres?
  const r = await prisma.$queryRawUnsafe<any[]>(`
    SELECT name,
           (regexp_match(name, '^(Trader\s+(?:DIRETO\s+)?\d+K?)', 'i'))[1] AS agrupado
    FROM "Product" WHERE name ILIKE 'Trader%' LIMIT 5`);
  console.log("\n=== Regex de agrupamento (queryRawUnsafe) ===");
  r.forEach(x => console.log(`  ${x.name.slice(0,34).padEnd(34)} -> ${x.agrupado ?? "NULL"}`));
  await prisma.$disconnect();
})();
