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

const KEYS = ["gclid", "gbraid", "wbraid"] as const;
type ClickIdKey = (typeof KEYS)[number];

export type ClickIds = Record<ClickIdKey, string | null> & {
  fbp: string | null;
  fbc: string | null;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
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
    fbp: null,
    fbc: null,
  };
  if (typeof window === "undefined") return empty;

  try {
    const params = new URLSearchParams(window.location.search);
    const result = { ...empty };
    for (const key of KEYS) {
      result[key] =
        params.get(key) ||
        window.sessionStorage.getItem(key) ||
        window.localStorage.getItem(`${key}_backup`) ||
        null;
    }

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
