// app/api/integrations/rd-station/sync-logs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'import', 'export', 'all'
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config) {
      return NextResponse.json(
        { error: "Configuração RD Station não encontrada" },
        { status: 404 }
      );
    }

    // Construir filtros
    const whereClause: any = {
      configId: config.id
    };

    if (type === 'import') {
      whereClause.eventType = {
        in: ['lead_import', 'lead_update']
      };
    } else if (type === 'export') {
      whereClause.eventType = {
        in: ['Purchase', 'InitiateCheckout', 'ViewContent', 'AddPaymentInfo', 'PageView']
      };
    }

    // Buscar logs
    const logs = await prisma.rDStationSyncLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      select: {
        id: true,
        eventType: true,
        rdEventType: true,
        leadEmail: true,
        status: true,
        attempts: true,
        errorMessage: true,
        createdAt: true,
        processedAt: true,
        leadData: true
      }
    });

    // Contar total para paginação
    const totalCount = await prisma.rDStationSyncLog.count({
      where: whereClause
    });

    // Estatísticas gerais
    const stats = await prisma.rDStationSyncLog.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { id: true }
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Logs de importação agrupados por data (últimos 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const importHistory = await prisma.$queryRaw`
      SELECT 
        DATE("processedAt") as date,
        COUNT(*) as total,
        COUNT(CASE WHEN "eventType" = 'lead_import' THEN 1 END) as imported,
        COUNT(CASE WHEN "eventType" = 'lead_update' THEN 1 END) as updated,
        COUNT(CASE WHEN "status" = 'error' THEN 1 END) as errors
      FROM "rd_station_sync_log"
      WHERE "configId" = ${config.id}
        AND "processedAt" >= ${thirtyDaysAgo}
        AND ("eventType" = 'lead_import' OR "eventType" = 'lead_update')
      GROUP BY DATE("processedAt")
      ORDER BY date DESC
      LIMIT 30
    ` as any[];

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        ...log,
        timestamp: log.createdAt.toISOString(),
        stats: extractStatsFromLeadData(log.leadData)
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      stats: {
        success: statsMap.success || 0,
        error: statsMap.error || 0,
        pending: statsMap.pending || 0,
        retrying: statsMap.retrying || 0
      },
      importHistory: importHistory.map(item => ({
        date: item.date,
        imported: Number(item.imported),
        updated: Number(item.updated),
        errors: Number(item.errors),
        total: Number(item.total)
      }))
    });

  } catch (error) {
    console.error("[RD_STATION_SYNC_LOGS_ERROR]", error);
    return NextResponse.json(
      { error: "Erro ao buscar logs de sincronização" },
      { status: 500 }
    );
  }
}

// Função auxiliar para extrair estatísticas dos dados do lead
function extractStatsFromLeadData(leadData: any): any {
  if (!leadData || typeof leadData !== 'object') {
    return null;
  }

  // Se é um log de importação em lote
  if (leadData.action && ['import', 'update'].includes(leadData.action)) {
    return {
      imported: leadData.action === 'import' ? 1 : 0,
      updated: leadData.action === 'update' ? 1 : 0,
      skipped: 0,
      errors: 0,
      total: 1
    };
  }

  return null;
}