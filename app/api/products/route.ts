// app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get("active") === "true";

    // Construir a query base
    const where = active ? { active: true } : {};

    const products = await prisma.product.findMany({
      where,
      include: {
        prices: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Formatar os produtos para incluir o preço atual
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      price: product.prices[0]?.amount || 0,
    }));

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("[PRODUCTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
