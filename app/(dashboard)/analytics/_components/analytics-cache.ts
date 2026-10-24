// app/(dashboard)/analytics/_components/analytics-cache.ts
// Busca compartilhada de /api/analytics/pixels.
//
// Cinco componentes da página consultam esta rota, e dois deles montam a
// mesma URL. Pior: trocar de aba desmonta e remonta os componentes, então
// cada ida e volta refazia todas as requisições. A rota custa ~14 queries
// por chamada, e isso a tornou a mais chamada do projeto.
"use client";

import { buscarComCache, type RespostaCache } from "@/lib/fetch-cache";

/**
 * Consulta /api/analytics/pixels reaproveitando requisições idênticas.
 * @param query querystring já montada (sem o "?")
 */
export function buscarAnalyticsPixels(query: string): Promise<RespostaCache> {
  return buscarComCache(`/api/analytics/pixels?${query}`);
}
