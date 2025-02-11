// app/(dashboard)/coupons/new/page.tsx
import { prisma } from "@/lib/db";
import { CouponForm } from "../_components/coupon-form";

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
