/* eslint-disable prefer-rest-params */
/* eslint-disable prefer-spread */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/tracking/facebook.ts
export function loadFacebookPixel(pixelId: string) {
  if (typeof window === "undefined") return;

  // Evita carregar múltiplas vezes
  if (window.fbq) return;

  // Carrega o script do Facebook Pixel
  (function (
    f: any,
    b: Document,
    e: string,
    v: string,
    n: any,
    t: HTMLScriptElement,
    s: HTMLScriptElement
  ) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e) as HTMLScriptElement;
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0] as HTMLScriptElement;
    s.parentNode!.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
    window.fbq,
    null as any,
    null as any
  );

  // Inicializa o pixel
  window.fbq("init", pixelId);
}

export function trackFacebookEvent(
  eventName: string,
  data?: Record<string, any>
) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("track", eventName, data);
  }
}
