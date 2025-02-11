"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckoutForm } from "./_components/checkout-form";
import { OrderSummary } from "./_components/order-summary";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Hook para acessar searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">(
    "credit_card"
  );

  useEffect(() => {
    const productId = searchParams.get("productId"); // Usando o método get para acessar o parâmetro

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Compra</h1>
          <p className="text-gray-500 mt-2">
            Complete suas informações para prosseguir
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <CheckoutForm
                product={product}
                selectedInstallments={selectedInstallments}
                totalAmount={totalAmount}
                onPaymentMethodChange={setPaymentMethod}
              />
            </Suspense>
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
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
