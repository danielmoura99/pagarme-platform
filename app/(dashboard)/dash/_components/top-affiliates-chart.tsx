// app/(dashboard)/dash/_components/top-affiliates-chart.tsx
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
  Cell,
} from "recharts";

interface AffiliateData {
  id: string;
  name: string;
  email: string;
  revenue: number;
  salesCount: number;
}

const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // green
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#84cc16", // lime
];

export function TopAffiliatesChart() {
  const [data, setData] = useState<AffiliateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/analytics/sales?months=12");
        const result = await response.json();
        setData(result.topAffiliates || []);
      } catch (error) {
        console.error("Error fetching top affiliates:", error);
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
          <CardTitle>Top Afiliados por Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Afiliados por Faturamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Nenhuma venda com afiliado encontrada</p>
          </div>
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

  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Afiliados por Faturamento</CardTitle>
        <p className="text-sm text-muted-foreground">
          Top 10 afiliados que mais geraram receita
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 100 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string, props: any) => {
                const percent = ((value / totalRevenue) * 100).toFixed(1);
                return [
                  <>
                    <div>{formatCurrency(value)} ({percent}%)</div>
                    <div className="text-xs text-muted-foreground">
                      {props.payload.salesCount} vendas
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {props.payload.email}
                    </div>
                  </>,
                  "Faturamento"
                ];
              }}
            />
            <Bar
              dataKey="revenue"
              radius={[0, 8, 8, 0]}
              label={{
                position: "right",
                formatter: (value: number) => formatCurrency(value),
                fontSize: 11,
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Lista com resumo */}
        <div className="mt-4 space-y-2">
          {data.map((affiliate, index) => {
            const percent = ((affiliate.revenue / totalRevenue) * 100).toFixed(1);
            return (
              <div key={affiliate.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-muted-foreground font-medium truncate">
                      {affiliate.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {affiliate.email}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 font-medium flex-shrink-0">
                  <span className="text-green-600">{formatCurrency(affiliate.revenue)}</span>
                  <span className="text-muted-foreground">({percent}%)</span>
                  <span className="text-xs">{affiliate.salesCount} vendas</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
