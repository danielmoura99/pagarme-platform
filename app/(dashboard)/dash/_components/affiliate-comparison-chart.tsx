// app/(dashboard)/dash/_components/affiliate-comparison-chart.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthData {
  month: string;
  withAffiliate: number;
  withAffiliateRevenue: number;
  withoutAffiliate: number;
  withoutAffiliateRevenue: number;
}

interface AffiliateStats {
  withAffiliate: {
    count: number;
    revenue: number;
  };
  withoutAffiliate: {
    count: number;
    revenue: number;
  };
  byMonth: MonthData[];
}

export function AffiliateComparisonChart() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"quantity" | "revenue">("quantity");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/sales?months=12`);
        const result = await response.json();
        setStats(result.affiliateStats || null);
      } catch (error) {
        console.error("Error fetching affiliate stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas Com vs Sem Afiliação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Dados por mês para o gráfico de barras empilhadas
  const chartData = stats.byMonth || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vendas Com vs Sem Afiliação</CardTitle>
            <p className="text-sm text-muted-foreground">
              Comparação mensal por {viewMode === "quantity" ? "quantidade" : "faturamento"}
            </p>
          </div>
          {/* Toggle Switch */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => setViewMode("quantity")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === "quantity"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Quantidade
            </button>
            <button
              onClick={() => setViewMode("revenue")}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                viewMode === "revenue"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Faturamento
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-sm"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-sm"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) =>
                viewMode === "revenue" ? formatCurrency(value) : value
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                const displayName = name === "withAffiliate" || name === "withAffiliateRevenue"
                  ? "Com Afiliação"
                  : "Sem Afiliação";

                if (viewMode === "quantity") {
                  return [`${value} vendas`, displayName];
                } else {
                  return [formatCurrency(value), displayName];
                }
              }}
            />
            <Legend
              formatter={(value) => {
                if (value === "withAffiliate" || value === "withAffiliateRevenue") {
                  return "Com Afiliação";
                }
                return "Sem Afiliação";
              }}
            />
            <Bar
              dataKey={viewMode === "quantity" ? "withAffiliate" : "withAffiliateRevenue"}
              stackId="a"
              fill="#3b82f6"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey={viewMode === "quantity" ? "withoutAffiliate" : "withoutAffiliateRevenue"}
              stackId="a"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Resumo em cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-sm font-medium">Com Afiliação</span>
            </div>
            <p className="text-2xl font-bold">{stats.withAffiliate.count}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(stats.withAffiliate.revenue)}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-sm font-medium">Sem Afiliação</span>
            </div>
            <p className="text-2xl font-bold">{stats.withoutAffiliate.count}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(stats.withoutAffiliate.revenue)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
