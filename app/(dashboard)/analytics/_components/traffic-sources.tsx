// app/(dashboard)/analytics/_components/traffic-sources.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface TrafficSource {
  source: string;
  medium: string;
  visitors: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export function TrafficSources() {
  const [data, setData] = useState<TrafficSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrafficSources();
  }, []);

  const fetchTrafficSources = async () => {
    try {
      const response = await fetch("/api/analytics/traffic-sources");
      const result = await response.json();
      setData(result.sources || []);
    } catch (error) {
      console.error("Failed to fetch traffic sources:", error);
    } finally {
      setLoading(false);
    }
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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Preparar dados para o gráfico de pizza
  const pieData = data.map((item, index) => ({
    name: `${item.source}/${item.medium}`,
    value: item.visitors,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Gráfico de Pizza */}
      <Card>
        <CardHeader>
          <CardTitle>Visitantes por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabela de Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((source, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-medium">
                      {source.source || "Direct"}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {source.medium || "None"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {source.conversionRate.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Conv. Rate
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{source.visitors}</div>
                    <div className="text-xs text-muted-foreground">
                      Visitantes
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{source.conversions}</div>
                    <div className="text-xs text-muted-foreground">
                      Conversões
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {formatCurrency(source.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground">Receita</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
