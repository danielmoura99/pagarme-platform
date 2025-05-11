/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/tracking/types.ts
export type PixelPlatform =
  | "facebook"
  | "google_ads"
  | "google_analytics"
  | "tiktok"
  | "snapchat";

export type PixelEvent =
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase"
  | "Lead"
  | "CompleteRegistration";

export interface PixelEventData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  num_items?: number;
  [key: string]: any;
}

export interface PixelConfig {
  id: string;
  platform: PixelPlatform;
  pixelId: string;
  enabled: boolean;
  events: PixelEvent[];
  testMode?: boolean;
}

// Declarações globais para os pixels
declare global {
  interface Window {
    fbq: any;
    gtag: any;
    ttq: any;
    snaptr: any;
    dataLayer: any[];
  }
}
