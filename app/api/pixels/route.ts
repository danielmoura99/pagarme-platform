// app/api/pixels/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, platform, pixelId, enabled, testMode, events } = body;

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se já existe um pixel com o mesmo ID para este produto
    const existingPixel = await prisma.pixelConfig.findFirst({
      where: {
        productId,
        platform,
        pixelId,
      },
    });

    if (existingPixel) {
      return NextResponse.json(
        { error: "Já existe um pixel com este ID para este produto" },
        { status: 400 }
      );
    }

    // Criar o pixel
    const pixelConfig = await prisma.pixelConfig.create({
      data: {
        productId,
        platform,
        pixelId,
        enabled,
        testMode,
        events,
      },
    });

    return NextResponse.json(pixelConfig);
  } catch (error) {
    console.error("[PIXEL_CREATE]", error);
    return NextResponse.json({ error: "Erro ao criar pixel" }, { status: 500 });
  }
}
