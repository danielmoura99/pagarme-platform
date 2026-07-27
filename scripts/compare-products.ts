// scripts/compare-products.ts — compara os produtos das transações (read-only)
import { prisma } from "../lib/db";

const IDS = [
  "cm6zo5pc80005vyhknxfq58hm", // aceito pela Pagar.me (recusado pelo emissor)
  "cm6zngjgn0000vymo3o898704", // REJEITADO na validação
];

(async () => {
  for (const id of IDS) {
    const p = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        productType: true,
        courseId: true,
        orderBumps: { select: { bumpProductId: true, active: true } },
      },
    });
    console.log("=================================");
    if (!p) {
      console.log(id, "-> não encontrado");
      continue;
    }
    console.log("id:", p.id);
    console.log("name:", JSON.stringify(p.name), "| len:", p.name.length);
    console.log("productType:", p.productType, "| courseId:", p.courseId);
    console.log("description len:", p.description?.length ?? 0);
    console.log("description:", JSON.stringify(p.description ?? "").slice(0, 500));
    console.log("orderBumps:", p.orderBumps.length);
  }
  await prisma.$disconnect();
})();
