// app/api/pixels/manage/[pixelId]/test/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { pixelId: string } }
) {
  try {
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { id: params.pixelId },
      include: {
        product: true,
      },
    });

    if (!pixelConfig) {
      return NextResponse.json(
        { error: "Pixel não encontrado" },
        { status: 404 }
      );
    }

    // Criar um log de teste
    console.log("[PIXEL_TEST] Disparando evento de teste:", {
      platform: pixelConfig.platform,
      pixelId: pixelConfig.pixelId,
      productName: pixelConfig.product.name,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message:
        "Evento de teste disparado. Verifique o console do navegador e as ferramentas de debug da plataforma.",
      testData: {
        platform: pixelConfig.platform,
        pixelId: pixelConfig.pixelId,
        event: "TestEvent",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[PIXEL_TEST]", error);
    return NextResponse.json(
      { error: "Erro ao testar pixel" },
      { status: 500 }
    );
  }
}
