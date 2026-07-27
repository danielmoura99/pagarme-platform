// lib/tracking/google-ads-api.ts
// Importação de conversões offline para o Google Ads (equivalente ao CAPI da Meta).
//
// Fluxo: OAuth2 refresh token → access token → ConversionUploadService.
// Projetado para NUNCA lançar exceção — falha aqui não pode derrubar o webhook.
//
// Requer (configurado em Integrações → Google Ads):
//   developer token com Basic access, client id/secret + refresh token OAuth2,
//   customer id da conta e a conversion action do tipo "upload de cliques".
import crypto from "crypto";
import { formatInTimeZone } from "date-fns-tz";

const GOOGLE_ADS_API_VERSION = "v25";
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const OAUTH_TOKEN_URL = "https://www.googleapis.com/oauth2/v3/token";
const TZ = "America/Sao_Paulo";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Email normalizado (trim + lowercase) e hasheado em SHA-256. */
function hashEmail(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return normalized ? sha256(normalized) : undefined;
}

/** Telefone em E.164 (+55DDDNUMERO) e hasheado em SHA-256. */
function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (!digits.startsWith("55")) digits = "55" + digits;
  return sha256(`+${digits}`);
}

/** Formato exigido pela API: "yyyy-MM-dd HH:mm:ss+|-HH:mm". */
function formatConversionDateTime(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd HH:mm:ssXXX");
}

/** Troca o refresh token por um access token de curta duração. */
async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ accessToken?: string; error?: string }> {
  try {
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      return {
        error: `OAuth HTTP ${res.status}: ${
          data.error_description || data.error || "sem access_token"
        }`,
      };
    }
    return { accessToken: data.access_token as string };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "erro de rede no OAuth",
    };
  }
}

export interface GoogleAdsCredentials {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  /** Somente dígitos, sem hífens. */
  customerId: string;
  /** Conta gerenciadora (MCC), quando aplicável. */
  loginCustomerId?: string | null;
  /** ID numérico da conversion action do tipo upload de cliques. */
  conversionActionId: string;
}

export interface GoogleConversionParams {
  /** Pelo menos um destes é obrigatório — sem click id não há o que importar. */
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  /** Momento da conversão (quando o pagamento foi confirmado). */
  conversionDateTime: Date;
  conversionValue: number;
  currencyCode?: string;
  /** ID do pedido — permite ajustes/dedup posteriores. */
  orderId: string;
  /** Enhanced conversions: melhoram o match. */
  email?: string | null;
  phone?: string | null;
}

export async function uploadClickConversion(
  credentials: GoogleAdsCredentials,
  params: GoogleConversionParams
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  try {
    const {
      developerToken,
      clientId,
      clientSecret,
      refreshToken,
      customerId,
      loginCustomerId,
      conversionActionId,
    } = credentials;

    if (
      !developerToken ||
      !clientId ||
      !clientSecret ||
      !refreshToken ||
      !customerId ||
      !conversionActionId
    ) {
      return { success: false, error: "credenciais incompletas" };
    }

    // Sem click id o Google não consegue atribuir a conversão a um anúncio.
    if (!params.gclid && !params.gbraid && !params.wbraid) {
      return { success: false, skipped: true, error: "sem gclid/gbraid/wbraid" };
    }

    const { accessToken, error: authError } = await getAccessToken(
      clientId,
      clientSecret,
      refreshToken
    );
    if (!accessToken) {
      return { success: false, error: authError || "falha ao obter access token" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversion: Record<string, any> = {
      conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
      conversionDateTime: formatConversionDateTime(params.conversionDateTime),
      conversionValue: params.conversionValue,
      currencyCode: params.currencyCode || "BRL",
      orderId: params.orderId,
    };
    if (params.gclid) conversion.gclid = params.gclid;
    else if (params.gbraid) conversion.gbraid = params.gbraid;
    else if (params.wbraid) conversion.wbraid = params.wbraid;

    // Enhanced conversions (máx. 5 identificadores por conversão)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userIdentifiers: Record<string, any>[] = [];
    const hashedEmail = hashEmail(params.email);
    const hashedPhone = hashPhone(params.phone);
    if (hashedEmail) {
      userIdentifiers.push({
        hashedEmail,
        userIdentifierSource: "FIRST_PARTY",
      });
    }
    if (hashedPhone) {
      userIdentifiers.push({
        hashedPhoneNumber: hashedPhone,
        userIdentifierSource: "FIRST_PARTY",
      });
    }
    if (userIdentifiers.length > 0) conversion.userIdentifiers = userIdentifiers;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    };
    if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

    const res = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${customerId}:uploadClickConversions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversions: [conversion],
          partialFailure: true,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        data?.error?.message || JSON.stringify(data).slice(0, 300) || `HTTP ${res.status}`;
      return { success: false, error: `HTTP ${res.status}: ${msg}` };
    }

    // Com partialFailure a resposta pode ser 200 mas conter erro por item
    if (data?.partialFailureError) {
      return {
        success: false,
        error: `partialFailure: ${
          data.partialFailureError.message || "erro no item"
        }`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}

// ─── Relatórios de campanha (GAQL) ───────────────────────────────────────────

export interface CampaignMetric {
  campaignId: string;
  campaignName: string;
  date: string; // "YYYY-MM-DD"
  impressions: number;
  clicks: number;
  cost: number; // BRL
  conversions: number;
  conversionsValue: number;
}

/**
 * Busca métricas diárias de campanha via GoogleAdsService.SearchStream.
 * Somente leitura — não altera nada na conta.
 */
export async function fetchCampaignMetrics(
  credentials: Omit<GoogleAdsCredentials, "conversionActionId">,
  dateFrom: string, // "YYYY-MM-DD"
  dateTo: string
): Promise<{ metrics?: CampaignMetric[]; error?: string }> {
  try {
    const { accessToken, error } = await getAccessToken(
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken
    );
    if (!accessToken) return { error: error || "falha ao obter access token" };

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    `.trim();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": credentials.developerToken,
      "Content-Type": "application/json",
    };
    if (credentials.loginCustomerId) {
      headers["login-customer-id"] = credentials.loginCustomerId;
    }

    const res = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${credentials.customerId}/googleAds:searchStream`,
      { method: "POST", headers, body: JSON.stringify({ query }) }
    );

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any)?.error?.message ||
        (Array.isArray(data) && data[0]?.error?.message) ||
        `HTTP ${res.status}`;
      return { error: msg };
    }

    // searchStream devolve um array de chunks, cada um com "results"
    const chunks = Array.isArray(data) ? data : [data];
    const metrics: CampaignMetric[] = [];

    for (const chunk of chunks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (chunk?.results ?? []) as any[]) {
        metrics.push({
          campaignId: String(row.campaign?.id ?? ""),
          campaignName: row.campaign?.name ?? "",
          date: row.segments?.date ?? "",
          impressions: Number(row.metrics?.impressions ?? 0),
          clicks: Number(row.metrics?.clicks ?? 0),
          // cost_micros: 1.000.000 micros = 1 unidade da moeda
          cost: Number(row.metrics?.costMicros ?? 0) / 1_000_000,
          conversions: Number(row.metrics?.conversions ?? 0),
          conversionsValue: Number(row.metrics?.conversionsValue ?? 0),
        });
      }
    }

    return { metrics };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}

/** Valida as credenciais fazendo uma chamada leve à API. */
export async function validateGoogleAdsCredentials(
  credentials: Omit<GoogleAdsCredentials, "conversionActionId">
): Promise<{ valid: boolean; error?: string }> {
  const { accessToken, error } = await getAccessToken(
    credentials.clientId,
    credentials.clientSecret,
    credentials.refreshToken
  );
  if (!accessToken) return { valid: false, error: error || "OAuth falhou" };

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": credentials.developerToken,
    };
    if (credentials.loginCustomerId) {
      headers["login-customer-id"] = credentials.loginCustomerId;
    }

    const res = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${credentials.customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1",
        }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        valid: false,
        error: data?.error?.message || `HTTP ${res.status}`,
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "erro de rede",
    };
  }
}
