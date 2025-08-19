// app/api/affiliates/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const affiliates = await prisma.affiliate.findMany({
      where: {
        active: true,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formattedAffiliates = affiliates.map((affiliate) => ({
      id: affiliate.id,
      name: affiliate.user.name,
      email: affiliate.user.email,
      commission: affiliate.commission,
      recipientId: affiliate.recipientId,
    }));

    return NextResponse.json(formattedAffiliates);
  } catch (error) {
    console.error("[AFFILIATES_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch affiliates" },
      { status: 500 }
    );
  }
}