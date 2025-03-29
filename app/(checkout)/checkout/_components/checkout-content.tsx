/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(checkout)/checkout/_components/checkout-content.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutForm } from "./checkout-form";
import { OrderSummary } from "./order-summary";
import { CheckoutBanner } from "./checkout-banner";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Interface para as configurações do banner
interface BannerSettings {
  imageUrl: string;
  maxHeight: number;
  verticalAlignment: "top" | "center" | "bottom";
  enabled: boolean;
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

  // Estado para armazenar as configurações do banner
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>({
    imageUrl: "",
    maxHeight: 350,
    verticalAlignment: "center",
    enabled: false, // Inicialmente desabilitado até que as configurações sejam carregadas
  });

  // Efeito para carregar as configurações do banner
  useEffect(() => {
    const fetchBannerSettings = async () => {
      try {
        const response = await fetch("/api/checkout-settings/banner");
        if (response.ok) {
          const settings = await response.json();
          setBannerSettings({
            imageUrl: settings.headerBackgroundImage || "",
            maxHeight: settings.maxHeight || 350,
            verticalAlignment: settings.verticalAlignment || "center",
            enabled: settings.enabled !== undefined ? settings.enabled : false,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do banner:", error);
        // Manter as configurações padrão em caso de erro
      }
    };

    fetchBannerSettings();
  }, []);

  // 1. Adicionar estado para o cupom aplicado
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountPercentage: number;
  } | null>(null);

  // 2. Criar uma função para receber o cupom do OrderSummary
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Banner condicionalmente renderizado */}
          {bannerSettings.enabled && bannerSettings.imageUrl && (
            <CheckoutBanner
              imageUrl={bannerSettings.imageUrl}
              alt={`Banner promocional - ${product.name}`}
              maxHeight={bannerSettings.maxHeight}
              verticalAlignment={bannerSettings.verticalAlignment}
              enabled={bannerSettings.enabled}
            />
          )}

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

              <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-4">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
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
    </div>
  );
}
