// lib/facebook-ads.ts
// Client para a Meta Marketing API

const META_API_VERSION = "v21.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const APP_ID = process.env.META_APP_ID!;
const APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = process.env.META_REDIRECT_URI!;

// ─── OAuth URLs ───────────────────────────────────────────────────────────────

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: "ads_read,ads_management",
    state,
    response_type: "code",
  });
  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params}`;
}

// ─── Troca code por short-lived token e depois por long-lived ─────────────────

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  // 1. Troca code → short-lived token (1h)
  const shortParams = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
  });
  const shortRes = await fetch(
    `${META_API_BASE}/oauth/access_token?${shortParams}`
  );
  const shortData = await shortRes.json();
  if (shortData.error) {
    throw new Error(`[META_OAUTH_CODE_EXCHANGE] ${shortData.error.message}`);
  }
  const shortToken: string = shortData.access_token;

  // 2. Troca short-lived → long-lived (60 dias)
  const longParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const longRes = await fetch(
    `${META_API_BASE}/oauth/access_token?${longParams}`
  );
  const longData = await longRes.json();
  if (longData.error) {
    throw new Error(`[META_OAUTH_LONG_LIVED] ${longData.error.message}`);
  }

  const expiresIn: number = longData.expires_in || 5184000; // 60 dias padrão
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  return { accessToken: longData.access_token, expiresAt };
}

// ─── Refresh do token (quando está prestes a expirar) ────────────────────────

export async function refreshLongLivedToken(currentToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: currentToken,
  });
  const res = await fetch(`${META_API_BASE}/oauth/access_token?${params}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(`[META_TOKEN_REFRESH] ${data.error.message}`);
  }
  const expiresIn: number = data.expires_in || 5184000;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  return { accessToken: data.access_token, expiresAt };
}

// ─── Buscar contas de anúncio disponíveis ────────────────────────────────────

export interface AdAccount {
  id: string;          // "act_XXXXXXX"
  name: string;
  currency: string;
  account_status: number; // 1 = ativo
}

export async function fetchAdAccounts(accessToken: string): Promise<AdAccount[]> {
  const params = new URLSearchParams({
    fields: "id,name,currency,account_status",
    access_token: accessToken,
    limit: "50",
  });
  const res = await fetch(`${META_API_BASE}/me/adaccounts?${params}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(`[META_AD_ACCOUNTS] ${data.error.message}`);
  }
  return (data.data || []) as AdAccount[];
}

// ─── Buscar insights de campanhas ────────────────────────────────────────────

export interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks: string;
  spend: string;
  reach: string;
  cpc: string;
  cpm: string;
  ctr: string;
}

export async function fetchCampaignInsights(
  accessToken: string,
  adAccountId: string,
  dateFrom: string, // "YYYY-MM-DD"
  dateTo: string    // "YYYY-MM-DD"
): Promise<CampaignInsight[]> {
  const params = new URLSearchParams({
    fields: [
      "campaign_id",
      "campaign_name",
      "adset_id",
      "adset_name",
      "impressions",
      "clicks",
      "spend",
      "reach",
      "cpc",
      "cpm",
      "ctr",
    ].join(","),
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    level: "adset",
    time_increment: "1",
    limit: "500",
    access_token: accessToken,
  });

  const allResults: CampaignInsight[] = [];
  let url: string | null = `${META_API_BASE}/${adAccountId}/insights?${params}`;

  // Paginar resultados
  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      throw new Error(`[META_INSIGHTS] ${data.error.message}`);
    }
    if (data.data) {
      allResults.push(...data.data);
    }
    url = data.paging?.next || null;
  }

  return allResults;
}

// ─── Verificar se token precisa de refresh (< 7 dias para expirar) ───────────

export function tokenNeedsRefresh(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return expiresAt.getTime() - Date.now() < sevenDaysMs;
}

export function tokenIsExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() < Date.now();
}
