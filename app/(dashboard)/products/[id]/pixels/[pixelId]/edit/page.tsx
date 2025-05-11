// app/(dashboard)/products/[id]/pixels/[pixelId]/edit/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PixelForm } from "../../_components/pixel-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditPixelPage({
  params,
}: {
  params: Promise<{ id: string; pixelId: string }>;
}) {
  const resolvedParams = await params;
  const { id: productId, pixelId } = resolvedParams;

  if (!productId || !pixelId) {
    redirect("/products");
  }

  const pixelConfig = await prisma.pixelConfig.findUnique({
    where: { id: pixelId },
  });

  if (!pixelConfig || pixelConfig.productId !== productId) {
    redirect(`/products/${productId}/pixels`);
  }

  // Converter o formato do banco para o formato do formulário
  const initialData = {
    id: pixelConfig.id,
    platform: pixelConfig.platform as
      | "facebook"
      | "google_ads"
      | "google_analytics",
    pixelId: pixelConfig.pixelId,
    enabled: pixelConfig.enabled,
    testMode: pixelConfig.testMode,
    events: pixelConfig.events as string[],
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/products/${productId}/pixels`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Editar Pixel</h1>
        </div>

        <PixelForm productId={productId} initialData={initialData} />
      </div>
    </div>
  );
}
