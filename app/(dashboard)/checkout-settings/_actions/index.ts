// app/(dashboard)/checkout-settings/_actions/index.ts
"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Não autorizado");
  }
}

// Sanitiza CSS removendo padrões perigosos (data exfiltration, JS injection, imports externos)
function sanitizeCustomCss(css: string): string {
  return css
    .replace(/url\s*\([^)]*\)/gi, "") // remove url() calls (data exfiltration)
    .replace(/expression\s*\([^)]*\)/gi, "") // remove expression() (IE JS injection)
    .replace(/@import\b[^;]*/gi, "") // remove @import (load external resources)
    .replace(/javascript\s*:/gi, "") // remove javascript: URIs
    .replace(/<\/?script[^>]*>/gi, "") // remove <script> tags se houver
    .trim();
}

// Define o tipo para as configurações do checkout
export interface CheckoutSettings {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  checkoutTitle: string;
  checkoutDescription: string;
  successMessage: string;
  termsAndConditionsUrl?: string;
  privacyPolicyUrl?: string;
  showInstallments: boolean;
  maxInstallments: number;
  showPixDiscount: boolean;
  pixDiscountPercentage: number;
  defaultPaymentMethod: "credit_card" | "pix";
  enableOrderBumps: boolean;
  headerBackgroundImage?: string;
  footerText?: string;
  customCss?: string;
}

// Buscar as configurações do checkout
export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  await requireAdmin();
  try {
    // Busca as configurações do banco de dados
    const settings = await prisma.checkoutSettings.findFirst();

    // Se existir configurações, retorna elas
    if (settings) {
      return {
        companyName: settings.companyName,
        logoUrl: settings.logoUrl || undefined,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        checkoutTitle: settings.checkoutTitle,
        checkoutDescription: settings.checkoutDescription,
        successMessage: settings.successMessage,
        termsAndConditionsUrl: settings.termsAndConditionsUrl || undefined,
        privacyPolicyUrl: settings.privacyPolicyUrl || undefined,
        showInstallments: settings.showInstallments ?? true,
        maxInstallments: settings.maxInstallments ?? 12,
        showPixDiscount: settings.showPixDiscount ?? false,
        pixDiscountPercentage: settings.pixDiscountPercentage ?? 0,
        defaultPaymentMethod:
          (settings.defaultPaymentMethod as "credit_card" | "pix") ??
          "credit_card",
        enableOrderBumps: settings.enableOrderBumps ?? true,
        headerBackgroundImage: settings.headerBackgroundImage || undefined,
        footerText: settings.footerText || undefined,
        customCss: settings.customCss || undefined,
      };
    }

    // Se não existir configurações, retorna valores padrão
    return {
      companyName: "PayStep",
      logoUrl: "",
      primaryColor: "#000000",
      secondaryColor: "#4F46E5",
      accentColor: "#10B981",
      checkoutTitle: "Finalizar Compra",
      checkoutDescription: "Complete suas informações para prosseguir",
      successMessage:
        "Pagamento Confirmado! Seu pedido foi processado com sucesso.",
      termsAndConditionsUrl: "",
      privacyPolicyUrl: "",
      showInstallments: true,
      maxInstallments: 12,
      showPixDiscount: false,
      pixDiscountPercentage: 0,
      defaultPaymentMethod: "credit_card",
      enableOrderBumps: true,
      headerBackgroundImage: "",
      footerText: "© 2024 PayStep. Todos os direitos reservados.",
      customCss: "",
    };
  } catch (error) {
    console.error("[GET_CHECKOUT_SETTINGS_ERROR]", error);

    // Em caso de erro, também retorna valores padrão
    return {
      companyName: "PayStep",
      logoUrl: "",
      primaryColor: "#000000",
      secondaryColor: "#4F46E5",
      accentColor: "#10B981",
      checkoutTitle: "Finalizar Compra",
      checkoutDescription: "Complete suas informações para prosseguir",
      successMessage:
        "Pagamento Confirmado! Seu pedido foi processado com sucesso.",
      termsAndConditionsUrl: "",
      privacyPolicyUrl: "",
      showInstallments: true,
      maxInstallments: 12,
      showPixDiscount: false,
      pixDiscountPercentage: 0,
      defaultPaymentMethod: "credit_card",
      enableOrderBumps: true,
      headerBackgroundImage: "",
      footerText: "© 2024 PayStep. Todos os direitos reservados.",
      customCss: "",
    };
  }
}

// Atualizar as configurações do checkout
export async function updateCheckoutSettings(data: CheckoutSettings) {
  await requireAdmin();
  // Sanitizar CSS antes de salvar
  if (data.customCss) {
    data.customCss = sanitizeCustomCss(data.customCss);
  }
  try {
    // Verifica se já existe configurações
    const existingSettings = await prisma.checkoutSettings.findFirst();

    if (existingSettings) {
      // Atualiza as configurações existentes
      await prisma.checkoutSettings.update({
        where: { id: existingSettings.id },
        data: {
          companyName: data.companyName,
          logoUrl: data.logoUrl,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          accentColor: data.accentColor,
          checkoutTitle: data.checkoutTitle,
          checkoutDescription: data.checkoutDescription,
          successMessage: data.successMessage,
          termsAndConditionsUrl: data.termsAndConditionsUrl,
          privacyPolicyUrl: data.privacyPolicyUrl,
          showInstallments: data.showInstallments,
          maxInstallments: data.maxInstallments,
          showPixDiscount: data.showPixDiscount,
          pixDiscountPercentage: data.pixDiscountPercentage,
          defaultPaymentMethod: data.defaultPaymentMethod,
          enableOrderBumps: data.enableOrderBumps,
          headerBackgroundImage: data.headerBackgroundImage,
          footerText: data.footerText,
          customCss: data.customCss,
          updatedAt: new Date(),
        },
      });
    } else {
      // Cria novas configurações
      await prisma.checkoutSettings.create({
        data: {
          companyName: data.companyName,
          logoUrl: data.logoUrl,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          accentColor: data.accentColor,
          checkoutTitle: data.checkoutTitle,
          checkoutDescription: data.checkoutDescription,
          successMessage: data.successMessage,
          termsAndConditionsUrl: data.termsAndConditionsUrl,
          privacyPolicyUrl: data.privacyPolicyUrl,
          showInstallments: data.showInstallments,
          maxInstallments: data.maxInstallments,
          showPixDiscount: data.showPixDiscount,
          pixDiscountPercentage: data.pixDiscountPercentage,
          defaultPaymentMethod: data.defaultPaymentMethod,
          enableOrderBumps: data.enableOrderBumps,
          headerBackgroundImage: data.headerBackgroundImage,
          footerText: data.footerText,
          customCss: data.customCss,
        },
      });
    }

    // Revalida o caminho para atualizar os dados na interface
    revalidatePath("/checkout-settings");

    return { success: true };
  } catch (error) {
    console.error("[UPDATE_CHECKOUT_SETTINGS_ERROR]", error);
    throw new Error("Falha ao atualizar configurações do checkout");
  }
}
