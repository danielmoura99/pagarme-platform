// scripts/inspect-recipients.ts — consulta o estado atual dos recebedores (read-only)
import fs from "fs";
import path from "path";

function loadEnv() {
  const env: Record<string, string> = {};
  for (const line of fs
    .readFileSync(path.resolve(__dirname, "../.env"), "utf-8")
    .split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

(async () => {
  const env = loadEnv();
  const key = env.PAGARME_SECRET_KEY;
  if (!key) {
    console.log("PAGARME_SECRET_KEY não encontrada no .env");
    return;
  }

  const base = env.PAGARME_API_URL || "https://api.pagar.me/core/v5";
  const auth = `Basic ${Buffer.from(`${key}:`).toString("base64")}`;

  const ids = [
    env.PAGARME_MAIN_RECIPIENT_ID || "re_cm76ouupy0m040l9tkyr52ckx",
    "re_cm7507gur0edm0m9tyhvy30xk", // afiliado da transação que falhou
  ];

  for (const id of ids) {
    console.log("=================================");
    try {
      const res = await fetch(`${base}/recipients/${id}`, {
        headers: { Authorization: auth },
      });
      const text = await res.text();
      if (!res.ok) {
        console.log(id, "-> HTTP", res.status, text.slice(0, 300));
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = JSON.parse(text);
      console.log("id:", r.id, "|", r.name);
      console.log("status:", r.status, "| type:", r.type, "| doc:", r.document);
      console.log("payment_mode:", r.payment_mode);

      const acc = r.default_bank_account;
      if (acc) {
        console.log(
          "conta: banco", acc.bank,
          "| ag", acc.branch_number,
          "| cc", acc.account_number,
          "| status:", acc.status ?? "-"
        );
        console.log("titular:", acc.holder_name, "| doc:", acc.holder_document);
      } else {
        console.log("⚠️  SEM conta bancária padrão");
      }

      if (r.transfer_settings) {
        console.log("transfer_settings:", JSON.stringify(r.transfer_settings));
      }
      if (r.register_information) {
        console.log("register_information.status:", r.register_information.status ?? "-");
      }
      if (r.gateway_recipients) {
        console.log("gateway_recipients:", JSON.stringify(r.gateway_recipients));
      }
    } catch (e) {
      console.log(id, "-> ERRO:", e instanceof Error ? e.message : e);
    }
  }
})();
