// scripts/check-pixels.ts — quais plataformas de pixel estão ativas
import { prisma } from "../lib/db";

(async () => {
  const grupos = await prisma.pixelConfig.groupBy({
    by: ["platform"],
    _count: { id: true },
    where: { enabled: true },
  });
  console.log("Pixels ATIVOS por plataforma:");
  grupos.forEach((g) => console.log(` - ${g.platform}: ${g._count.id}`));
  if (grupos.length === 0) console.log(" (nenhum)");
  await prisma.$disconnect();
})();
