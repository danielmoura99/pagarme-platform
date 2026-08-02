// scripts/check-columns.ts
// Confere se todo o schema adicionado nesta fase existe no banco (read-only).
import { prisma } from "../lib/db";

// tabela -> colunas que precisam existir
const EXPECTED: Record<string, string[]> = {
  // Rastreamento de origem no pedido
  Order: [
    "gclid",
    "gbraid",
    "wbraid",
    "gadCampaignId",
    "fbp",
    "fbc",
    "installments",
  ],
  // Meta Conversions API (token centralizado)
  facebook_ads_config: ["capiAccessToken", "capiTestEventCode"],
  // Google Ads — credenciais e sincronização
  google_ads_config: [
    "developerToken",
    "clientId",
    "clientSecret",
    "refreshToken",
    "customerId",
    "loginCustomerId",
    "conversionActionId",
    "enabled",
    "lastUploadAt",
    "lastSyncAt",
  ],
  google_ads_campaign_data: [
    "campaignId",
    "campaignName",
    "dateStart",
    "cost",
    "purchases",
    "revenue",
    "roas",
  ],
  google_ads_sync_log: ["configId", "status", "campaigns", "duration"],
};

(async () => {
  let problemas = 0;

  for (const [table, columns] of Object.entries(EXPECTED)) {
    const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `select column_name from information_schema.columns where table_name = $1`,
      table
    );

    if (rows.length === 0) {
      console.log(`❌ ${table} — TABELA NÃO EXISTE`);
      problemas++;
      continue;
    }

    const found = new Set(rows.map((r) => r.column_name));
    const missing = columns.filter((c) => !found.has(c));

    if (missing.length === 0) {
      console.log(`✅ ${table} — ${columns.length} colunas OK`);
    } else {
      console.log(`❌ ${table} — FALTANDO: ${missing.join(", ")}`);
      problemas++;
    }
  }

  console.log(
    problemas === 0
      ? "\n✅ Banco completo — nada faltando."
      : `\n⚠️  ${problemas} problema(s). Rode: npx prisma db push`
  );

  await prisma.$disconnect();
})();
