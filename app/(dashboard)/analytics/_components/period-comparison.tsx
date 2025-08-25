// app/(dashboard)/analytics/_components/period-comparison.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface PeriodData {
  events: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

interface ComparisonData {
  current: PeriodData;
  previous: PeriodData;
}

export function PeriodComparison() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparisonData();
  }, [period]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      // Buscar dados do período atual
      const currentResponse = await fetch(
        `/api/analytics/pixels?days=${period.slice(0, -1)}`
      );
      const currentData = await currentResponse.json();

      // Buscar dados do período anterior
      const previousDays = parseInt(period.slice(0, -1)) * 2;
      const previousResponse = await fetch(
        `/api/analytics/pixels?days=${previousDays}`
      );
      const previousData = await previousResponse.json();

      // Calcular dados do período anterior (subtraindo o período atual)
      const comparison: ComparisonData = {
        current: {
          events: currentData.summary.totalEvents,
          conversions: currentData.summary.totalConversions,
          revenue: currentData.summary.totalRevenue,
          conversionRate: currentData.summary.conversionRate,
        },
        previous: {
          events:
            previousData.summary.totalEvents - currentData.summary.totalEvents,
          conversions:
            previousData.summary.totalConversions -
            currentData.summary.totalConversions,
          revenue:
            previousData.summary.totalRevenue -
            currentData.summary.totalRevenue,
          conversionRate:
            ((previousData.summary.totalConversions -
              currentData.summary.totalConversions) /
              (previousData.summary.totalEvents -
                currentData.summary.totalEvents)) *
              100 || 0,
        },
      };

      setData(comparison);
    } catch (error) {
      console.error("Failed to fetch comparison data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatGrowth = (growth: number) => {
    const formatted = Math.abs(growth).toFixed(1);
    return growth >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPeriodLabel = (p: string) => {
    const days = p.slice(0, -1);
    return `Últimos ${days} dias`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      name: "Total de Eventos",
      current: data?.current.events || 0,
      previous: data?.previous.events || 0,
      growth: calculateGrowth(
        data?.current.events || 0,
        data?.previous.events || 0
      ),
    },
    {
      name: "Conversões",
      current: data?.current.conversions || 0,
      previous: data?.previous.conversions || 0,
      growth: calculateGrowth(
        data?.current.conversions || 0,
        data?.previous.conversions || 0
      ),
    },
    {
      name: "Receita",
      current: data?.current.revenue || 0,
      previous: data?.previous.revenue || 0,
      growth: calculateGrowth(
        data?.current.revenue || 0,
        data?.previous.revenue || 0
      ),
      format: "currency",
    },
    {
      name: "Taxa de Conversão",
      current: data?.current.conversionRate || 0,
      previous: data?.previous.conversionRate || 0,
      growth: calculateGrowth(
        data?.current.conversionRate || 0,
        data?.previous.conversionRate || 0
      ),
      format: "percentage",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Comparação de Períodos
        </CardTitle>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {getPeriodLabel(p)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{metric.name}</h3>
                <div className="flex items-center gap-2">
                  {metric.growth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      metric.growth >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatGrowth(metric.growth)}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Atual</div>
                  <div className="font-bold">
                    {metric.format === "currency"
                      ? formatCurrency(metric.current)
                      : metric.format === "percentage"
                        ? `${(metric.current || 0).toFixed(2)}%`
                        : metric.current}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Anterior</div>
                  <div>
                    {metric.format === "currency"
                      ? formatCurrency(metric.previous)
                      : metric.format === "percentage"
                        ? `${(metric.previous || 0).toFixed(2)}%`
                        : metric.previous}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
