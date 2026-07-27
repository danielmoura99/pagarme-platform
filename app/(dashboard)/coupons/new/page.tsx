// app/(dashboard)/coupons/new/page.tsx
import { prisma } from "@/lib/db";
import { CouponForm } from "../_components/coupon-form";

// Página de admin: consulta o banco a cada acesso. Sem isto o Next tenta
// prerenderizar em build time, o que quebra o deploy (o banco não é
// alcançável a partir do build) e serviria dados congelados.
export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container mx-auto py-8">
      <CouponForm products={products} />
    </div>
  );
}
