/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/rd-station-auto-sync.ts
import { prisma } from "@/lib/db";

// Função auxiliar para renovar token de acesso
async function refreshAccessToken(config: any) {
  try {
    console.log("[RD_STATION_REFRESH_TOKEN] Tentando renovar token expirado");

    const refreshResponse = await fetch('https://api.rd.services/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error("[RD_STATION_REFRESH_ERROR] Erro ao renovar token:", errorText);
      return null;
    }

    const tokenData = await refreshResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    console.log("[RD_STATION_REFRESH_TOKEN] Token renovado com sucesso", {
      expiresAt: expiresAt.toISOString(),
      expiresInHours: Math.round(expires_in / 3600)
    });

    // Atualizar tokens no banco
    await prisma.rDStationConfig.update({
      where: { id: config.id },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token || config.refreshToken, // Manter refresh atual se novo não fornecido
        tokenExpiresAt: expiresAt,
        updatedAt: new Date()
      }
    });

    return {
      accessToken: access_token,
      refreshToken: refresh_token || config.refreshToken,
      tokenExpiresAt: expiresAt
    };
  } catch (error) {
    console.error("[RD_STATION_REFRESH_TOKEN_ERROR]", error);
    return null;
  }
}

// Função para verificar e renovar token se necessário
async function ensureValidToken(config: any) {
  const isApiKeyMode = config.clientId === "API_KEY_MODE";
  
  if (isApiKeyMode) {
    // Modo API Key não precisa renovação
    return !!config.clientSecret;
  }

  // Verificar se token expira nos próximos 5 minutos (renovação preventiva)
  const tokenExpiresAt = config.tokenExpiresAt;
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  
  if (!config.accessToken || !tokenExpiresAt || tokenExpiresAt <= fiveMinutesFromNow) {
    console.log("[RD_STATION_TOKEN_CHECK] Token expirado ou expirando em breve, renovando...", {
      hasToken: !!config.accessToken,
      expiresAt: tokenExpiresAt?.toISOString(),
      willExpireIn5Min: tokenExpiresAt <= fiveMinutesFromNow
    });

    if (!config.refreshToken) {
      console.error("[RD_STATION_TOKEN_CHECK] Sem refresh_token para renovação");
      return false;
    }

    const refreshed = await refreshAccessToken(config);
    if (!refreshed) {
      console.error("[RD_STATION_TOKEN_CHECK] Falha na renovação do token");
      return false;
    }

    // Atualizar configuração local com novos tokens
    config.accessToken = refreshed.accessToken;
    config.refreshToken = refreshed.refreshToken;
    config.tokenExpiresAt = refreshed.tokenExpiresAt;
    
    console.log("[RD_STATION_TOKEN_CHECK] Token renovado com sucesso");
    return true;
  }

  console.log("[RD_STATION_TOKEN_CHECK] Token ainda válido", {
    expiresAt: tokenExpiresAt.toISOString(),
    timeLeft: Math.round((tokenExpiresAt.getTime() - Date.now()) / (1000 * 60)) + " minutos"
  });
  
  return true;
}

// Função para fazer requisição com retry automático em caso de token inválido
async function makeRDStationRequest(url: string, options: RequestInit, config: any, retryCount = 0): Promise<Response> {
  const maxRetries = 1; // Máximo 1 retry
  
  const response = await fetch(url, options);
  
  // Se receber 401 (token inválido) e ainda pode tentar renovar
  if (response.status === 401 && retryCount < maxRetries && config.refreshToken) {
    console.log("[RD_STATION_REQUEST_RETRY] Token inválido, tentando renovar e refazer requisição");
    
    const refreshed = await refreshAccessToken(config);
    if (refreshed) {
      // Atualizar configuração local
      config.accessToken = refreshed.accessToken;
      config.refreshToken = refreshed.refreshToken;
      config.tokenExpiresAt = refreshed.tokenExpiresAt;
      
      // Atualizar header da requisição com novo token
      if (options.headers && typeof options.headers === 'object') {
        (options.headers as any)['Authorization'] = `Bearer ${refreshed.accessToken}`;
      }
      
      console.log("[RD_STATION_REQUEST_RETRY] Token renovado, refazendo requisição");
      return makeRDStationRequest(url, options, config, retryCount + 1);
    }
  }
  
  return response;
}

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
// Nova função específica para envio de compras confirmadas
export async function sendPurchaseToRDStation(purchaseData: {
  email: string;
  name?: string;
  phone?: string;
  orderId: string;
  amount: number;
  productName?: string;
  customerData?: any;
}) {
  try {
    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();

    if (!config || !config.enabled) {
      console.log("[RD_STATION_PURCHASE_SYNC] RD Station não configurado ou desabilitado");
      return { success: false, reason: "not_configured" };
    }

    // Verificar e renovar token se necessário
    const tokenIsValid = await ensureValidToken(config);
    if (!tokenIsValid) {
      console.log("[RD_STATION_PURCHASE_SYNC] Falha na verificação/renovação do token");
      return { success: false, reason: "token_refresh_failed" };
    }

    // Buscar UTMs dos pixel events relacionados ao email do cliente
    let utmData = null;
    try {
      // Buscar o pixel event mais recente deste email (últimas 24h)
      const recentPixelEvent = await prisma.pixelEventLog.findFirst({
        where: {
          eventData: {
            path: ['email'],
            equals: purchaseData.email
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
          }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          source: true,
          medium: true,
          campaign: true,
          term: true,
          content: true,
          referrer: true,
          landingPage: true
        }
      });

      utmData = recentPixelEvent;
      console.log("[RD_STATION_PURCHASE_SYNC] UTMs encontrados:", utmData);
    } catch (error) {
      console.warn("[RD_STATION_PURCHASE_SYNC] Erro ao buscar UTMs:", error);
    }

    // Preparar evento de compra confirmada com UTMs
    const payload: any = {
      email: purchaseData.email,
      conversion_identifier: "Compra Realizada",
      name: purchaseData.name || purchaseData.email,
      mobile_phone: purchaseData.phone || undefined,
      cf_purchase_value: purchaseData.amount / 100, // Converter centavos para reais
      cf_currency: "BRL",
      cf_order_id: purchaseData.orderId,
      cf_product_name: purchaseData.productName || "Produto Digital",
    };

    // Adicionar UTMs como campos customizados se disponíveis
    if (utmData) {
      if (utmData.source) payload.cf_utm_source = utmData.source;
      if (utmData.medium) payload.cf_utm_medium = utmData.medium;
      if (utmData.campaign) payload.cf_utm_campaign = utmData.campaign;
      if (utmData.term) payload.cf_utm_term = utmData.term;
      if (utmData.content) payload.cf_utm_content = utmData.content;
      if (utmData.referrer) payload.cf_referrer = utmData.referrer;
      if (utmData.landingPage) payload.cf_landing_page = utmData.landingPage;
    }

    // Tags dinâmicas baseadas na fonte
    const tags = ["Paystep", "compra_confirmada", "cliente_pagante"];
    if (utmData?.source) {
      tags.push(`origem_${utmData.source}`);
    }
    if (utmData?.medium) {
      tags.push(`meio_${utmData.medium}`);
    }
    if (utmData?.campaign) {
      tags.push(`campanha_${utmData.campaign.toLowerCase().replace(/\s+/g, '_')}`);
    }

    payload.tags = tags;

    const rdEvent = {
      event_type: "CONVERSION",
      event_family: "CDP",
      payload
    };

    // Criar log de sincronização
    const syncLog = await prisma.rDStationSyncLog.create({
      data: {
        configId: config.id,
        eventType: "Purchase_Confirmed",
        rdEventType: rdEvent.event_type,
        leadEmail: rdEvent.payload.email,
        leadData: {
          ...rdEvent,
          source: "webhook_pagarme",
          orderId: purchaseData.orderId
        } as any,
        status: "pending",
      },
    });

    // Enviar para RD Station
    let response;
    const isApiKeyMode = config.clientId === "API_KEY_MODE";
    
    if (isApiKeyMode) {
      // Usar API Key (modo conversões) - sem retry pois não usa OAuth
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
      // Usar OAuth (modo completo) - com retry automático
      response = await makeRDStationRequest("https://api.rd.services/platform/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rdEvent),
      }, config);
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

      // Marcar como oportunidade se não for modo API Key
      if (!isApiKeyMode) {
        try {
          await markAsOpportunity({
            eventData: { email: purchaseData.email }
          }, config);
        } catch (error) {
          console.warn("[RD_STATION_PURCHASE_OPPORTUNITY_WARNING]", error);
        }
      }

      console.log("[RD_STATION_PURCHASE_SYNC] Sucesso:", {
        orderId: purchaseData.orderId,
        email: purchaseData.email
      });
      
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

      console.error("[RD_STATION_PURCHASE_SYNC] Erro:", {
        orderId: purchaseData.orderId,
        error: parsedResponse
      });
      
      return { success: false, error: parsedResponse };
    }
  } catch (error) {
    console.error("[RD_STATION_PURCHASE_SYNC] Exceção:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendEventToRDStationImmediately(pixelEventLog: any) {
  try {
    // Buscar configuração RD Station
    const config = await prisma.rDStationConfig.findFirst();

    if (!config || !config.enabled) {
      console.log(
        "[RD_STATION_AUTO_SYNC] RD Station não configurado ou desabilitado"
      );
      return { success: false, reason: "not_configured" };
    }

    // Verificar e renovar token se necessário
    const tokenIsValid = await ensureValidToken(config);
    if (!tokenIsValid) {
      console.log("[RD_STATION_AUTO_SYNC] Falha na verificação/renovação do token");
      return { success: false, reason: "token_refresh_failed" };
    }

    // Verificar se o evento deve ser sincronizado
    let syncEvents: string[] = [];
    try {
      // Garantir que syncEvents seja sempre um array
      if (Array.isArray(config.syncEvents)) {
        syncEvents = config.syncEvents as string[];
      } else if (typeof config.syncEvents === 'string') {
        syncEvents = JSON.parse(config.syncEvents);
      } else if (config.syncEvents && typeof config.syncEvents === 'object') {
        syncEvents = Object.values(config.syncEvents).filter(v => typeof v === 'string') as string[];
      } else {
        syncEvents = [];
      }
      
      // Garantir que é um array válido
      if (!Array.isArray(syncEvents)) {
        syncEvents = [];
      }
    } catch (error) {
      console.warn("[RD_STATION_AUTO_SYNC] Erro ao parsear syncEvents, usando padrão:", error);
      syncEvents = [];
    }

    // Se syncEvents estiver vazio, usar eventos padrão e corrigir no banco
    if (syncEvents.length === 0) {
      console.warn("[RD_STATION_AUTO_SYNC] syncEvents vazio, usando eventos padrão e corrigindo no banco");
      syncEvents = ["purchase", "initiateCheckout", "addPaymentInfo", "viewContent", "pageView"];
      
      // Corrigir configuração no banco de forma assíncrona (não bloquear o sync)
      setImmediate(async () => {
        try {
          await prisma.rDStationConfig.update({
            where: { id: config.id },
            data: {
              syncEvents: syncEvents,
              updatedAt: new Date()
            }
          });
          console.log("[RD_STATION_AUTO_SYNC] syncEvents corrigido no banco:", syncEvents);
        } catch (error) {
          console.error("[RD_STATION_AUTO_SYNC] Erro ao corrigir syncEvents no banco:", error);
        }
      });
    }

    // Normalizar nome do evento (PascalCase para camelCase)
    const normalizeEventType = (eventType: string): string => {
      const eventMap: { [key: string]: string } = {
        'Purchase': 'purchase',
        'InitiateCheckout': 'initiateCheckout', 
        'AddPaymentInfo': 'addPaymentInfo',
        'ViewContent': 'viewContent',
        'PageView': 'pageView'
      };
      return eventMap[eventType] || eventType.toLowerCase();
    };

    const normalizedEventType = normalizeEventType(pixelEventLog.eventType);

    console.log("[RD_STATION_AUTO_SYNC] Eventos configurados para sync:", {
      syncEvents,
      originalEventType: pixelEventLog.eventType,
      normalizedEventType,
      isConfigured: syncEvents.includes(normalizedEventType)
    });

    if (!syncEvents.includes(normalizedEventType)) {
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
      // Usar API Key (modo conversões) - sem retry pois não usa OAuth
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
      // Usar OAuth (modo completo) - com retry automático
      response = await makeRDStationRequest("https://api.rd.services/platform/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rdEvent),
      }, config);
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

  const response = await makeRDStationRequest("https://api.rd.services/platform/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opportunityEvent),
  }, config);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao marcar oportunidade: ${errorText}`);
  }

  return await response.json();
}
