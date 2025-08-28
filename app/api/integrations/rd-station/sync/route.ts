// app/api/integrations/rd-station/sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RDStationEvent {
  event_type: string;
  event_family: string;
  payload: {
    email: string;
    conversion_identifier: string;
    name?: string;
    mobile_phone?: string;
    personal_phone?: string;
    job_title?: string;
    state?: string;
    city?: string;
    country?: string;
    company_name?: string;
    website?: string;
    tags?: string[];
    [key: string]: any;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventIds, forceSync = false } = body;

    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();
    
    if (!config || !config.enabled || !config.accessToken) {
      return NextResponse.json(
        { error: "RD Station não está configurado ou habilitado" },
        { status: 400 }
      );
    }

    // Verificar se o token não expirou
    if (config.tokenExpiresAt && config.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token de acesso expirado. Reconecte o RD Station" },
        { status: 401 }
      );
    }

    // Se eventIds específicos não foram fornecidos, buscar eventos pendentes
    let pixelEvents;
    if (eventIds && eventIds.length > 0) {
      pixelEvents = await prisma.pixelEventLog.findMany({
        where: { id: { in: eventIds } },
        orderBy: { createdAt: 'asc' },
        take: config.batchSize
      });
    } else {
      // Buscar eventos não sincronizados
      const syncedEventIds = await prisma.rDStationSyncLog.findMany({
        where: { 
          status: 'success',
          pixelEventId: { not: null }
        },
        select: { pixelEventId: true }
      });

      const syncedIds = syncedEventIds
        .map(log => log.pixelEventId)
        .filter(Boolean) as string[];

      pixelEvents = await prisma.pixelEventLog.findMany({
        where: {
          id: { notIn: syncedIds },
          eventType: { in: config.syncEvents as string[] },
          // Apenas eventos com email (necessário para RD Station)
          eventData: {
            path: ['email'],
            not: null
          }
        },
        orderBy: { createdAt: 'asc' },
        take: config.batchSize
      });
    }

    if (pixelEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum evento para sincronizar",
        synced: 0
      });
    }

    const results = {
      success: 0,
      error: 0,
      total: pixelEvents.length
    };

    // Processar eventos em lote
    for (const event of pixelEvents) {
      try {
        const result = await syncEventToRDStation(event, config);
        if (result.success) {
          results.success++;
          
          // Se é uma compra, marcar como oportunidade também
          if (event.eventType === 'Purchase' && result.response) {
            try {
              await markAsOpportunity(event, config);
            } catch (error) {
              console.warn('[RD_STATION_OPPORTUNITY_WARNING]', error);
              // Não falha a sincronização se não conseguir marcar como oportunidade
            }
          }
        } else {
          results.error++;
        }
      } catch (error) {
        console.error(`[RD_STATION_SYNC_EVENT_ERROR] Event ${event.id}:`, error);
        results.error++;
      }
    }

    // Atualizar estatísticas de sincronização
    await prisma.rDStationConfig.update({
      where: { id: config.id },
      data: {
        lastSyncAt: new Date(),
        totalSynced: {
          increment: results.success
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${results.success} sucessos, ${results.error} erros`,
      ...results
    });

  } catch (error) {
    console.error("[RD_STATION_SYNC_ERROR]", error);
    return NextResponse.json(
      { error: "Erro interno durante sincronização" },
      { status: 500 }
    );
  }
}

// Função auxiliar para sincronizar um evento específico
async function syncEventToRDStation(pixelEvent: any, config: any) {
  try {
    // Mapear evento para formato RD Station
    const rdEvent = mapPixelEventToRDStation(pixelEvent, config);
    
    if (!rdEvent) {
      throw new Error("Não foi possível mapear o evento para RD Station");
    }

    // Criar log de sincronização
    const syncLog = await prisma.rDStationSyncLog.create({
      data: {
        configId: config.id,
        pixelEventId: pixelEvent.id,
        eventType: pixelEvent.eventType,
        rdEventType: rdEvent.event_type,
        leadEmail: rdEvent.email,
        leadData: rdEvent,
        status: 'pending'
      }
    });

    // Verificar se é modo API Key ou OAuth
    const isApiKeyMode = config.clientId === 'API_KEY_MODE';
    
    let response;
    if (isApiKeyMode) {
      // Usar API Key (modo conversões)
      const rdEventWithApiKey = {
        ...rdEvent,
        api_key: config.clientSecret
      };
      
      response = await fetch('https://api.rd.services/platform/conversions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rdEventWithApiKey)
      });
    } else {
      // Usar OAuth (modo completo)
      response = await fetch('https://api.rd.services/platform/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rdEvent)
      });
    }

    const responseData = await response.text();
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = { raw_response: responseData };
    }

    if (response.ok) {
      // Sincronização bem-sucedida
      await prisma.rDStationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'success',
          response: parsedResponse,
          processedAt: new Date()
        }
      });

      return { success: true, response: parsedResponse };
    } else {
      // Erro na sincronização
      await prisma.rDStationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'error',
          response: parsedResponse,
          errorMessage: parsedResponse?.message || `HTTP ${response.status}`,
          errorCode: parsedResponse?.error_code || response.status.toString(),
          processedAt: new Date()
        }
      });

      return { 
        success: false, 
        error: parsedResponse?.message || `HTTP ${response.status}`,
        response: parsedResponse 
      };
    }

  } catch (error) {
    console.error("[SYNC_EVENT_ERROR]", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Função para mapear evento de pixel para formato RD Station v2
function mapPixelEventToRDStation(pixelEvent: any, config: any): RDStationEvent | null {
  const eventData = pixelEvent.eventData || {};
  const leadMapping = config.leadMapping || {};

  // Email é obrigatório no RD Station
  if (!eventData.email) {
    return null;
  }

  // Mapear eventos para tipos de conversão do RD Station
  const eventConversionMap: { [key: string]: string } = {
    'PageView': 'Página Visitada',
    'ViewContent': 'Conteúdo Visualizado', 
    'InitiateCheckout': 'Checkout Iniciado',
    'AddPaymentInfo': 'Pagamento Adicionado',
    'Purchase': 'Compra Realizada'
  };

  const conversionIdentifier = eventConversionMap[pixelEvent.eventType];
  if (!conversionIdentifier) {
    return null;
  }

  // Construir payload seguindo formato RD Station API v2
  const payload: any = {
    email: eventData.email,
    conversion_identifier: conversionIdentifier
  };

  // Mapear campos opcionais baseado na configuração
  if (leadMapping.name && eventData.name) {
    payload.name = eventData.name;
  }

  if (leadMapping.phone && eventData.phone) {
    // RD Station aceita personal_phone e mobile_phone
    payload.mobile_phone = eventData.phone;
  }

  // Dados da empresa se disponível
  if (eventData.company) {
    payload.company_name = eventData.company;
  }

  if (eventData.jobTitle) {
    payload.job_title = eventData.jobTitle;
  }

  // Localização
  if (eventData.city) {
    payload.city = eventData.city;
  }
  if (eventData.state) {
    payload.state = eventData.state;
  }
  if (eventData.country) {
    payload.country = eventData.country;
  }

  // Site/URL
  if (pixelEvent.landingPage) {
    payload.website = pixelEvent.landingPage;
  }

  // Mapear UTMs como campos customizados
  const customFields: any = {};
  if (leadMapping.utmSource && pixelEvent.source) {
    customFields.cf_utm_source = pixelEvent.source;
  }
  if (leadMapping.utmMedium && pixelEvent.medium) {
    customFields.cf_utm_medium = pixelEvent.medium;
  }
  if (leadMapping.utmCampaign && pixelEvent.campaign) {
    customFields.cf_utm_campaign = pixelEvent.campaign;
  }
  if (leadMapping.utmTerm && pixelEvent.term) {
    customFields.cf_utm_term = pixelEvent.term;
  }
  if (leadMapping.utmContent && pixelEvent.content) {
    customFields.cf_utm_content = pixelEvent.content;
  }

  // Adicionar campos customizados ao payload
  Object.assign(payload, customFields);

  // Dados específicos de e-commerce para Purchase
  if (pixelEvent.eventType === 'Purchase') {
    if (eventData.value) {
      payload.cf_purchase_value = parseFloat(eventData.value);
    }
    if (eventData.currency) {
      payload.cf_currency = eventData.currency;
    }
    if (eventData.orderId) {
      payload.cf_order_id = eventData.orderId;
    }
  }

  // Tags baseadas no tipo de evento e fonte
  const tags: string[] = [];
  tags.push(`evento_${pixelEvent.eventType.toLowerCase()}`);
  
  if (pixelEvent.source) {
    tags.push(`origem_${pixelEvent.source}`);
  }
  if (pixelEvent.medium) {
    tags.push(`meio_${pixelEvent.medium}`);
  }
  if (pixelEvent.campaign) {
    tags.push(`campanha_${pixelEvent.campaign}`);
  }

  payload.tags = tags;

  // Retornar no formato correto da API v2
  return {
    event_type: 'CONVERSION',
    event_family: 'CDP',
    payload
  };
}

// Função auxiliar para marcar contato como oportunidade (usado em compras)
async function markAsOpportunity(pixelEvent: any, config: any) {
  const eventData = pixelEvent.eventData || {};
  
  if (!eventData.email) {
    return;
  }

  const opportunityEvent = {
    event_type: 'OPPORTUNITY',
    event_family: 'CDP',
    payload: {
      email: eventData.email,
      funnel_name: 'default'
    }
  };

  const response = await fetch('https://api.rd.services/platform/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(opportunityEvent)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao marcar oportunidade: ${errorText}`);
  }

  return await response.json();
}