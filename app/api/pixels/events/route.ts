// app/api/pixels/events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { PixelEventDeduplicator } from "@/lib/pixel-deduplication";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headersList = headers();

    const {
      pixelConfigId,
      eventType,
      eventData,
      orderId,
      sessionId,
      userAgent,
      // ✅ EXTRAIR CAMPOS DO TRAFFIC SOURCE
      source,
      medium,
      campaign,
      term,
      content,
      referrer,
    } = body;

    // Validar se o pixel existe
    const pixelConfig = await prisma.pixelConfig.findUnique({
      where: { id: pixelConfigId },
    });

    if (!pixelConfig) {
      return NextResponse.json(
        { error: "Pixel config not found" },
        { status: 404 }
      );
    }

    // Pegar IP do header
    const forwarded = headersList.get("x-forwarded-for");
    const ipAddress = forwarded
      ? forwarded.split(",")[0]
      : headersList.get("x-real-ip");

    // ✅ VERIFICAR DUPLICATAS USANDO A CLASSE DEDICADA
    const duplicateCheck = await PixelEventDeduplicator.checkForDuplicate({
      pixelConfigId,
      eventType,
      orderId,
      sessionId,
      ipAddress: ipAddress || undefined,
      userAgent,
    });

    if (duplicateCheck.isDuplicate) {
      // Devolve o evento já existente em vez de criar outro
      return NextResponse.json({
        ...duplicateCheck.existingEvent,
        duplicate: true,
        deduplicationStrategy: duplicateCheck.strategy,
        message: `Event already exists (detected via ${duplicateCheck.strategy}), skipping duplicate`,
      });
    }

    // ✅ REGISTRAR O EVENTO COM TODOS OS CAMPOS (APENAS SE NÃO FOR DUPLICATA)
    const pixelEventLog = await prisma.pixelEventLog.create({
      data: {
        pixelConfigId,
        eventType,
        eventData,
        orderId,
        sessionId,
        userAgent,
        ipAddress,
        // ✅ SALVAR TODOS OS CAMPOS DE TRAFFIC SOURCE
        source,
        medium,
        campaign,
        term,
        content,
        referrer,
      },
    });

    return NextResponse.json(pixelEventLog);
  } catch (error) {
    console.error("[PIXEL_EVENT_LOG_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to log pixel event" },
      { status: 500 }
    );
  }
}
