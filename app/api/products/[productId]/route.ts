// app/api/products/[productId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const product = await prisma.product.findUnique({
      where: {
        id: resolvedParams.productId,
      },
      include: {
        prices: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        orderBumps: {
          include: {
            bumpProduct: {
              include: {
                prices: {
                  where: { active: true },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return new NextResponse("Product not found", { status: 404 });
    }

    // Formatar os dados antes de enviar
    const formattedProduct = {
      ...product,
      orderBumps: product.orderBumps.map((bump) => ({
        id: bump.bumpProduct.id,
        name: bump.bumpProduct.name,
        description: bump.bumpProduct.description,
        prices: bump.bumpProduct.prices,
      })),
    };

    return NextResponse.json(formattedProduct);
  } catch (error) {
    if (error instanceof Error) {
      console.error("[PRODUCT_GET]", error.message);
    }
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    const { orderBumps, ...data } = body;

    const product = await prisma.product.update({
      where: {
        id: resolvedParams.productId,
      },
      data: {
        ...data,
        orderBumps: {
          deleteMany: {}, // Remove todas as relações existentes
          create:
            orderBumps?.map((bumpProductId: string) => ({
              bumpProduct: {
                connect: { id: bumpProductId },
              },
            })) || [],
        },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Error) {
      console.error("[PRODUCT_PATCH]", error.message);
    }
    return new NextResponse("Internal error", { status: 500 });
  }
}
