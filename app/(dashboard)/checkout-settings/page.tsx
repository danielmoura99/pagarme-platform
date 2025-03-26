// app/(dashboard)/checkout-settings/page.tsx
import { Suspense } from "react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/db";
import { BannerSettingsWrapper } from "./_components/banner-settings-wrapper";

// Tipos para o alinhamento vertical
type VerticalAlignment = "top" | "center" | "bottom";

// Função para buscar as configurações do banner
async function getBannerSettings() {
  try {
    // Buscar as configurações no banco de dados
    const settings = await prisma.checkoutSettings.findFirst({
      where: {
        id: "default", // Assumindo que temos apenas uma configuração global
      },
    });

    if (!settings) {
      // Retornar configurações padrão se não existirem
      return {
        imageUrl: "",
        maxHeight: 350,
        verticalAlignment: "center" as VerticalAlignment,
        enabled: true,
      };
    }

    // Determinar o alinhamento vertical
    const alignment = (settings.headerVerticalAlign ||
      "center") as VerticalAlignment;

    // Retornar as configurações do banner
    return {
      imageUrl: settings.headerBackgroundImage || "",
      maxHeight: settings.headerMaxHeight || 350,
      verticalAlignment: alignment,
      enabled:
        settings.headerEnabled !== undefined
          ? !!settings.headerEnabled // Converter para boolean com !!
          : true, // Valor padrão se for undefined
    };
  } catch (error) {
    console.error("Erro ao buscar configurações do banner:", error);
    return {
      imageUrl: "",
      maxHeight: 350,
      verticalAlignment: "center" as VerticalAlignment,
      enabled: true,
    };
  }
}

export default async function CheckoutSettingsPage() {
  // Buscar configurações atuais
  const bannerSettings = await getBannerSettings();

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

        <Tabs defaultValue="banner" className="space-y-4">
          <TabsList>
            <TabsTrigger value="banner">Banner</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="payment">Pagamento</TabsTrigger>
          </TabsList>

          <TabsContent value="banner" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <BannerSettingsWrapper initialValues={bannerSettings} />
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
