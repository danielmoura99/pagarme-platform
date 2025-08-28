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

    // Logs de importação agrupados por data (últimos 30 dias) - Usar Prisma ao invés de raw SQL
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Buscar logs de importação sem query raw para evitar erros de SQL
    const importLogs = await prisma.rDStationSyncLog.findMany({
      where: {
        configId: config.id,
        processedAt: {
          gte: thirtyDaysAgo
        },
        eventType: {
          in: ['lead_import', 'lead_update']
        }
      },
      select: {
        eventType: true,
        status: true,
        processedAt: true
      },
      orderBy: { processedAt: 'desc' },
      take: 1000 // Limitar para performance
    });

    // Agrupar manualmente por data
    const importHistory = importLogs.reduce((acc, log) => {
      if (!log.processedAt) return acc;
      
      const date = log.processedAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, total: 0, imported: 0, updated: 0, errors: 0 };
      }
      
      acc[date].total++;
      if (log.eventType === 'lead_import') acc[date].imported++;
      if (log.eventType === 'lead_update') acc[date].updated++;
      if (log.status === 'error') acc[date].errors++;
      
      return acc;
    }, {} as Record<string, any>);

    const importHistoryArray = Object.values(importHistory).slice(0, 30);

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        ...log,
        timestamp: log.createdAt?.toISOString() || new Date().toISOString(), // ✅ Proteção contra null
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
      importHistory: importHistoryArray // ✅ Usar array processado
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