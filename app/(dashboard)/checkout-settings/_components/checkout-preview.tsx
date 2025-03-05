"use client";

// app/(dashboard)/checkout-settings/_components/checkout-preview.tsx
import Image from "next/image";
import { CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckoutPreviewProps {
  settings: {
    companyName: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    checkoutTitle: string;
    checkoutDescription: string;
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
  };
}

export function CheckoutPreview({ settings }: CheckoutPreviewProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  // Inline styles based on settings
  const styles = {
    primaryColor: settings.primaryColor,
    secondaryColor: settings.secondaryColor,
    accentColor: settings.accentColor,
  };

  // Simulate product data
  const product = {
    name: "Produto Exemplo",
    description: "Este é um exemplo de produto para visualização do checkout.",
    price: 997.0,
  };

  // Calculate PIX discount if enabled
  const pixDiscount = settings.showPixDiscount
    ? (product.price * settings.pixDiscountPercentage) / 100
    : 0;

  return (
    <div
      className="min-h-full bg-gray-50 flex flex-col"
      style={
        {
          "--primary-color": styles.primaryColor,
          "--secondary-color": styles.secondaryColor,
          "--accent-color": styles.accentColor,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div
        className="relative bg-gradient-to-r from-gray-800 to-gray-900 text-white py-8 px-6"
        style={
          settings.headerBackgroundImage
            ? {
                backgroundImage: `url(${settings.headerBackgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}
        }
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.logoUrl && (
              <div className="h-10 w-10 relative overflow-hidden rounded">
                <Image
                  src={settings.logoUrl}
                  alt={settings.companyName}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <span className="font-bold text-lg">{settings.companyName}</span>
          </div>

          <div className="text-sm opacity-75">Checkout Seguro</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-8 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Checkout Header */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl md:text-3xl font-bold"
              style={{ color: styles.primaryColor }}
            >
              {settings.checkoutTitle}
            </h1>
            <p className="text-gray-500 mt-2">{settings.checkoutDescription}</p>
          </div>

          {/* Checkout Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form */}
            <div className="lg:col-span-7 space-y-6">
              <div
                className="rounded-lg border p-4 shadow-sm bg-white"
                style={{ borderColor: `${styles.secondaryColor}30` }}
              >
                {/* Progress Steps */}
                <div className="flex items-center space-x-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: styles.primaryColor }}
                  >
                    1
                  </div>
                  <div className="font-medium">Informações Pessoais</div>
                </div>

                {/* Form Fields Mockup */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Nome Completo
                      </label>
                      <div className="h-10 rounded border bg-gray-50"></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Email
                      </label>
                      <div className="h-10 rounded border bg-gray-50"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Telefone
                      </label>
                      <div className="h-10 rounded border bg-gray-50"></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        CPF
                      </label>
                      <div className="h-10 rounded border bg-gray-50"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div
                className="rounded-lg border p-4 shadow-sm bg-white"
                style={{ borderColor: `${styles.secondaryColor}30` }}
              >
                <div className="flex items-center space-x-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ backgroundColor: styles.primaryColor }}
                  >
                    2
                  </div>
                  <div className="font-medium">Pagamento</div>
                </div>

                <div className="space-y-4">
                  {/* Payment Tabs */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-gray-100">
                    <div
                      className={cn(
                        "flex items-center justify-center p-2 rounded text-sm",
                        settings.defaultPaymentMethod === "credit_card"
                          ? "bg-white shadow text-gray-900"
                          : "text-gray-600"
                      )}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Cartão
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-center p-2 rounded text-sm",
                        settings.defaultPaymentMethod === "pix"
                          ? "bg-white shadow text-gray-900"
                          : "text-gray-600"
                      )}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      PIX
                    </div>
                  </div>

                  {/* Selected Payment Method */}
                  {settings.defaultPaymentMethod === "credit_card" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Número do Cartão
                        </label>
                        <div className="h-10 rounded border bg-gray-50"></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Validade
                          </label>
                          <div className="h-10 rounded border bg-gray-50"></div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            CVV
                          </label>
                          <div className="h-10 rounded border bg-gray-50"></div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Nome no Cartão
                        </label>
                        <div className="h-10 rounded border bg-gray-50"></div>
                      </div>

                      {settings.showInstallments && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Parcelas
                          </label>
                          <div className="h-10 rounded border bg-gray-50 flex items-center justify-between px-3">
                            <span className="text-sm text-gray-500">
                              {settings.maxInstallments}x de{" "}
                              {formatPrice(
                                product.price / settings.maxInstallments
                              )}
                            </span>
                            <span className="text-gray-400">▼</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm text-gray-500 text-center">
                        Você receberá um QR Code para pagamento após confirmar.
                      </p>
                      {settings.showPixDiscount && pixDiscount > 0 && (
                        <div
                          className="mt-2 p-2 rounded text-sm text-center"
                          style={{
                            backgroundColor: `${styles.accentColor}20`,
                            color: styles.accentColor,
                          }}
                        >
                          Economize {formatPrice(pixDiscount)} pagando com PIX!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Button */}
              <button
                className="w-full py-3 px-4 rounded text-white font-medium"
                style={{ backgroundColor: styles.primaryColor }}
              >
                Finalizar Compra
              </button>

              {/* Terms */}
              <div className="text-xs text-center text-gray-500">
                Ao confirmar sua compra, você concorda com os
                {settings.termsAndConditionsUrl && (
                  <a
                    href="#"
                    className="mx-1 underline"
                    style={{ color: styles.primaryColor }}
                  >
                    Termos de Uso
                  </a>
                )}
                {settings.privacyPolicyUrl &&
                  settings.termsAndConditionsUrl && <span>e</span>}
                {settings.privacyPolicyUrl && (
                  <a
                    href="#"
                    className="mx-1 underline"
                    style={{ color: styles.primaryColor }}
                  >
                    Política de Privacidade
                  </a>
                )}
                {!settings.termsAndConditionsUrl &&
                  !settings.privacyPolicyUrl && (
                    <span className="mx-1">nossos termos e políticas</span>
                  )}
                .
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-5">
              <div
                className="rounded-lg border bg-white shadow-sm"
                style={{ borderColor: `${styles.secondaryColor}30` }}
              >
                <div className="p-4 border-b">
                  <h2 className="font-semibold">Resumo do Pedido</h2>
                </div>

                <div className="p-4 space-y-4">
                  {/* Product */}
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-gray-500">
                        {product.description}
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  {/* Coupon */}
                  <div className="flex gap-2">
                    <div className="flex-1 h-10 rounded border bg-gray-50"></div>
                    <button
                      className="px-4 rounded font-medium"
                      style={{
                        backgroundColor: `${styles.secondaryColor}20`,
                        color: styles.secondaryColor,
                      }}
                    >
                      Aplicar
                    </button>
                  </div>

                  {/* Order Bumps */}
                  {settings.enableOrderBumps && (
                    <>
                      <div className="border-t border-b py-3">
                        <h4 className="text-sm font-medium mb-3">
                          Produtos Complementares
                        </h4>
                        <div
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{
                            backgroundColor: `${styles.secondaryColor}10`,
                          }}
                        >
                          <div className="flex h-5 items-center">
                            <div className="h-4 w-4 rounded border bg-white"></div>
                          </div>
                          <div className="flex-1">
                            <label className="text-sm font-medium cursor-pointer">
                              Produto Complementar Exemplo
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm font-medium">
                                {formatPrice(199)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total</span>
                    <div>
                      <span className="text-2xl font-bold">
                        {settings.defaultPaymentMethod === "pix" &&
                        settings.showPixDiscount
                          ? formatPrice(product.price - pixDiscount)
                          : formatPrice(product.price)}
                      </span>
                    </div>
                  </div>

                  {settings.defaultPaymentMethod === "credit_card" &&
                    settings.showInstallments && (
                      <p className="text-sm text-center text-gray-500">
                        Em {settings.maxInstallments}x de{" "}
                        {formatPrice(product.price / settings.maxInstallments)}
                      </p>
                    )}

                  {/* Security Info */}
                  <div className="pt-4 space-y-2 text-sm text-gray-500">
                    <p className="flex items-center gap-2">
                      <span>🔒</span>
                      Pagamento 100% seguro
                    </p>
                    <p className="flex items-center gap-2">
                      <span>✨</span>
                      Satisfação garantida
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {settings.footerText && (
        <div className="bg-gray-100 py-4 px-6 text-center text-sm text-gray-500">
          {settings.footerText}
        </div>
      )}
    </div>
  );
}
