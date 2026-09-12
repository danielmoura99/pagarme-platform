// app/(dashboard)/dash/_components/use-sales-data.ts
// Busca única de /api/analytics/sales compartilhada por todos os componentes.
//
// Antes cada componente fazia sua própria requisição — 6 chamadas idênticas
// por abertura da página, cada uma pesada. Aqui a primeira chamada é
// reaproveitada pelas demais enquanto estiver em andamento ou fresca.
"use client";

import { useEffect, useState } from "react";

export interface SalesData {
  metrics?: {
    totalSales: number;
    totalRevenue: number;
    averageTicket: number;
    salesGrowthRate: number;
    revenueGrowthRate: number;
  };
  allTimeMetrics?: { totalSales: number; totalRevenue: number; averageTicket: number };
  salesByMonth?: Array<{ month: string; sales: number; revenue: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  productsSold?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  affiliateStats?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topAffiliates?: any[];
}

const TTL_MS = 30_000;

let emVoo: Promise<SalesData> | null = null;
let cache: { dados: SalesData; quando: number } | null = null;

function buscar(): Promise<SalesData> {
  // Requisição em andamento: os outros componentes aguardam a mesma
  if (emVoo) return emVoo;

  // Resposta recente: reaproveita sem ir à rede
  if (cache && Date.now() - cache.quando < TTL_MS) {
    return Promise.resolve(cache.dados);
  }

  emVoo = fetch("/api/analytics/sales?months=12", { cache: "no-store" })
    .then((r) => r.json())
    .then((dados: SalesData) => {
      cache = { dados, quando: Date.now() };
      return dados;
    })
    .finally(() => {
      emVoo = null;
    });

  return emVoo;
}

/** Dados de vendas do dashboard, com uma única requisição para toda a página. */
export function useSalesData() {
  const [data, setData] = useState<SalesData | null>(cache?.dados ?? null);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let ativo = true;
    buscar()
      .then((d) => { if (ativo) setData(d); })
      .catch((e) => console.error("Erro ao carregar dados de vendas:", e))
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, []);

  return { data, loading };
}
