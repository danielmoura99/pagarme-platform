// app/api/pixels/events/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { PixelEventDeduplicator } from "@/lib/pixel-deduplication";
import { sendEventToRDStationImmediately } from "@/lib/rd-station-auto-sync";

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
      console.log("[PIXEL_EVENT_DUPLICATE_DETECTED]", {
        eventType,
        orderId,
        sessionId,
        existingId: duplicateCheck.existingEvent?.id,
        strategy: duplicateCheck.strategy,
        timeDiff: Date.now() - duplicateCheck.existingEvent?.createdAt.getTime(),
      });

      // Retornar o evento existente com informação de duplicata
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

    // 🚀 ENVIO ESPECÍFICO PARA EVENTOS PURCHASE - Sincronizar imediatamente quando venda é registrada
    if (eventType === "Purchase") {
      setImmediate(async () => {
        try {
          console.log("[RD_STATION_PURCHASE_SYNC] Iniciando envio de Purchase para RD Station", {
            pixelEventId: pixelEventLog.id,
            email: eventData?.email,
            orderId: orderId
          });

          const result = await sendEventToRDStationImmediately(pixelEventLog);
          
          if (result.success) {
            console.log("[RD_STATION_PURCHASE_SYNC_SUCCESS] Purchase enviado com sucesso para RD Station", {
              pixelEventId: pixelEventLog.id,
              orderId: orderId,
              email: eventData?.email
            });
          } else {
            console.log("[RD_STATION_PURCHASE_SYNC_SKIP] Purchase não enviado para RD Station", {
              pixelEventId: pixelEventLog.id,
              orderId: orderId,
              reason: result.reason || 'unknown'
            });
          }
        } catch (error) {
          console.error("[RD_STATION_PURCHASE_SYNC_ERROR] Erro ao enviar Purchase para RD Station", {
            pixelEventId: pixelEventLog.id,
            orderId: orderId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
    }
    
    console.log("[RD_STATION_SYNC] Pixel event registrado", {
      eventType,
      willSyncToRD: eventType === "Purchase",
      pixelEventId: pixelEventLog.id
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
