/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  const searchParams = useSearchParams();
  const initializedPixels = useRef<Set<string>>(new Set());

  const getSessionId = () => {
    let sessionId = sessionStorage.getItem("pixel_session_id");
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem("pixel_session_id", sessionId);
    }
    return sessionId;
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
      pixels.forEach((pixel) => {
        if (!pixel.enabled || !pixel.events.includes("PageView")) return;

        if (pixel.testMode) {
          console.log(`[PIXEL TEST MODE] PageView event:`, {
            platform: pixel.platform,
            pixelId: pixel.pixelId,
            pathname,
            eventData,
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

  // Função para registrar eventos
  const logPixelEvent = async (
    pixelConfigId: string,
    eventType: string,
    eventData?: any,
    orderId?: string
  ) => {
    try {
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
        }),
      });
    } catch (error) {
      console.error("Failed to log pixel event:", error);
    }
  };

  const fireEvent = (eventName: string) => {
    pixels.forEach(async (pixel) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!pixel.enabled || !pixel.events.includes(eventName as any)) return;

      if (pixel.testMode) {
        console.log(`[PIXEL TEST MODE] ${eventName} event:`, {
          platform: pixel.platform,
          pixelId: pixel.pixelId,
          eventData,
        });
        await logPixelEvent(pixel.id, eventName, eventData);
        return;
      }

      // Log do evento real
      await logPixelEvent(pixel.id, eventName, eventData);

      // Disparar o evento nas plataformas
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
