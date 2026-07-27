// scripts/inspect-failed-order.ts — leitura do motivo real da falha (read-only)
import { prisma } from "../lib/db";

const TX_ID = process.argv[2] || "or_Ay0rqaNIXqhAr3jz";

(async () => {
  const order = await prisma.order.findFirst({
    where: { pagarmeTransactionId: TX_ID },
    select: {
      id: true,
      status: true,
      amount: true,
      installments: true,
      failureReason: true,
      failureCode: true,
      splitAmount: true,
      affiliateId: true,
      pagarmeResponse: true,
      createdAt: true,
    },
  });

  if (!order) {
    console.log("Pedido não encontrado para", TX_ID);
    await prisma.$disconnect();
    return;
  }

  console.log("=== PEDIDO ===");
  console.log("id:", order.id, "| status:", order.status, "| amount:", order.amount);
  console.log("failureReason:", order.failureReason);
  console.log("failureCode:", order.failureCode);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp: any =
    typeof order.pagarmeResponse === "string"
      ? JSON.parse(order.pagarmeResponse)
      : order.pagarmeResponse;

  const charges = resp?.charges ?? [];
  console.log("\n=== CHARGES:", charges.length, "===");

  for (const c of charges) {
    console.log("- charge:", c.id, "| status:", c.status);
    const lt = c.last_transaction;
    if (!lt) continue;
    console.log("  gateway_response.code:", lt.gateway_response?.code);
    console.log("  gateway_response.errors:", JSON.stringify(lt.gateway_response?.errors));
    console.log("  acquirer_message:", lt.acquirer_message);
    console.log("  acquirer_return_code:", lt.acquirer_return_code);
    console.log("  status:", lt.status, "| success:", lt.success);
    if (lt.split) console.log("  SPLIT na transacao:", JSON.stringify(lt.split, null, 2));
    if (c.split) console.log("  SPLIT na charge:", JSON.stringify(c.split, null, 2));
  }

  await prisma.$disconnect();
})();
