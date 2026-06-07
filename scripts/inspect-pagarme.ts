// scripts/inspect-pagarme.ts — exploração read-only da estrutura do pagarmeResponse
import { prisma } from "../lib/db";

async function main() {
  const totalCC = await prisma.order.count({
    where: { status: "paid", paymentMethod: "credit_card", createdAt: { gte: new Date("2026-04-01T00:00:00-03:00") } },
  });
  console.log("Pedidos pagos cartão desde 01/04:", totalCC);

  const sample = await prisma.order.findFirst({
    where: { status: "paid", paymentMethod: "credit_card", createdAt: { gte: new Date("2026-04-01T00:00:00-03:00") } },
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, installments: true, pagarmeResponse: true },
  });

  if (!sample) { console.log("Nenhum pedido encontrado."); return; }

  const resp: any = typeof sample.pagarmeResponse === "string" ? JSON.parse(sample.pagarmeResponse) : sample.pagarmeResponse;
  const lt = resp?.charges?.[0]?.last_transaction;
  console.log("\nAmostra:", sample.id, "amount:", sample.amount, "installments(col):", sample.installments);
  console.log("charges[0].last_transaction.installments:", lt?.installments);
  console.log("charges[0].last_transaction.operation_type:", lt?.operation_type);
  console.log("Chaves de last_transaction:", lt ? Object.keys(lt).join(", ") : "n/a");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
