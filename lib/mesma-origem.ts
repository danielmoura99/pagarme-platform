import { NextResponse } from "next/server";

// Fetch Metadata limita chamadas entre sites feitas por navegadores e clientes
// que não enviam o cabeçalho. Não comprova a identidade/origem do cliente:
// Node, curl e automações podem enviar "same-origin" livremente.
// Não aplicar a webhooks ou APIs públicas de checkout.
// Na Vercel, alterar esta variável exige um novo deploy.
const DESATIVADO = process.env.ALLOW_EXTERNAL_API === "true";

/** Chamar antes da autenticação E do monitoramento, que também grava no banco. */
export function bloquearSeExterno(
  request: Request,
  rota: string
): NextResponse | null {
  if (DESATIVADO) return null;

  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin") return null;

  // Registrar só a origem, sem caminho, query string ou credenciais da URL.
  let origem = "(ausente ou inválida)";
  try {
    const url = new URL(request.headers.get("origin") ?? request.headers.get("referer") ?? "");
    if (url.protocol === "https:" || url.protocol === "http:") origem = url.origin.slice(0, 200);
  } catch { /* Cabeçalhos ausentes ou inválidos também são recusados. */ }
  const agente = request.headers.get("user-agent") ?? "(sem user-agent)";

  // O marcador indica rejeição pela política; não identifica quem chamou.
  console.warn("[API_EXTERNA_BLOQUEADA] " + JSON.stringify({
    rota,
    "sec-fetch-site": site?.slice(0, 40) ?? "(ausente)",
    origem,
    ua: agente.slice(0, 80),
  }));

  return NextResponse.json(
    { error: "Esta API é de uso interno do painel." },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}
