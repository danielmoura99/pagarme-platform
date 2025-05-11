// app/(dashboard)/products/[id]/pixels/new/page.tsx
import { redirect } from "next/navigation";
import { getProduct } from "../../../_actions";
import { PixelForm } from "../_components/pixel-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewPixelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const productId = resolvedParams.id;

  if (!productId) {
    redirect("/products");
  }

  const product = await getProduct(productId);
  if (!product) {
    redirect("/products");
  }

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
          <h1 className="text-2xl font-bold">Adicionar Pixel</h1>
        </div>

        <PixelForm productId={productId} />
      </div>
    </div>
  );
}
