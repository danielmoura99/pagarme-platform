/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/tracking/pixel-manager.tsx
"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { loadFacebookPixel, trackFacebookEvent } from "@/lib/tracking/facebook";
import {
  loadGoogleAdsPixel,
  trackGoogleAdsEvent,
} from "@/lib/tracking/google-ads";
import {
  loadGoogleAnalytics,
  trackGA4EcommerceEvent,
} from "@/lib/tracking/google-analytics";
import { PixelConfig, PixelEventData } from "@/lib/tracking/types";
import { v4 as uuidv4 } from "uuid";

interface PixelManagerProps {
  pixels: PixelConfig[];
  eventData?: PixelEventData;
}

export function PixelManager({ pixels, eventData }: PixelManagerProps) {
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const searchParams = useSearchParams();
  const initializedPixels = useRef<Set<string>>(new Set());
  
  // ✅ NOVO: Cache para prevenir eventos duplicados
  const firedEvents = useRef<Set<string>>(new Set());

  // Gerar ou recuperar session ID
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem("pixel_session_id");
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem("pixel_session_id", sessionId);
    }
    return sessionId;
  };

  // Função para extrair parâmetros UTM e origem
  const getTrafficSource = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionStorage = window.sessionStorage;

    // Função para buscar UTM em múltiplas fontes
    const getStoredUTM = (param: string) => {
      return urlParams.get(param) || 
             sessionStorage.getItem(param) || 
             localStorage.getItem(param) ||
             getCookie(param);
    };

    // Função para buscar cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    // ✅ SOLUÇÃO ROBUSTA: Capturar UTMs de múltiplas fontes
    let utmSource = getStoredUTM("utm_source");
    let utmMedium = getStoredUTM("utm_medium");
    let utmCampaign = getStoredUTM("utm_campaign");
    let utmTerm = getStoredUTM("utm_term");
    let utmContent = getStoredUTM("utm_content");

    // ✅ FUNCIONALIDADE MELHORADA: Extrair UTMs do referrer + detecção inteligente
    if (!utmSource && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const referrerParams = new URLSearchParams(referrerUrl.search);
        
        // Tentar extrair UTMs do referrer
        if (referrerParams.get("utm_source")) {
          utmSource = referrerParams.get("utm_source");
          utmMedium = referrerParams.get("utm_medium");
          utmCampaign = referrerParams.get("utm_campaign");
          utmTerm = referrerParams.get("utm_term");
          utmContent = referrerParams.get("utm_content");
          
          console.log("🎯 [PIXEL_UTM_REFERRER] UTMs extraídos do referrer:", {
            referrer: document.referrer,
            extracted: { source: utmSource, medium: utmMedium, campaign: utmCampaign }
          });
        }
        // ✅ NOVA LÓGICA: Se referrer é escolatradershouse.com.br, assumir que veio de tráfego pago
        else if (referrerUrl.hostname === "escolatradershouse.com.br") {
          // Verificar se temos UTMs salvos recentemente (últimos 30min)
          const savedTimestamp = localStorage.getItem("utm_timestamp");
          const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
          
          if (savedTimestamp && parseInt(savedTimestamp) > thirtyMinutesAgo) {
            // UTMs salvos recentemente, usar eles
            utmSource = localStorage.getItem("utm_source_backup");
            utmMedium = localStorage.getItem("utm_medium_backup");
            utmCampaign = localStorage.getItem("utm_campaign_backup");
            
            console.log("🎯 [PIXEL_UTM_BACKUP] UTMs recuperados do backup recente:", {
              source: utmSource, medium: utmMedium, campaign: utmCampaign,
              referrerPath: referrerUrl.pathname
            });
          }
          // ✅ FALLBACK INTELIGENTE: Detectar por path
          else if (referrerUrl.pathname.includes("thprop")) {
            // Se veio de /thprop, provavelmente é tráfego Facebook
            utmSource = "facebook";
            utmMedium = "cpc";
            utmCampaign = "thprop_campaign";
            
            console.log("🎯 [PIXEL_PATH_DETECTION] Detectado por path:", {
              path: referrerUrl.pathname,
              assumedSource: utmSource,
              assumedMedium: utmMedium
            });
          }
        }
        
        // Salvar UTMs encontrados
        if (utmSource) {
          sessionStorage.setItem("utm_source", utmSource);
          sessionStorage.setItem("utm_medium", utmMedium || "");
          sessionStorage.setItem("utm_campaign", utmCampaign || "");
          // Backup para próximas sessões
          localStorage.setItem("utm_source_backup", utmSource);
          localStorage.setItem("utm_medium_backup", utmMedium || "");
          localStorage.setItem("utm_campaign_backup", utmCampaign || "");
          localStorage.setItem("utm_timestamp", Date.now().toString());
        }
        
      } catch (error) {
        console.warn("Erro ao processar referrer:", error);
      }
    }

    // Salvar UTMs da URL atual (tem prioridade sobre referrer)
    if (urlParams.get("utm_source")) {
      utmSource = urlParams.get("utm_source")!;
      utmMedium = urlParams.get("utm_medium") || utmMedium;
      utmCampaign = urlParams.get("utm_campaign") || utmCampaign;
      utmTerm = urlParams.get("utm_term") || utmTerm;
      utmContent = urlParams.get("utm_content") || utmContent;
      
      sessionStorage.setItem("utm_source", utmSource);
      sessionStorage.setItem("utm_medium", utmMedium || "");
      sessionStorage.setItem("utm_campaign", utmCampaign || "");
      sessionStorage.setItem("utm_term", utmTerm || "");
      sessionStorage.setItem("utm_content", utmContent || "");
      
      console.log("🎯 [PIXEL_UTM_URL] UTMs da URL atual:", {
        source: utmSource,
        medium: utmMedium,
        campaign: utmCampaign
      });
    }

    // Capturar landing page (primeira página da sessão)
    const landingPage =
      sessionStorage.getItem("landing_page") || window.location.href;
    if (!sessionStorage.getItem("landing_page")) {
      sessionStorage.setItem("landing_page", window.location.href);
    }

    // Detectar referrer orgânico vs paid
    let source = utmSource;
    let medium = utmMedium;

    if (!source && document.referrer) {
      const referrerHost = new URL(document.referrer).hostname;

      // Identificar fontes comuns
      if (referrerHost.includes("google")) {
        source = "google";
        medium = "organic";
      } else if (referrerHost.includes("facebook")) {
        source = "facebook";
        medium = "social";
      } else if (referrerHost.includes("instagram")) {
        source = "instagram";
        medium = "social";
      } else {
        source = referrerHost;
        medium = "referral";
      }
    }

    // Se não há referrer nem UTM, é tráfego direto
    if (!source) {
      source = "direct";
      medium = "none";
    }

    // ✅ Log detalhado da detecção final
    const trafficSourceResult = {
      source,
      medium,
      campaign: utmCampaign,
      term: utmTerm,
      content: utmContent,
      referrer: document.referrer || null,
      landingPage: landingPage,
    };

    console.log("🎯 [PIXEL_TRAFFIC_SOURCE] Origem final detectada:", {
      ...trafficSourceResult,
      detectionMethod: utmSource ? "UTM_FOUND" : (document.referrer ? "REFERRER_FALLBACK" : "DIRECT"),
      referrerHost: document.referrer ? new URL(document.referrer).hostname : null,
      referrerPath: document.referrer ? new URL(document.referrer).pathname : null,
    });

    return trafficSourceResult;
  };

  // Função para registrar eventos
  const logPixelEvent = async (
    pixelConfigId: string,
    eventType: string,
    eventData?: any,
    orderId?: string
  ) => {
    try {
      const trafficSource = getTrafficSource();

      await fetch("/api/pixels/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelConfigId,
          eventType,
          eventData: eventData || {},
          orderId,
          sessionId: getSessionId(),
          userAgent: navigator.userAgent,
          ...trafficSource, // Incluir todos os dados de origem
        }),
      });
    } catch (error) {
      console.error("Failed to log pixel event:", error);
    }
  };

  // Carrega os pixels na primeira renderização
  useEffect(() => {
    pixels.forEach((pixel) => {
      if (!pixel.enabled || initializedPixels.current.has(pixel.pixelId)) {
        return;
      }

      switch (pixel.platform) {
        case "facebook":
          loadFacebookPixel(pixel.pixelId);
          if (pixel.testMode) {
            console.log(
              `[PIXEL TEST MODE] Facebook Pixel loaded: ${pixel.pixelId}`
            );
          }
          break;
        case "google_ads":
          loadGoogleAdsPixel(pixel.pixelId);
          if (pixel.testMode) {
            console.log(
              `[PIXEL TEST MODE] Google Ads Pixel loaded: ${pixel.pixelId}`
            );
          }
          break;
        case "google_analytics":
          loadGoogleAnalytics(pixel.pixelId);
          if (pixel.testMode) {
            console.log(
              `[PIXEL TEST MODE] Google Analytics loaded: ${pixel.pixelId}`
            );
          }
          break;
      }

      initializedPixels.current.add(pixel.pixelId);
    });
  }, [pixels]);

  // ✅ LÓGICA CORRIGIDA - Rastreamento apenas dos eventos principais
  useEffect(() => {
    // 🎯 EVENTOS PRINCIPAIS COM PREVENÇÃO DE DUPLICATAS:
    
    // ✅ Página de checkout → InitiateCheckout
    if (pathname.includes("/checkout")) {
      const eventKey = `InitiateCheckout-${pathname}-${getSessionId()}`;
      if (!firedEvents.current.has(eventKey)) {
        firedEvents.current.add(eventKey);
        fireEvent("InitiateCheckout");
      }
    }
    // ✅ Página de sucesso → Purchase (com orderId único)
    else if (pathname.includes("/success") && eventData?.orderId) {
      const eventKey = `Purchase-${eventData.orderId}`;
      if (!firedEvents.current.has(eventKey)) {
        firedEvents.current.add(eventKey);
        fireEvent("Purchase");
        console.log(`[PIXEL_DEDUP] Purchase event fired once for order: ${eventData.orderId}`);
      } else {
        console.log(`[PIXEL_DEDUP] Purchase event already fired for order: ${eventData.orderId}`);
      }
    }
  }, [pathname, pixels, eventData]);

  // Função para verificar se deve disparar pixel baseado na fonte de tráfego
  const shouldFirePixel = (platform: string, trafficSource: ReturnType<typeof getTrafficSource>) => {
    switch (platform) {
      case "facebook":
        // Facebook Pixel: só dispara para tráfego pago do Facebook/Instagram
        return (trafficSource.source === "facebook" || trafficSource.source === "instagram") && 
               (trafficSource.medium === "cpc" || trafficSource.medium === "paid");
      
      case "google_ads":
        // Google Ads: só dispara para tráfego pago do Google
        return trafficSource.source === "google" && 
               (trafficSource.medium === "cpc" || trafficSource.medium === "paid");
      
      case "google_analytics":
        // Google Analytics: recebe TODOS os eventos para análise geral
        return true;
      
      case "tiktok":
        // TikTok: só dispara para tráfego pago do TikTok
        return trafficSource.source === "tiktok" && 
               (trafficSource.medium === "cpc" || trafficSource.medium === "paid");
      
      case "snapchat":
        // Snapchat: só dispara para tráfego pago do Snapchat
        return trafficSource.source === "snapchat" && 
               (trafficSource.medium === "cpc" || trafficSource.medium === "paid");
      
      default:
        // Outras plataformas: por padrão, dispara
        return true;
    }
  };

  const fireEvent = (eventName: string) => {
    pixels.forEach(async (pixel) => {
      if (!pixel.enabled || !pixel.events.includes(eventName as any)) return;

      const trafficSource = getTrafficSource();

      // ✅ NOVO: Verificar se deve disparar pixel baseado na fonte
      const shouldFire = shouldFirePixel(pixel.platform, trafficSource);
      
      // Log do evento sempre (mesmo em modo teste para analytics)
      await logPixelEvent(pixel.id, eventName, eventData, eventData?.orderId);

      if (pixel.testMode) {
        console.log(`[PIXEL TEST MODE] ${eventName} event:`, {
          platform: pixel.platform,
          pixelId: pixel.pixelId,
          eventData,
          trafficSource,
          shouldFire, // ✅ Mostrar se vai disparar
        });
        return;
      }

      // ✅ NOVO: Só dispara o pixel se passou no filtro
      if (!shouldFire) {
        console.log(`[PIXEL FILTERED] ${pixel.platform} pixel skipped for traffic source:`, {
          source: trafficSource.source,
          medium: trafficSource.medium,
          reason: "Not paid traffic for this platform"
        });
        return;
      }

      switch (pixel.platform) {
        case "facebook":
          trackFacebookEvent(eventName, eventData);
          break;

        case "google_ads":
          trackGoogleAdsEvent(eventName, eventData);
          break;

        case "google_analytics":
          if (eventName === "Purchase" && eventData) {
            trackGA4EcommerceEvent("purchase", {
              currency: eventData.currency || "BRL",
              value: eventData.value,
              items: eventData.content_ids?.map((id, index) => ({
                id,
                name: eventData.content_name || `Product ${index + 1}`,
                price: eventData.value || 0,
                quantity: 1,
              })),
            });
          } else if (eventName === "InitiateCheckout") {
            trackGA4EcommerceEvent("begin_checkout", {
              currency: eventData?.currency || "BRL",
              value: eventData?.value,
              items: eventData?.content_ids?.map((id, index) => ({
                id,
                name: eventData.content_name || `Product ${index + 1}`,
                price: eventData.value || 0,
                quantity: 1,
              })),
            });
          }
          break;
      }
    });
  };

  return null;
}
