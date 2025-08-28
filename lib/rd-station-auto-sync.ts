/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rd-station-auto-sync.ts
import { prisma } from "@/lib/db";

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

// Função para envio imediato ao RD Station
export async function sendEventToRDStationImmediately(pixelEventLog: any) {
  try {
    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();

    if (!config || !config.enabled || !config.accessToken) {
      console.log(
        "[RD_STATION_AUTO_SYNC] RD Station não configurado ou desabilitado"
      );
      return { success: false, reason: "not_configured" };
    }

    // Verificar se o token não expirou
    if (config.tokenExpiresAt && config.tokenExpiresAt < new Date()) {
      console.log("[RD_STATION_AUTO_SYNC] Token expirado");
      return { success: false, reason: "token_expired" };
    }

    // Verificar se o evento deve ser sincronizado
    const syncEvents = config.syncEvents as string[];
    if (!syncEvents.includes(pixelEventLog.eventType)) {
      console.log(
        "[RD_STATION_AUTO_SYNC] Tipo de evento não configurado para sync:",
        pixelEventLog.eventType
      );
      return { success: false, reason: "event_not_configured" };
    }

    // Mapear evento para formato RD Station
    const rdEvent = mapPixelEventToRDStation(pixelEventLog, config);

    if (!rdEvent) {
      console.log(
        "[RD_STATION_AUTO_SYNC] Não foi possível mapear evento - email obrigatório"
      );
      return { success: false, reason: "no_email" };
    }

    // Criar log de sincronização como pending
    const syncLog = await prisma.rDStationSyncLog.create({
      data: {
        configId: config.id,
        pixelEventId: pixelEventLog.id,
        eventType: pixelEventLog.eventType,
        rdEventType: rdEvent.event_type,
        leadEmail: rdEvent.payload.email,
        leadData: rdEvent as any,
        status: "pending",
      },
    });

    // Verificar se é modo API Key ou OAuth
    const isApiKeyMode = config.clientId === "API_KEY_MODE";

    let response;
    if (isApiKeyMode) {
      // Usar API Key (modo conversões)
      const rdEventWithApiKey = {
        ...rdEvent,
        api_key: config.clientSecret,
      };

      response = await fetch("https://api.rd.services/platform/conversions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rdEventWithApiKey),
      });
    } else {
      // Usar OAuth (modo completo)
      response = await fetch("https://api.rd.services/platform/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rdEvent),
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
          status: "success",
          response: parsedResponse,
          processedAt: new Date(),
        },
      });

      // Se é uma compra, marcar como oportunidade também
      if (pixelEventLog.eventType === "Purchase" && !isApiKeyMode) {
        try {
          await markAsOpportunity(pixelEventLog, config);
        } catch (error) {
          console.warn("[RD_STATION_OPPORTUNITY_WARNING]", error);
        }
      }

      console.log("[RD_STATION_AUTO_SYNC] Sucesso:", pixelEventLog.id);
      return { success: true, response: parsedResponse };
    } else {
      // Erro na sincronização
      await prisma.rDStationSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "error",
          response: parsedResponse,
          errorMessage: parsedResponse?.message || `HTTP ${response.status}`,
          errorCode: parsedResponse?.error_code || response.status.toString(),
          processedAt: new Date(),
        },
      });

      console.error("[RD_STATION_AUTO_SYNC] Erro:", parsedResponse);
      return { success: false, error: parsedResponse };
    }
  } catch (error) {
    console.error("[RD_STATION_AUTO_SYNC] Exceção:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Função para mapear evento de pixel para formato RD Station v2 (copiada do sync/route.ts)
function mapPixelEventToRDStation(
  pixelEvent: any,
  config: any
): RDStationEvent | null {
  const eventData = pixelEvent.eventData || {};
  const leadMapping = config.leadMapping || {};

  // Email é obrigatório no RD Station
  if (!eventData.email) {
    return null;
  }

  // Mapear eventos para tipos de conversão do RD Station
  const eventConversionMap: { [key: string]: string } = {
    PageView: "Página Visitada",
    ViewContent: "Conteúdo Visualizado",
    InitiateCheckout: "Checkout Iniciado",
    AddPaymentInfo: "Pagamento Adicionado",
    Purchase: "Compra Realizada",
  };

  const conversionIdentifier = eventConversionMap[pixelEvent.eventType];
  if (!conversionIdentifier) {
    return null;
  }

  // Construir payload seguindo formato RD Station API v2
  const payload: any = {
    email: eventData.email,
    conversion_identifier: conversionIdentifier,
  };

  // Mapear campos opcionais baseado na configuração
  if (leadMapping.name && eventData.name) {
    payload.name = eventData.name;
  }

  if (leadMapping.phone && eventData.phone) {
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
  if (pixelEvent.eventType === "Purchase") {
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
    event_type: "CONVERSION",
    event_family: "CDP",
    payload,
  };
}

// Função auxiliar para marcar contato como oportunidade (usado em compras)
async function markAsOpportunity(pixelEvent: any, config: any) {
  const eventData = pixelEvent.eventData || {};

  if (!eventData.email) {
    return;
  }

  const opportunityEvent = {
    event_type: "OPPORTUNITY",
    event_family: "CDP",
    payload: {
      email: eventData.email,
      funnel_name: "default",
    },
  };

  const response = await fetch("https://api.rd.services/platform/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opportunityEvent),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao marcar oportunidade: ${errorText}`);
  }

  return await response.json();
}
