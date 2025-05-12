// app/(dashboard)/analytics/_components/conversion-chart.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface ChartData {
  charts: {
    eventsByDay: Array<{
      date: string;
      totalEvents: number;
      conversions: number;
    }>;
    eventsByType: Array<{
      eventType: string;
      count: number;
    }>;
  };
}

export function ConversionChart() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const response = await fetch("/api/analytics/pixels");
      const result = await response.json();

      console.log("ConversionChart - Dados recebidos:", result);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Preparar dados para o gráfico de conversões por dia
  const formattedDayData =
    data?.charts?.eventsByDay?.map((item) => ({
      date: new Date(item.date).toLocaleDateString("pt-BR", {
        month: "short",
        day: "numeric",
      }),
      "Total de Eventos": item.totalEvents,
      Conversões: item.conversions,
    })) || [];

  // Preparar dados para o gráfico de eventos por tipo
  const formattedTypeData =
    data?.charts?.eventsByType?.map((item) => ({
      eventType: item.eventType,
      count: item.count,
    })) || [];

  console.log("ConversionChart - Dados formatados:", {
    formattedDayData,
    formattedTypeData,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Gráfico de Conversões por Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {formattedDayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={formattedDayData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="Total de Eventos"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="Conversões"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Eventos por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {formattedTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={formattedTypeData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="eventType" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
