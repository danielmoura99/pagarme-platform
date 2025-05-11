// app/(dashboard)/products/[id]/pixels/page.tsx
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getProduct } from "../../_actions";
import { prisma } from "@/lib/db";
import { PixelsList } from "./_components/pixels-list";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProductPixelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;

  if (!productId) {
    redirect("/products");
  }

  const [product, pixelConfigs] = await Promise.all([
    getProduct(productId),
    prisma.pixelConfig.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!product) {
    redirect("/products");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between">
        <Heading
          title={`Pixels - ${product.name}`}
          description="Gerencie os pixels de rastreamento para este produto"
        />
        <div className="flex gap-2">
          <Link href={`/products/${productId}`}>
            <Button variant="outline">Voltar</Button>
          </Link>
          <Link href={`/products/${productId}/pixels/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Pixel
            </Button>
          </Link>
        </div>
      </div>
      <Separator className="my-4" />

      <PixelsList data={pixelConfigs} productId={productId} />
    </div>
  );
}
