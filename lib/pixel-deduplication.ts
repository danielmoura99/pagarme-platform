// lib/pixel-deduplication.ts
import { prisma } from "@/lib/db";

interface EventDeduplicationCheck {
  pixelConfigId: string;
  eventType: string;
  orderId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class PixelEventDeduplicator {
  private static DEDUP_WINDOW_MINUTES = 5; // Janela de verificação de 5 minutos

  /**
   * Verifica se um evento já existe para evitar duplicatas
   */
  static async checkForDuplicate(params: EventDeduplicationCheck): Promise<{ 
    isDuplicate: boolean; 
    existingEvent?: any; 
    strategy: string;
  }> {
    const {
      pixelConfigId,
      eventType,
      orderId,
      sessionId,
      ipAddress,
      userAgent,
    } = params;

    const duplicateCheckWindow = new Date(
      Date.now() - this.DEDUP_WINDOW_MINUTES * 60 * 1000
    );

    // Estratégia 1: Purchase events - usar orderId (mais confiável)
    if (eventType === "Purchase" && orderId) {
      const existing = await prisma.pixelEventLog.findFirst({
        where: {
          pixelConfigId,
          eventType,
          orderId,
          createdAt: { gte: duplicateCheckWindow },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return { 
          isDuplicate: true, 
          existingEvent: existing, 
          strategy: "orderId" 
        };
      }
    }

    // Estratégia 2: InitiateCheckout - usar sessionId + pixelConfigId
    if (eventType === "InitiateCheckout" && sessionId) {
      const existing = await prisma.pixelEventLog.findFirst({
        where: {
          pixelConfigId,
          eventType,
          sessionId,
          createdAt: { gte: duplicateCheckWindow },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return { 
          isDuplicate: true, 
          existingEvent: existing, 
          strategy: "sessionId+pixelConfig" 
        };
      }
    }

    // Estratégia 3: Outros eventos importantes - usar sessionId
    if (["AddPaymentInfo", "ViewContent"].includes(eventType) && sessionId) {
      const existing = await prisma.pixelEventLog.findFirst({
        where: {
          pixelConfigId,
          eventType,
          sessionId,
          createdAt: { gte: duplicateCheckWindow },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return { 
          isDuplicate: true, 
          existingEvent: existing, 
          strategy: "sessionId" 
        };
      }
    }

    // Estratégia 4: Fallback - usar IP + userAgent (menos preciso)
    if (ipAddress && userAgent) {
      const existing = await prisma.pixelEventLog.findFirst({
        where: {
          pixelConfigId,
          eventType,
          ipAddress,
          userAgent,
          createdAt: { gte: duplicateCheckWindow },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        return { 
          isDuplicate: true, 
          existingEvent: existing, 
          strategy: "ip+userAgent" 
        };
      }
    }

    return { isDuplicate: false, strategy: "none" };
  }

  /**
   * Limpa eventos duplicados antigos (função de manutenção)
   */
  static async cleanupOldDuplicates(daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    // Identificar duplicatas por orderId
    const duplicatesByOrderId = await prisma.pixelEventLog.groupBy({
      by: ['orderId', 'pixelConfigId', 'eventType'],
      having: {
        orderId: { not: null }
      },
      _count: { id: true },
      where: {
        createdAt: { lte: cutoffDate },
        orderId: { not: null }
      }
    });

    let deletedCount = 0;

    for (const group of duplicatesByOrderId) {
      if (group._count.id > 1) {
        // Manter apenas o mais antigo, deletar os outros
        const events = await prisma.pixelEventLog.findMany({
          where: {
            orderId: group.orderId,
            pixelConfigId: group.pixelConfigId,
            eventType: group.eventType,
            createdAt: { lte: cutoffDate }
          },
          orderBy: { createdAt: 'asc' }
        });

        // Deletar todos exceto o primeiro
        const toDelete = events.slice(1);
        for (const event of toDelete) {
          await prisma.pixelEventLog.delete({
            where: { id: event.id }
          });
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }
}