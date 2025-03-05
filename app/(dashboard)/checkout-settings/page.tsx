// app/(dashboard)/checkout-settings/page.tsx
import { Suspense } from "react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getCheckoutSettings } from "./_actions";
import { CheckoutSettingsForm } from "./_components/checkout-settings-form";

export const dynamic = "force-dynamic";

export default async function CheckoutSettingsPage() {
  const settings = await getCheckoutSettings();

  return (
    <div className="container mx-3 py-8">
      <Heading
        title="Configurações do Checkout"
        description="Personalize a aparência e comportamento do checkout"
      />
      <Separator className="my-4" />

      <Suspense fallback={<Skeleton className="w-full h-[500px]" />}>
        <CheckoutSettingsForm initialData={settings} />
      </Suspense>
    </div>
  );
}
