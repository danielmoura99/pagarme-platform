// app/(dashboard)/checkout-settings/page.tsx
import { Suspense } from "react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BannersSettingsWrapper } from "./_components/banners-settings-wrapper";

export default async function CheckoutSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <Heading
            title="Configurações do Checkout"
            description="Personalize a aparência e comportamento da página de checkout"
          />
        </div>
        <Separator />

        <Tabs defaultValue="banners" className="space-y-4">
          <TabsList>
            <TabsTrigger value="banners">🖼️ Banners</TabsTrigger>
            <TabsTrigger value="appearance">🎨 Aparência</TabsTrigger>
            <TabsTrigger value="payment">💳 Pagamento</TabsTrigger>
          </TabsList>

          <TabsContent value="banners" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <BannersSettingsWrapper />
            </Suspense>
          </TabsContent>

          <TabsContent value="appearance">
            <div className="rounded-md bg-muted/50 p-8 text-center">
              <h3 className="text-lg font-medium mb-2">
                Configurações de Aparência
              </h3>
              <p className="text-muted-foreground">
                Estas configurações estarão disponíveis em breve.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="payment">
            <div className="rounded-md bg-muted/50 p-8 text-center">
              <h3 className="text-lg font-medium mb-2">
                Configurações de Pagamento
              </h3>
              <p className="text-muted-foreground">
                Estas configurações estarão disponíveis em breve.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
