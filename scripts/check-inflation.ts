// scripts/check-inflation.ts — os relatórios estão contando checkouts em dobro?
import { prisma } from "../lib/db";

(async () => {
  const r = await prisma.$queryRawUnsafe<
    { mes: string; linhas: number; sessoes: number; fator: number }[]
  >(`
    SELECT to_char("createdAt", 'YYYY-MM') AS mes,
           COUNT(*)::int AS linhas,
           COUNT(DISTINCT "sessionId")::int AS sessoes,
           ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT "sessionId"),0), 2)::float AS fator
    FROM "PixelEventLog"
    WHERE "eventType" = 'InitiateCheckout'
    GROUP BY 1 ORDER BY 1 DESC LIMIT 5
  `);

  console.log("=== InitiateCheckout: linhas vs sessões únicas ===");
  r.forEach((x) =>
    console.log(`${x.mes} | ${String(x.linhas).padStart(6)} linhas | ${String(x.sessoes).padStart(6)} sessões | fator ${x.fator}x`)
  );

  // landingPage é sempre a mesma URL inútil?
  const lp = await prisma.$queryRawUnsafe<{ dominio: string; n: number }[]>(`
    SELECT split_part(split_part("landingPage",'//',2),'/',1) AS dominio, COUNT(*)::int AS n
    FROM "PixelEventLog" WHERE "landingPage" IS NOT NULL
    GROUP BY 1 ORDER BY 2 DESC LIMIT 5
  `);
  console.log("\n=== landingPage: quais domínios? ===");
  lp.forEach((x) => console.log(`${String(x.n).padStart(6)} | ${x.dominio}`));

  await prisma.$disconnect();
})();
