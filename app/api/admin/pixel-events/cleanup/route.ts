// app/api/admin/pixel-events/cleanup/route.ts
import { NextResponse } from "next/server";
import { PixelEventDeduplicator } from "@/lib/pixel-deduplication";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get("days") || "7");
    const dryRun = searchParams.get("dry_run") === "true";

    if (dryRun) {
      // Apenas contar quantas duplicatas existem sem deletar
      const duplicatesByOrderId = await prisma.pixelEventLog.groupBy({
        by: ['orderId', 'pixelConfigId', 'eventType'],
        having: {
          orderId: { not: null }
        },
        _count: { id: true },
        where: {
          createdAt: { lte: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000) },
          orderId: { not: null }
        }
      });

      const duplicatesCount = duplicatesByOrderId
        .filter(group => group._count.id > 1)
        .reduce((acc, group) => acc + (group._count.id - 1), 0);

      return NextResponse.json({
        dryRun: true,
        duplicatesFound: duplicatesCount,
        groupsWithDuplicates: duplicatesByOrderId.filter(g => g._count.id > 1).length,
        message: `Found ${duplicatesCount} duplicate events that would be cleaned up`
      });
    }

    // Executar limpeza real
    const deletedCount = await PixelEventDeduplicator.cleanupOldDuplicates(daysOld);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully cleaned up ${deletedCount} duplicate events older than ${daysOld} days`
    });

  } catch (error) {
    console.error("[CLEANUP_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to cleanup duplicates" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Estatísticas de duplicatas
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Eventos recentes agrupados
    const recentEventStats = await prisma.pixelEventLog.groupBy({
      by: ['eventType'],
      _count: { id: true },
      where: {
        createdAt: { gte: last24Hours }
      }
    });

    // Possíveis duplicatas por orderId (últimos 7 dias)
    const possibleDuplicates = await prisma.pixelEventLog.groupBy({
      by: ['orderId', 'eventType'],
      having: {
        orderId: { not: null }
      },
      _count: { id: true },
      where: {
        createdAt: { gte: last7Days },
        orderId: { not: null }
      }
    });

    const duplicateGroups = possibleDuplicates.filter(group => group._count.id > 1);
    const totalDuplicates = duplicateGroups.reduce((acc, group) => acc + (group._count.id - 1), 0);

    return NextResponse.json({
      stats: {
        last24Hours: recentEventStats,
        last7Days: {
          possibleDuplicateGroups: duplicateGroups.length,
          totalDuplicateEvents: totalDuplicates,
          duplicatesByType: duplicateGroups.reduce((acc, group) => {
            acc[group.eventType] = (acc[group.eventType] || 0) + (group._count.id - 1);
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });

  } catch (error) {
    console.error("[STATS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}