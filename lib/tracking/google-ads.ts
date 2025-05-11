/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/tracking/google-ads.ts
export function loadGoogleAdsPixel(conversionId: string) {
  if (typeof window === "undefined") return;

  // Evita carregar múltiplas vezes
  if (window.gtag) return;

  // Carrega o Google Tag Manager
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
  document.head.appendChild(script);

  // Inicializa o gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", conversionId);
}

export function trackGoogleAdsEvent(
  eventName: string,
  data?: Record<string, any>
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, data);
  }
}

// Para conversões específicas do Google Ads
export function trackGoogleAdsConversion(
  conversionId: string,
  conversionLabel: string,
  value?: number,
  currency?: string
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "conversion", {
      send_to: `${conversionId}/${conversionLabel}`,
      value: value,
      currency: currency || "BRL",
    });
  }
}
