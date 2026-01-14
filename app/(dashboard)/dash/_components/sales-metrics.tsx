// app/(dashboard)/dash/_components/sales-metrics.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  TrendingDown,
} from "lucide-react";

interface Metrics {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesGrowthRate: number;
  revenueGrowthRate: number;
}

export function SalesMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/analytics/sales?months=12");
        const result = await response.json();
        setMetrics(result.metrics || {
          totalSales: 0,
          totalRevenue: 0,
          averageTicket: 0,
          salesGrowthRate: 0,
          revenueGrowthRate: 0,
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
        setMetrics({
          totalSales: 0,
          totalRevenue: 0,
          averageTicket: 0,
          salesGrowthRate: 0,
          revenueGrowthRate: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Total de Vendas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalSales}</div>
          <p className="text-xs text-muted-foreground">
            Vendas realizadas no período
          </p>
        </CardContent>
      </Card>

      {/* Receita Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Faturamento acumulado
          </p>
        </CardContent>
      </Card>

      {/* Ticket Médio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.averageTicket)}
          </div>
          <p className="text-xs text-muted-foreground">
            Valor médio por venda
          </p>
        </CardContent>
      </Card>

      {/* Crescimento em Vendas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Crescimento (Qtd)</CardTitle>
          {(metrics.salesGrowthRate ?? 0) >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            (metrics.salesGrowthRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {(metrics.salesGrowthRate ?? 0) > 0 ? "+" : ""}
            {(metrics.salesGrowthRate ?? 0).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Vendas: mês anterior vs retrasado
          </p>
        </CardContent>
      </Card>

      {/* Crescimento em Faturamento */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Crescimento (R$)</CardTitle>
          {(metrics.revenueGrowthRate ?? 0) >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            (metrics.revenueGrowthRate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {(metrics.revenueGrowthRate ?? 0) > 0 ? "+" : ""}
            {(metrics.revenueGrowthRate ?? 0).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Receita: mês anterior vs retrasado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
