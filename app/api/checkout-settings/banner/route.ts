// app/api/checkout-settings/banner/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Buscar as configurações no banco de dados
    const settings = await prisma.checkoutSettings.findFirst({
      where: {
        id: "default", // Assumindo que temos apenas uma configuração global
      },
    });

    if (!settings) {
      // Retornar configurações padrão se não existirem
      return NextResponse.json({
        headerBackgroundImage: "",
        maxHeight: 350,
        verticalAlignment: "center",
        enabled: false, // Desabilitado por padrão se não houver configurações
      });
    }

    // Define tipo para alinhamento vertical
    type VerticalAlignment = "top" | "center" | "bottom";

    // Extrair apenas as configurações relevantes para o banner
    const bannerSettings = {
      headerBackgroundImage: settings.headerBackgroundImage,
      maxHeight: settings.headerMaxHeight || 350,
      verticalAlignment: (settings.headerVerticalAlign ||
        "center") as VerticalAlignment,
      enabled:
        settings.headerEnabled !== undefined
          ? settings.headerEnabled
          : !!settings.headerBackgroundImage,
    };

    return NextResponse.json(bannerSettings);
  } catch (error) {
    console.error("Erro ao buscar configurações do banner:", error);
    return NextResponse.json(
      { error: "Falha ao buscar configurações do banner" },
      { status: 500 }
    );
  }
}

// Endpoint para atualizar as configurações do banner
export async function POST(request: Request) {
  console.log("API: POST /api/checkout-settings/banner - Início");
  try {
    console.log("API: Lendo corpo da requisição");
    const body = await request.json();
    console.log("API: Corpo da requisição:", body);

    console.log("API: Buscando configurações existentes");
    // Buscar as configurações existentes
    const settings = await prisma.checkoutSettings.findFirst({
      where: {
        id: "default",
      },
    });
    console.log(
      "API: Configurações existentes:",
      settings ? "encontradas" : "não encontradas"
    );

    console.log("API: Iniciando upsert no banco de dados");
    // Atualizar as configurações no banco de dados
    const updatedSettings = await prisma.checkoutSettings.upsert({
      where: { id: "default" },
      update: {
        headerBackgroundImage: body.imageUrl,
        headerMaxHeight: body.maxHeight || 350,
        headerVerticalAlign: body.verticalAlignment || "center",
        headerEnabled: body.enabled !== undefined ? body.enabled : true,
      },
      create: {
        id: "default",
        companyName: "PayStep",
        headerBackgroundImage: body.imageUrl,
        headerMaxHeight: body.maxHeight || 350,
        headerVerticalAlign: body.verticalAlignment || "center",
        headerEnabled: body.enabled !== undefined ? body.enabled : true,
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        accentColor: "#3b82f6",
        checkoutTitle: "Finalizar Compra",
        checkoutDescription: "Complete suas informações para prosseguir",
        successMessage: "Pagamento realizado com sucesso!",
      },
    });
    console.log("API: Upsert concluído, configurações atualizadas");

    console.log("API: Enviando resposta de sucesso");
    return NextResponse.json({
      success: true,
      settings: {
        headerBackgroundImage: updatedSettings.headerBackgroundImage,
        maxHeight: updatedSettings.headerMaxHeight || 350,
        verticalAlignment: updatedSettings.headerVerticalAlign || "center",
        enabled:
          updatedSettings.headerEnabled !== undefined
            ? updatedSettings.headerEnabled
            : true,
      },
    });
  } catch (error) {
    console.error("API: Erro ao atualizar configurações:", error);
    return NextResponse.json(
      {
        error: "Falha ao atualizar configurações do banner",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
