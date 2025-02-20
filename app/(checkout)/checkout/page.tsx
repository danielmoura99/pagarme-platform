// app/(checkout)/checkout/page.tsx
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import CheckoutContent from "./_components/checkout-content";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Skeleton className="h-[600px] w-full max-w-4xl" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
