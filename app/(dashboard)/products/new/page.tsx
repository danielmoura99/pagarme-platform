// app/(dashboard)/products/new/page.tsx
import { prisma } from "@/lib/db";
import { ProductForm } from "../_components/product-form";

// Consulta o banco a cada acesso — não pode ser prerenderizada em build time.
export const dynamic = "force-dynamic";

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
