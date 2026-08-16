// scripts/check-venda-anomala.ts — investiga a venda que não apareceu no dash
import { prisma } from "../lib/db";

const EMAIL = "fabiofedomingues@icloud.com";

(async () => {
  const orders = await prisma.order.findMany({
    where: { customer: { email: EMAIL } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      amount: true,
      paymentMethod: true,
      createdAt: true,
      pagarmeTransactionId: true,
      checkoutId: true,
      utmSource: true,
      landingPage: true,
      items: {
        select: {
          price: true,
          product: {
            select: { id: true, name: true, active: true, productType: true },
          },
        },
      },
    },
  });

  console.log(`=== PEDIDOS DE ${EMAIL} (${orders.length}) ===`);
  for (const o of orders) {
    const p = o.items[0]?.product;
    console.log(`
id................: ${o.id}
criado............: ${o.createdAt.toISOString()}
status............: ${o.status}
valor.............: R$ ${(o.amount / 100).toFixed(2)}
método............: ${o.paymentMethod}
pagarmeTransaction: ${o.pagarmeTransactionId ?? "NENHUM  ← não passou pelo gateway"}
checkoutId........: ${o.checkoutId ?? "—"}
origem............: ${o.utmSource ?? "—"}
landingPage.......: ${o.landingPage ?? "—"}
produto...........: ${p?.name} | ativo: ${p?.active} | id: ${p?.id}`);
  }

  // O produto "Black 1M" está ativo e com preço?
  const produto = await prisma.product.findFirst({
    where: { name: { contains: "Black 1M" } },
    select: {
      id: true,
      name: true,
      active: true,
      prices: { select: { amount: true, active: true, createdAt: true } },
    },
  });
  console.log("\n=== PRODUTO 'Black 1M' ===");
  if (produto) {
    console.log(`id: ${produto.id} | ativo: ${produto.active}`);
    produto.prices.forEach((p) =>
      console.log(`  preço: R$ ${(p.amount / 100).toFixed(2)} | ativo: ${p.active}`)
    );
  } else {
    console.log("não encontrado");
  }

  await prisma.$disconnect();
})();
