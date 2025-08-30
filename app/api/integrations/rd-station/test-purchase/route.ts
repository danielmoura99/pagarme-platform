// app/api/integrations/rd-station/test-purchase/route.ts
import { NextResponse } from "next/server";
import { sendPurchaseToRDStation } from "@/lib/rd-station-auto-sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      email, 
      name = "Cliente Teste", 
      phone = "11999999999", 
      amount = 19990, // R$ 199,90 em centavos
      productName = "Produto Teste",
      // Opcional: simular UTMs
      simulateUtms = false,
      utmSource = "google",
      utmMedium = "cpc", 
      utmCampaign = "campanha_teste",
      utmTerm = "produto digital",
      utmContent = "anuncio_teste"
    } = body;

    // Validação básica
    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório para o teste" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Email deve ter formato válido" },
        { status: 400 }
      );
    }

    console.log("[RD_STATION_TEST_PURCHASE] Iniciando teste com dados:", {
      email,
      name,
      phone,
      amount,
      productName,
      simulateUtms
    });

    // Gerar um ID de ordem fictício para teste
    const testOrderId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Se solicitado, criar um pixel event fictício com UTMs para teste
    if (simulateUtms) {
      try {
        const { prisma } = await import("@/lib/db");
        
        await prisma.pixelEventLog.create({
          data: {
            pixelConfigId: "test-config",
            eventType: "Purchase",
            eventData: {
              email,
              name,
              phone,
              value: amount / 100,
              currency: "BRL",
              orderId: testOrderId
            },
            source: utmSource,
            medium: utmMedium,
            campaign: utmCampaign,
            term: utmTerm,
            content: utmContent,
            referrer: "https://google.com/search",
            landingPage: "https://seusite.com/produto",
            sessionId: `test_session_${Date.now()}`,
            userAgent: "Mozilla/5.0 (Test User Agent)",
            ipAddress: "127.0.0.1"
          }
        });

        console.log("[RD_STATION_TEST_PURCHASE] Pixel event fictício criado com UTMs");
      } catch (error) {
        console.warn("[RD_STATION_TEST_PURCHASE] Erro ao criar pixel event fictício:", error);
      }
    }

    // Chamar função de envio para RD Station
    const result = await sendPurchaseToRDStation({
      email,
      name,
      phone,
      orderId: testOrderId,
      amount,
      productName,
    });

    console.log("[RD_STATION_TEST_PURCHASE] Resultado:", result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Lead enviado com sucesso para RD Station!",
        details: {
          testOrderId,
          email,
          name,
          amount: amount / 100, // Mostrar em reais
          rdStationResponse: result.response
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Falha no envio para RD Station",
        error: result.error || result.reason,
        details: {
          testOrderId,
          email,
          configured: result.reason !== "not_configured",
          hasCredentials: result.reason !== "invalid_credentials"
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error("[RD_STATION_TEST_PURCHASE_ERROR]", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Erro interno durante o teste",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}

// Endpoint GET para testar sem dados específicos (usar dados padrão)
export async function GET() {
  try {
    console.log("[RD_STATION_TEST_PURCHASE] Teste GET com dados padrão");

    const testEmail = `teste_${Date.now()}@exemplo.com`;
    const testOrderId = `test_get_${Date.now()}`;

    const result = await sendPurchaseToRDStation({
      email: testEmail,
      name: "Cliente Teste GET",
      phone: "11987654321",
      orderId: testOrderId,
      amount: 29990, // R$ 299,90
      productName: "Produto Teste GET",
    });

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? "Teste GET enviado com sucesso!" 
        : "Falha no teste GET",
      testData: {
        email: testEmail,
        orderId: testOrderId,
        amount: 299.90
      },
      rdStationResult: result
    });

  } catch (error) {
    console.error("[RD_STATION_TEST_PURCHASE_GET_ERROR]", error);
    return NextResponse.json(
      { 
        error: "Erro no teste GET",
        message: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}