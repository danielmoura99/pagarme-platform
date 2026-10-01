// Apply ONLY the additive monitoring tables. Do not run unrelated pending migrations.
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "../prisma/migrations/20260930120000_add_db_monitoring/migration.sql"), "utf8");
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '5000ms'");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
  }, { timeout: 15000 });
  console.log("Monitoring tables ready. No application data changed.");
}
main().catch(() => { console.error("Could not create monitoring tables. Check database connectivity and permissions."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
