// app/(dashboard)/coupons/page.tsx
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { CouponClient } from "./_components/client";

export default async function CouponsPage() {
  const coupons = await prisma.coupon.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      products: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const formattedCoupons = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    active: coupon.active,
    discountPercentage: coupon.discountPercentage,
    usageCount: coupon.usageCount,
    maxUses: coupon.maxUses,
    createdAt: format(coupon.createdAt, "yyyy-MM-dd'T'HH:mm:ss"),
    expiresAt: coupon.expiresAt
      ? format(coupon.expiresAt, "yyyy-MM-dd'T'HH:mm:ss")
      : null,
    products: coupon.products,
  }));

  return (
    <div className="container mx-3 py-8">
      <div className="flex-1 space-y-4">
        <CouponClient data={formattedCoupons} />
      </div>
    </div>
  );
}
