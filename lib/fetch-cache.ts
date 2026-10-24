// lib/fetch-cache.ts
// Cache de curta duração para GETs do painel, compartilhado entre componentes.
//
// Existe por um motivo de custo, não de performance: o banco é Neon com
// scale-to-zero de 5 minutos. Requisições repetidas em intervalos menores
// que esse impedem a suspensão e o compute passa a ser cobrado 24h por dia.
// Limitando cada URL a uma ida à rede por minuto, o banco volta a ter
// janelas de silêncio.
//
// Também resolve o caso de vários componentes da mesma página pedirem a
// mesma coisa ao montar: a primeira requisição é reaproveitada pelas demais.
"use client";

export type RespostaCache = { ok: boolean; data: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const TTL_PADRAO_MS = 60_000;

const cache = new Map<string, { valor: RespostaCache; quando: number }>();
const emVoo = new Map<string, Promise<RespostaCache>>();

/**
 * Faz um GET reaproveitando requisições idênticas.
 *
 * Respostas com erro nunca são guardadas — uma falha deve poder ser tentada
 * de novo imediatamente.
 *
 * @param url     URL completa, já com querystring. É a chave do cache.
 * @param ttlMs   Por quanto tempo a resposta serve sem ir à rede.
 */
export function buscarComCache(url: string, ttlMs = TTL_PADRAO_MS): Promise<RespostaCache> {
  // Requisição igual em andamento: todos aguardam a mesma promessa
  const voo = emVoo.get(url);
  if (voo) return voo;

  const atual = cache.get(url);

  // Resposta recente o bastante: devolve sem tocar na rede
  if (atual && Date.now() - atual.quando < ttlMs) {
    return Promise.resolve(atual.valor);
  }

  // Aba em segundo plano com dado já carregado: devolve o que tem, por mais
  // velho que seja, e não vai à rede.
  //
  // Este é o ponto que realmente devolve silêncio ao banco. Só o TTL não
  // bastaria: uma aba esquecida pedindo de minuto em minuto continua abaixo
  // dos 5 minutos de ociosidade que o Neon exige para suspender o compute.
  // Quando o usuário volta para a aba, o primeiro pedido já passa direto.
  if (
    atual &&
    typeof document !== "undefined" &&
    document.visibilityState === "hidden"
  ) {
    return Promise.resolve(atual.valor);
  }

  const promessa = fetch(url, { cache: "no-store" })
    .then(async (r) => {
      const valor: RespostaCache = { ok: r.ok, data: await r.json() };
      if (r.ok) cache.set(url, { valor, quando: Date.now() });
      return valor;
    })
    .finally(() => {
      emVoo.delete(url);
    });

  emVoo.set(url, promessa);
  return promessa;
}
