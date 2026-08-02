// scripts/test-google-upload.ts
// Testa se o upload de conversões (Parte A) está liberado, SEM criar conversão real.
//
// Envia um gclid propositalmente inválido. A resposta separa os cenários:
//   - erro sobre o GCLID  -> permissão de escrita OK (só o dado era falso)
//   - erro de PERMISSION  -> nível do token não cobre escrita (precisa do Basic)
//   - erro de CONVERSION  -> o ID da ação de conversão está errado
import { prisma } from "../lib/db";
import { ingestConversionEvent } from "../lib/tracking/google-ads-api";

// gclid do anúncio real que você abriu — formato válido, então o teste
// exercita o caminho de verdade. Com validateOnly nada é registrado.
const GCLID_TESTE =
  "Cj0KCQjwg5zTBhCLARIsAP2AFU5Bq69cJYSu2N2w3hTM_k2eMlnLuCx8hoRycGJexfp0UPU2glMlmCIaAoYVEALw_wcB";

(async () => {
  const cfg = await prisma.googleAdsConfig.findFirst();

  if (!cfg?.developerToken || !cfg.clientId || !cfg.clientSecret || !cfg.refreshToken || !cfg.customerId) {
    console.log("❌ Credenciais incompletas em Integrações → Google Ads");
    await prisma.$disconnect();
    return;
  }
  if (!cfg.conversionActionId) {
    console.log("❌ ID da Ação de Conversão não configurado");
    await prisma.$disconnect();
    return;
  }

  console.log("Data Manager API — modo validateOnly (não registra conversão)");
  console.log("customerId:", cfg.customerId, "| conversionActionId:", cfg.conversionActionId);
  console.log("loginCustomerId:", cfg.loginCustomerId || "(não configurado)");
  console.log("");

  const r = await ingestConversionEvent(
    {
      developerToken: cfg.developerToken,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      refreshToken: cfg.refreshToken,
      customerId: cfg.customerId,
      loginCustomerId: cfg.loginCustomerId,
      conversionActionId: cfg.conversionActionId,
    },
    {
      gclid: GCLID_TESTE,
      conversionDateTime: new Date(),
      conversionValue: 1,
      currencyCode: "BRL",
      orderId: "TESTE-" + Date.now(),
    },
    true // validateOnly
  );

  const texto = JSON.stringify(r).toUpperCase();
  console.log("Resposta bruta:", JSON.stringify(r, null, 2).slice(0, 1200));
  console.log("\n=== DIAGNÓSTICO ===");

  // A ordem importa: mensagens de depreciação/permissão contêm a palavra
  // "click" e seriam classificadas como erro de gclid se checadas depois.
  if (r.success) {
    console.log("✅ PAYLOAD VÁLIDO — a Data Manager API aceitou o evento.");
    console.log("   A Parte A está pronta: vendas reais com gclid serão enviadas.");
  } else if (/SERVICE_DISABLED|HAS NOT BEEN USED IN PROJECT/.test(texto)) {
    console.log("🔌 API NÃO ATIVADA no projeto do Google Cloud.");
    console.log("   Ative a Data Manager API no projeto e aguarde ~2 minutos:");
    console.log("   https://console.cloud.google.com/apis/library/datamanager.googleapis.com");
    console.log("   (O escopo OAuth já está correto — este é outro passo.)");
  } else if (/ACCESS_TOKEN_SCOPE_INSUFFICIENT|INSUFFICIENT AUTHENTICATION SCOPES/.test(texto)) {
    console.log("🔑 ESCOPO OAUTH INSUFICIENTE — o refresh token atual não cobre a Data Manager API.");
    console.log("   Gere um novo refresh token incluindo:");
    console.log("   https://www.googleapis.com/auth/datamanager");
  } else if (/DATA MANAGER|LIMITED TO EXISTING|NEW INTEGRATIONS/.test(texto)) {
    console.log("⛔ ENDPOINT DESCONTINUADO — o ConversionUploadService não aceita integrações novas.");
    console.log("   É preciso migrar para a Data Manager API. Aguardar o Basic Access NÃO resolve.");
  } else if (/PERMISSION|DEVELOPER_TOKEN|NOT_ADAPTED|UNAUTHOR|ACCESS/.test(texto)) {
    console.log("❌ SEM PERMISSÃO DE ESCRITA — o nível atual do token não cobre upload.");
    console.log("   É preciso aguardar o Basic Access.");
  } else if (/INVALID_ARGUMENT|INVALID JSON PAYLOAD|UNKNOWN NAME|CANNOT FIND FIELD/.test(texto)) {
    console.log("🧩 ESTRUTURA DO PAYLOAD — autenticação e API estão OK.");
    console.log("   O erro acima aponta o campo exato a corrigir.");
  } else if (/CONVERSION_ACTION/.test(texto)) {
    console.log("❌ AÇÃO DE CONVERSÃO INVÁLIDA — confira o ID e se o tipo é 'upload de cliques'.");
  } else if (/GCLID|NOT_FOUND|EXPIRED/.test(texto)) {
    console.log("✅ PERMISSÃO DE ESCRITA OK — o erro foi sobre o gclid falso, como esperado.");
    console.log("   A Parte A está pronta: vendas reais com gclid serão enviadas.");
  } else {
    console.log("❓ Erro não classificado — veja a resposta bruta acima.");
  }

  await prisma.$disconnect();
})();
