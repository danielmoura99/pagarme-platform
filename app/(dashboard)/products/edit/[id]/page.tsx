// app/(dashboard)/products/edit/[id]/page.tsx
import { redirect } from "next/navigation";
import { getProduct } from "../../_actions";
import { ProductForm } from "../../_components/product-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// app/(dashboard)/products/edit/[id]/page.tsx
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;

  if (!resolvedParams || typeof resolvedParams !== "object") {
    redirect("/products");
  }

  const { id } = resolvedParams;

  try {
    // Buscar o produto e a lista de produtos disponíveis
    const [product, availableProducts] = await Promise.all([
      getProduct(id),
      prisma.product.findMany({
        where: {
          active: true,
          id: { not: id }, // Excluir o produto atual
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
    ]);

    if (!product) {
      redirect("/products");
    }

    const initialData = {
      ...product,
      price: product.price,
      orderBumps: product.orderBumps || [], // Garantir que orderBumps exista
    };

    return (
      <div className="container mx-auto py-8">
        <ProductForm
          initialData={initialData}
          availableProducts={availableProducts}
        />
      </div>
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    redirect("/products");
  }
}
