// app/(dashboard)/coupons/[couponId]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CouponForm } from "../_components/coupon-form";

interface PageProps {
  params: { couponId: string };
}

async function getCouponData(id: string) {
  const [coupon, products] = await Promise.all([
    prisma.coupon.findUnique({
      where: { id },
      include: {
        products: true,
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { coupon, products };
}

export default async function EditCouponPage({ params }: PageProps) {
  // Aguardar os parâmetros serem resolvidos
  const resolvedParams = await params;
  const id = resolvedParams.couponId;

  if (!id) {
    return notFound();
  }

  const { coupon, products } = await getCouponData(id);

  if (!coupon) {
    return notFound();
  }

  const formattedCoupon = {
    id: coupon.id,
    code: coupon.code,
    active: coupon.active,
    discountPercentage: coupon.discountPercentage,
    maxUses: coupon.maxUses,
    expiresAt: coupon.expiresAt,
    productIds: coupon.products.map((p) => p.id),
  };

  return (
    <div className="container mx-auto py-8">
      <CouponForm initialData={formattedCoupon} products={products} />
    </div>
  );
}
