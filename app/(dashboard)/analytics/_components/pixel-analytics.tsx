// app/(dashboard)/analytics/_components/pixel-analytics.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Eye, ShoppingCart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  summary: {
    totalEvents: number;
    totalConversions: number;
    totalRevenue: number;
    conversionRate: number;
  };
  charts: {
    eventsByType: Array<{ eventType: string; count: number }>;
    eventsByDay: Array<{
      date: string;
      totalEvents: number;
      conversions: number;
    }>;
  };
  platforms: {
    pixelsByPlatform: Array<{ platform: string; count: number }>;
  };
}

export function PixelAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/analytics/pixels");
      const result = await response.json();

      if (response.ok) {
        setData(result);
      } else {
        // Se a API retornou um erro estruturado, usar os dados padrão
        if (result.summary) {
          setData(result);
        } else {
          throw new Error(result.message || "Erro ao carregar dados");
        }
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setError(
        error instanceof Error ? error.message : "Erro ao carregar dados"
      );
      // Definir dados padrão em caso de erro
      setData({
        summary: {
          totalEvents: 0,
          totalConversions: 0,
          totalRevenue: 0,
          conversionRate: 0,
        },
        charts: {
          eventsByType: [],
          eventsByDay: [],
        },
        platforms: {
          pixelsByPlatform: [],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total de Eventos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total de Eventos
          </CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.summary.totalEvents || 0}
          </div>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
        </CardContent>
      </Card>

      {/* Conversões */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversões</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.summary.totalConversions || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {(data?.summary.conversionRate || 0).toFixed(2)}% taxa de conversão
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
            {formatCurrency(data?.summary.totalRevenue || 0)}
          </div>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
        </CardContent>
      </Card>

      {/* Pixels Ativos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pixels Ativos</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.platforms.pixelsByPlatform?.reduce(
              (sum, item) => sum + item.count,
              0
            ) || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.platforms.pixelsByPlatform?.length || 0} plataformas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
