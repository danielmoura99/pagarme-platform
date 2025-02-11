// app/(checkout)/checkout/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CheckoutForm } from "./_components/checkout-form";
import { OrderSummary } from "./_components/order-summary";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface CheckoutPageProps {
  searchParams: Promise<{ productId?: string }> | { productId?: string };
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const resolvedSearchParams = await searchParams;

  if (!resolvedSearchParams.productId) {
    redirect("/products");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: resolvedSearchParams.productId,
    },
    include: {
      prices: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Redireciona para página de indisponível se:
  // 1. Produto não existe
  // 2. Produto está inativo
  // 3. Produto não tem preço ativo
  if (!product || !product.active || product.prices.length === 0) {
    redirect("/unavailable");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
        {/* Header do Checkout */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finalizar Compra</h1>
          <p className="text-gray-500 mt-2">
            Complete suas informações para prosseguir
          </p>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formulário */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <CheckoutForm product={product} />
            </Suspense>
          </div>

          {/* Resumo do Pedido */}
          <div className="lg:col-span-5 order-1 lg:order-2 lg:sticky lg:top-4">
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <OrderSummary product={product} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
