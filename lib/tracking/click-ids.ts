// lib/tracking/click-ids.ts
// Captura e persiste os identificadores de clique de anúncios.
//
// O gclid (e as variantes iOS gbraid/wbraid) chega na URL da landing page e
// costuma se perder na navegação até o checkout. Persistimos em
// sessionStorage (sessão atual) + localStorage (backup), no mesmo padrão já
// usado para as UTMs.
//
// Sem o gclid gravado no pedido não é possível importar a conversão para o
// Google Ads depois — por isso a captura precisa acontecer o quanto antes.

const KEYS = ["gclid", "gbraid", "wbraid", "gad_campaignid"] as const;
type ClickIdKey = (typeof KEYS)[number];

export type ClickIds = {
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  /** ID da campanha do Google (gad_campaignid) — atribuição direta, sem UTM. */
  gadCampaignId: string | null;
  fbp: string | null;
  fbc: string | null;
};

/** Lê um parâmetro da URL da página anterior (a landing page do anúncio). */
function readFromReferrer(param: string): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    return new URL(document.referrer).searchParams.get(param);
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Extrai o click id dos cookies do Google (_gcl_aw / _gcl_gb).
 *
 * Formato: "GCL.<timestamp>.<click_id>".
 *
 * Por que isso importa: a landing page (thprop.com.br) e o checkout
 * (checkout.tradershouse.com.br) são domínios diferentes, então o gclid da URL
 * não atravessa sozinho — nem via storage, que é isolado por origem. O
 * cross-domain linking do Google (parâmetro "_gl" na URL) transfere estes
 * cookies entre os domínios, então lê-los é uma reserva confiável para quando
 * o gclid não vier explícito na URL do checkout.
 */
function parseGclCookie(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  // Precisa ter ao menos GCL + timestamp + valor
  if (parts.length < 3) return null;
  // O click id pode conter pontos — junta tudo a partir da terceira posição
  const value = parts.slice(2).join(".");
  return value || null;
}

/** Lê os click IDs da URL atual e persiste. Chamar no carregamento da página. */
export function persistClickIds(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of KEYS) {
      const value = params.get(key);
      if (value) {
        window.sessionStorage.setItem(key, value);
        window.localStorage.setItem(`${key}_backup`, value);
        window.localStorage.setItem("click_id_timestamp", Date.now().toString());
      }
    }
  } catch {
    // storage indisponível (modo privado/bloqueado) — captura é best-effort
  }
}

/** Recupera os click IDs: URL atual → sessão → backup local. */
export function getClickIds(): ClickIds {
  const empty: ClickIds = {
    gclid: null,
    gbraid: null,
    wbraid: null,
    gadCampaignId: null,
    fbp: null,
    fbc: null,
  };
  if (typeof window === "undefined") return empty;

  try {
    const params = new URLSearchParams(window.location.search);
    const read = (key: string) =>
      params.get(key) ||
      window.sessionStorage.getItem(key) ||
      window.localStorage.getItem(`${key}_backup`) ||
      null;

    const result = { ...empty };
    result.gclid = read("gclid");
    result.gbraid = read("gbraid");
    result.wbraid = read("wbraid");

    // gad_campaignid não tem cookie próprio: a reserva é o referrer, que em
    // um clique de anúncio é a landing page com o parâmetro na URL.
    result.gadCampaignId =
      read("gad_campaignid") || readFromReferrer("gad_campaignid");

    // Reserva do Google: se o click id não veio na URL nem ficou salvo
    // (caso típico de origem em outro domínio), busca nos cookies que o
    // cross-domain linking do Google transfere.
    if (!result.gclid) result.gclid = parseGclCookie(readCookie("_gcl_aw"));
    if (!result.gbraid) result.gbraid = parseGclCookie(readCookie("_gcl_gb"));

    // Última reserva: os click ids na URL da landing page (referrer)
    if (!result.gclid) result.gclid = readFromReferrer("gclid");
    if (!result.gbraid) result.gbraid = readFromReferrer("gbraid");
    if (!result.wbraid) result.wbraid = readFromReferrer("wbraid");

    // Meta: _fbp/_fbc são cookies criados pelo próprio pixel.
    result.fbp = readCookie("_fbp");
    // Se o cookie _fbc não existir (pixel bloqueado/ainda não gravou), monta
    // a partir do fbclid da URL no formato esperado pela Meta.
    const fbclid = params.get("fbclid");
    result.fbc =
      readCookie("_fbc") ||
      (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null);

    return result;
  } catch {
    return empty;
  }
}
