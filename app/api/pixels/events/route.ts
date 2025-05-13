// app/api/pixels/events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

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
      landingPage,
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

    // ✅ REGISTRAR O EVENTO COM TODOS OS CAMPOS
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
        landingPage,
      },
    });

    // Log para debug
    console.log("[PIXEL_EVENT_SAVED]", {
      id: pixelEventLog.id,
      eventType,
      source,
      medium,
      campaign,
      referrer,
      landingPage,
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
