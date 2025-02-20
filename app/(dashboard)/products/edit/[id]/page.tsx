// app/(dashboard)/products/edit/[id]/page.tsx
import { redirect } from "next/navigation";
import { getProduct } from "../../_actions";
import { ProductForm } from "../../_components/product-form";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Caso receba um objeto simples, pode fazer:
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  if (!id) {
    redirect("/products");
  }

  try {
    const [product, availableProducts] = await Promise.all([
      getProduct(id),
      prisma.product.findMany({
        where: {
          active: true,
          id: { not: id },
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
      orderBumps: product.orderBumps || [],
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
