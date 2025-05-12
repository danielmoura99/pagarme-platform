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

    // Capturar UTM parameters
    const utmSource =
      urlParams.get("utm_source") || sessionStorage.getItem("utm_source");
    const utmMedium =
      urlParams.get("utm_medium") || sessionStorage.getItem("utm_medium");
    const utmCampaign =
      urlParams.get("utm_campaign") || sessionStorage.getItem("utm_campaign");
    const utmTerm =
      urlParams.get("utm_term") || sessionStorage.getItem("utm_term");
    const utmContent =
      urlParams.get("utm_content") || sessionStorage.getItem("utm_content");

    // Salvar UTMs na sessão para persistir durante toda a navegação
    if (urlParams.get("utm_source")) {
      sessionStorage.setItem("utm_source", urlParams.get("utm_source")!);
      sessionStorage.setItem("utm_medium", urlParams.get("utm_medium") || "");
      sessionStorage.setItem(
        "utm_campaign",
        urlParams.get("utm_campaign") || ""
      );
      sessionStorage.setItem("utm_term", urlParams.get("utm_term") || "");
      sessionStorage.setItem("utm_content", urlParams.get("utm_content") || "");
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

    return {
      source,
      medium,
      campaign: utmCampaign,
      term: utmTerm,
      content: utmContent,
      referrer: document.referrer || null,
      landingPage: landingPage,
    };
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

  // Rastreia eventos baseado na página atual
  useEffect(() => {
    const firePageViewEvent = () => {
      pixels.forEach(async (pixel) => {
        if (!pixel.enabled || !pixel.events.includes("PageView")) return;

        // Log do evento
        await logPixelEvent(pixel.id, "PageView", eventData);

        if (pixel.testMode) {
          console.log(`[PIXEL TEST MODE] PageView event:`, {
            platform: pixel.platform,
            pixelId: pixel.pixelId,
            pathname,
            eventData,
            trafficSource: getTrafficSource(),
          });
          return;
        }

        switch (pixel.platform) {
          case "facebook":
            trackFacebookEvent("PageView");
            break;
          case "google_analytics":
            // GA rastreia pageviews automaticamente
            break;
        }
      });
    };

    // Dispara PageView quando a página muda
    firePageViewEvent();

    // Identifica eventos específicos baseado no pathname
    if (pathname.includes("/checkout")) {
      fireEvent("ViewContent");
    } else if (pathname.includes("/processing")) {
      fireEvent("InitiateCheckout");
    } else if (pathname.includes("/success")) {
      fireEvent("Purchase");
    }
  }, [pathname, pixels, eventData]);

  const fireEvent = (eventName: string) => {
    pixels.forEach(async (pixel) => {
      if (!pixel.enabled || !pixel.events.includes(eventName as any)) return;

      // Log do evento sempre (mesmo em modo teste para analytics)
      await logPixelEvent(pixel.id, eventName, eventData, eventData?.orderId);

      if (pixel.testMode) {
        console.log(`[PIXEL TEST MODE] ${eventName} event:`, {
          platform: pixel.platform,
          pixelId: pixel.pixelId,
          eventData,
          trafficSource: getTrafficSource(),
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
          } else if (eventName === "ViewContent") {
            trackGA4EcommerceEvent("view_item", {
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
