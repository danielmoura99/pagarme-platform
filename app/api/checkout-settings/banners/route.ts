// app/api/checkout-settings/banners/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.checkoutSettings.findFirst({
      where: {
        id: "default",
      },
    });

    if (!settings) {
      return NextResponse.json({
        // Banner principal (header)
        headerEnabled: false,
        headerBackgroundImage: "",
        headerMobileImage: "",
        headerMaxHeight: 350,
        headerVerticalAlign: "center",

        // Banner lateral (sidebar)
        sidebarBannerEnabled: false,
        sidebarBannerImage: "",
      });
    }

    return NextResponse.json({
      // Banner principal (header)
      headerEnabled: settings.headerEnabled ?? false,
      headerBackgroundImage: settings.headerBackgroundImage || "",
      headerMobileImage: settings.headerMobileImage || "",
      headerMaxHeight: settings.headerMaxHeight || 350,
      headerVerticalAlign: settings.headerVerticalAlign || "center",

      // Banner lateral (sidebar)
      sidebarBannerEnabled: settings.sidebarBannerEnabled ?? false,
      sidebarBannerImage: settings.sidebarBannerImage || "",
    });
  } catch (error) {
    console.error("Erro ao buscar configurações dos banners:", error);
    return NextResponse.json(
      { error: "Falha ao buscar configurações dos banners" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Atualizando configurações de banners:", body);

    const updatedSettings = await prisma.checkoutSettings.upsert({
      where: { id: "default" },
      update: {
        // Banner principal (header)
        headerEnabled: body.headerEnabled ?? true,
        headerBackgroundImage: body.headerBackgroundImage || "",
        headerMobileImage: body.headerMobileImage || "",
        headerMaxHeight: body.headerMaxHeight || 350,
        headerVerticalAlign: body.headerVerticalAlign || "center",

        // Banner lateral (sidebar)
        sidebarBannerEnabled: body.sidebarBannerEnabled ?? false,
        sidebarBannerImage: body.sidebarBannerImage || "",

        updatedAt: new Date(),
      },
      create: {
        id: "default",
        companyName: "PayStep",

        // Banner principal (header)
        headerEnabled: body.headerEnabled ?? true,
        headerBackgroundImage: body.headerBackgroundImage || "",
        headerMobileImage: body.headerMobileImage || "",
        headerMaxHeight: body.headerMaxHeight || 350,
        headerVerticalAlign: body.headerVerticalAlign || "center",

        // Banner lateral (sidebar)
        sidebarBannerEnabled: body.sidebarBannerEnabled ?? false,
        sidebarBannerImage: body.sidebarBannerImage || "",

        // Campos obrigatórios com valores padrão
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        accentColor: "#3b82f6",
        checkoutTitle: "Finalizar Compra",
        checkoutDescription: "Complete suas informações para prosseguir",
        successMessage: "Pagamento realizado com sucesso!",
      },
    });

    console.log("Configurações salvas:", updatedSettings);

    return NextResponse.json({
      success: true,
      settings: {
        // Banner principal (header)
        headerEnabled: updatedSettings.headerEnabled,
        headerBackgroundImage: updatedSettings.headerBackgroundImage,
        headerMobileImage: updatedSettings.headerMobileImage,
        headerMaxHeight: updatedSettings.headerMaxHeight,
        headerVerticalAlign: updatedSettings.headerVerticalAlign,

        // Banner lateral (sidebar)
        sidebarBannerEnabled: updatedSettings.sidebarBannerEnabled,
        sidebarBannerImage: updatedSettings.sidebarBannerImage,
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar configurações dos banners:", error);
    return NextResponse.json(
      {
        error: "Falha ao atualizar configurações dos banners",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
