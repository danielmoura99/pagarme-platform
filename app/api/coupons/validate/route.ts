// app/api/coupons/validate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.toUpperCase();
    const productId = searchParams.get("productId");

    if (!code || !productId) {
      return new NextResponse(
        "Código do cupom e ID do produto são obrigatórios",
        {
          status: 400,
        }
      );
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code,
        active: true,
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          {
            OR: [
              { maxUses: null },
              {
                maxUses: {
                  gt: prisma.coupon.fields.usageCount,
                },
              },
            ],
          },
        ],
        products: {
          some: {
            id: productId,
          },
        },
      },
      include: {
        products: true,
      },
    });

    if (!coupon) {
      return new NextResponse(
        "Cupom inválido, expirado ou não aplicável a este produto",
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
    });
  } catch (error) {
    console.error("[COUPON_VALIDATE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
