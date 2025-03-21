// app/(dashboard)/products/page.tsx
import { ProductClient } from "./_components/client";
import { format } from "date-fns";
import { prisma } from "@/lib/db";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      prices: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedProducts = products.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.name,
    description: item.description,
    price: item.prices[0]?.amount || 0,
    active: item.active,
    createdAt: format(item.createdAt, "dd/MM/yyyy"),
  }));

  return (
    <div className="container mx-12 py-8">
      <div className="flex-1 space-y-4">
        <ProductClient data={formattedProducts} />
      </div>
    </div>
  );
}
