// app/api/pixels/[productId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const pixelConfigs = await prisma.pixelConfig.findMany({
      where: {
        productId: params.productId,
        enabled: true,
      },
      select: {
        id: true,
        platform: true,
        pixelId: true,
        enabled: true,
        events: true,
        testMode: true,
      },
    });

    // Converte o formato JSON do banco para o formato esperado
    const formattedConfigs = pixelConfigs.map((config) => ({
      ...config,
      events: config.events as string[], // Type casting para array de strings
    }));

    return NextResponse.json(formattedConfigs);
  } catch (error) {
    console.error("[PIXELS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch pixel configurations" },
      { status: 500 }
    );
  }
}
