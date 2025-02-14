// app/(dashboard)/products/new/page.tsx
import { prisma } from "@/lib/db";
import { ProductForm } from "../_components/product-form";

export default async function NewProductPage() {
  const availableProducts = await prisma.product.findMany({
    where: {
      active: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="container mx-auto py-8">
      <ProductForm availableProducts={availableProducts} />
    </div>
  );
}
