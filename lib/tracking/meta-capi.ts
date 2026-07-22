// lib/tracking/meta-capi.ts
// Envio server-side de eventos para a Meta Conversions API (CAPI).
// Projetado para NUNCA lançar exceção — uma falha aqui não pode derrubar o webhook.
import crypto from "crypto";

const META_API_VERSION = "v21.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Normaliza (trim + lowercase) e faz hash SHA-256, conforme exigido pela Meta.
function hashField(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
}

// Telefone: apenas dígitos, com código do país (garante 55 no Brasil), depois hash.
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (!digits.startsWith("55")) digits = "55" + digits;
  return sha256(digits);
}

export interface MetaPurchaseParams {
  pixelId: string;
  accessToken: string;
  /** Faz o evento aparecer só na aba "Test Events" (não conta como conversão real). */
  testEventCode?: string;
  /** Mesmo event_id do pixel do browser → a Meta deduplica os dois. Usar order.id. */
  eventId: string;
  eventSourceUrl?: string;
  userData: {
    email?: string | null;
    phone?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    clientIp?: string | null;
    userAgent?: string | null;
    fbp?: string | null;
    fbc?: string | null;
  };
  customData: {
    value: number;
    currency: string;
    contentIds?: string[];
    contentName?: string;
    numItems?: number;
  };
}

export async function sendMetaPurchaseEvent(
  params: MetaPurchaseParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      pixelId,
      accessToken,
      testEventCode,
      eventId,
      eventSourceUrl,
      userData,
      customData,
    } = params;

    if (!pixelId || !accessToken) {
      return { success: false, error: "pixelId ou accessToken ausente" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user_data: Record<string, any> = {};
    const em = hashField(userData.email);
    const ph = hashPhone(userData.phone);
    const fn = hashField(userData.firstName);
    const ln = hashField(userData.lastName);
    if (em) user_data.em = [em];
    if (ph) user_data.ph = [ph];
    if (fn) user_data.fn = [fn];
    if (ln) user_data.ln = [ln];
    if (userData.clientIp) user_data.client_ip_address = userData.clientIp;
    if (userData.userAgent) user_data.client_user_agent = userData.userAgent;
    if (userData.fbp) user_data.fbp = userData.fbp;
    if (userData.fbc) user_data.fbc = userData.fbc;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const custom_data: Record<string, any> = {
      currency: customData.currency,
      value: customData.value,
    };
    if (customData.contentIds && customData.contentIds.length > 0) {
      custom_data.content_ids = customData.contentIds;
      custom_data.content_type = "product";
    }
    if (customData.contentName) custom_data.content_name = customData.contentName;
    if (customData.numItems) custom_data.num_items = customData.numItems;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
          user_data,
          custom_data,
        },
      ],
    };
    if (testEventCode) payload.test_event_code = testEventCode;

    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(
        accessToken
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}
