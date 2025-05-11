/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/tracking/google-analytics.ts
export function loadGoogleAnalytics(measurementId: string) {
  if (typeof window === "undefined") return;

  // Evita carregar múltiplas vezes
  if (window.gtag) return;

  // Carrega o Google Tag Manager
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Inicializa o gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}

export function trackGoogleAnalyticsEvent(
  eventName: string,
  parameters?: {
    category?: string;
    label?: string;
    value?: number;
    [key: string]: any;
  }
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, parameters);
  }
}

// Eventos de ecommerce específicos do GA4
export function trackGA4EcommerceEvent(
  eventName: "purchase" | "begin_checkout" | "add_payment_info" | "view_item",
  data: {
    currency?: string;
    value?: number;
    items?: Array<{
      id: string;
      name: string;
      price: number;
      quantity?: number;
    }>;
    [key: string]: any;
  }
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      currency: data.currency || "BRL",
      ...data,
    });
  }
}
