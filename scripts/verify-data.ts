// scripts/verify-data.ts — verificação read-only de integridade pós-migration
import { prisma } from "../lib/db";

(async () => {
  const total = await prisma.order.count();
  const paid = await prisma.order.count({ where: { status: "paid" } });
  const customers = await prisma.customer.count();
  const withGclid = await prisma.order.count({ where: { gclid: { not: null } } });

  console.log("Pedidos totais:", total);
  console.log("Pedidos pagos:", paid);
  console.log("Clientes:", customers);
  console.log("Pedidos com gclid (esperado 0 antes do deploy):", withGclid);

  await prisma.$disconnect();
})();
