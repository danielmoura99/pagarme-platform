/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(checkout)/checkout/_components/checkout-content.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutForm } from "./checkout-form";
import { OrderSummary } from "./order-summary";
import { ResponsiveCheckoutBanner } from "./responsive-checkout-banner";
import { SidebarBanner } from "./sidebar-banner";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PixelProvider } from "@/components/tracking/pixel-provider";

// Interface para as configurações dos banners
interface BannerSettings {
  // Banner principal (header)
  headerEnabled: boolean;
  headerDesktopImage: string;
  headerMobileImage: string;
  headerMaxHeight: number;
  headerVerticalAlignment: "top" | "center" | "bottom";

  // Banner lateral (sidebar)
  sidebarEnabled: boolean;
  sidebarImage: string;
}

export default function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">(
    "credit_card"
  );
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
  const affiliateRef = searchParams.get("ref");

  // Estado para armazenar as configurações dos banners
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>({
    headerEnabled: false,
    headerDesktopImage: "",
    headerMobileImage: "",
    headerMaxHeight: 350,
    headerVerticalAlignment: "center",
    sidebarEnabled: false,
    sidebarImage: "",
  });

  const pixelEventData = {
    content_ids: [product?.id],
    content_name: product?.name,
    content_type: "product",
    value: totalAmount / 100,
    currency: "BRL",
  };

  // Efeito para carregar as configurações dos banners
  useEffect(() => {
    const fetchBannerSettings = async () => {
      try {
        const response = await fetch("/api/checkout-settings/banners");
        if (response.ok) {
          const settings = await response.json();
          setBannerSettings({
            // Banner principal
            headerEnabled: settings.headerEnabled ?? false,
            headerDesktopImage: settings.headerBackgroundImage || "",
            headerMobileImage: settings.headerMobileImage || "",
            headerMaxHeight: settings.headerMaxHeight || 350,
            headerVerticalAlignment: settings.headerVerticalAlign || "center",

            // Banner lateral
            sidebarEnabled: settings.sidebarBannerEnabled ?? false,
            sidebarImage: settings.sidebarBannerImage || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações dos banners:", error);
      }
    };

    fetchBannerSettings();
  }, []);

  // Estado para o cupom aplicado
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountPercentage: number;
  } | null>(null);

  // Função para receber o cupom do OrderSummary
  const handleCouponApply = (
    coupon: {
      id: string;
      code: string;
      discountPercentage: number;
    } | null
  ) => {
    console.log("Cupom aplicado no CheckoutContent:", coupon);
    setAppliedCoupon(coupon);
  };

  useEffect(() => {
    const productId = searchParams.get("productId");

    const fetchProduct = async () => {
      if (!productId) {
        router.push("/products");
        return;
      }

      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          router.push("/unavailable");
          return;
        }

        const data = await response.json();
        if (!data || !data.active || !data.prices?.length) {
          router.push("/unavailable");
          return;
        }

        setProduct(data);
        setTotalAmount(data.prices[0].amount);
      } catch (error) {
        console.error("Error fetching product:", error);
        router.push("/unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [searchParams, router]);

  const handleBumpSelection = (bumpId: string, isSelected: boolean) => {
    setSelectedBumps((prev) =>
      isSelected ? [...prev, bumpId] : prev.filter((id) => id !== bumpId)
    );
  };

  useEffect(() => {
    if (product) {
      let total = product.prices[0].amount;

      selectedBumps.forEach((bumpId) => {
        const bump = product.orderBumps?.find((b: any) => b.id === bumpId);
        if (bump) {
          total += bump.prices[0].amount;
        }
      });

      setTotalAmount(total);
    }
  }, [product, selectedBumps]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-[600px] w-full max-w-4xl" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <PixelProvider eventData={pixelEventData}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6">
        {/* Container principal com largura máxima para desktop */}
        <div className="max-w-7xl mx-auto px-4">
          {/* Layout principal - Grid com espaço para sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna principal do checkout */}
            <div className="lg:col-span-8 order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Banner principal responsivo */}
                <ResponsiveCheckoutBanner
                  desktopImageUrl={bannerSettings.headerDesktopImage}
                  mobileImageUrl={bannerSettings.headerMobileImage}
                  alt={`Banner promocional - ${product.name}`}
                  maxHeight={bannerSettings.headerMaxHeight}
                  verticalAlignment={bannerSettings.headerVerticalAlignment}
                  enabled={bannerSettings.headerEnabled}
                />

                <div className="px-4 py-8 lg:py-6">
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                      Finalizar Compra
                    </h1>
                    <p className="text-gray-500 mt-2">
                      Complete suas informações para prosseguir
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Formulário de checkout */}
                    <div className="lg:col-span-7 order-2 lg:order-1 space-y-6">
                      <CheckoutForm
                        product={product}
                        selectedInstallments={selectedInstallments}
                        totalAmount={totalAmount}
                        onPaymentMethodChange={setPaymentMethod}
                        selectedBumps={selectedBumps}
                        affiliateRef={affiliateRef}
                        appliedCoupon={appliedCoupon}
                      />
                    </div>

                    {/* Resumo do pedido */}
                    <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-4">
                      <Suspense
                        fallback={<Skeleton className="h-[400px] w-full" />}
                      >
                        <OrderSummary
                          product={product}
                          paymentMethod={paymentMethod}
                          onInstallmentChange={(installments, amount) => {
                            setSelectedInstallments(installments);
                            setTotalAmount(amount);
                          }}
                          selectedBumps={selectedBumps}
                          onBumpSelect={handleBumpSelection}
                          onCouponApply={handleCouponApply}
                        />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner lateral (apenas desktop) */}
            <div className="lg:col-span-4 order-1 lg:order-2">
              <div className="lg:sticky lg:top-4">
                <SidebarBanner
                  imageUrl={bannerSettings.sidebarImage}
                  alt="Banner lateral promocional"
                  enabled={bannerSettings.sidebarEnabled}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PixelProvider>
  );
}
