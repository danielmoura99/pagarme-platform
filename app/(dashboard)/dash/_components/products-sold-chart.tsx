// app/(dashboard)/dash/_components/products-sold-chart.tsx
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

interface ProductSoldData {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

// Cores para as barras
const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // green
];

export function ProductsSoldChart() {
  const [allProducts, setAllProducts] = useState<ProductSoldData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"quantity" | "revenue">("quantity");

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/analytics/sales?months=12");
        const result = await response.json();
        // Guardar todos os produtos (já vem ordenado por quantidade da API)
        setAllProducts(result.productsSold || []);
      } catch (error) {
        console.error("Error fetching products sold:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Reordenar e pegar top 5 baseado no modo selecionado
  const data = viewMode === "quantity"
    ? allProducts.slice(0, 5) // Top 5 por quantidade (já vem ordenado da API)
    : [...allProducts]
        .sort((a, b) => b.revenue - a.revenue) // Reordenar por faturamento
        .slice(0, 5); // Top 5 por faturamento

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular totais para porcentagens
  const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Top 5 produtos por {viewMode === "quantity" ? "quantidade vendida" : "faturamento"}
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
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 80 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={200}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 13 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string, props: any) => {
                if (viewMode === "quantity") {
                  const percent = ((value / totalQuantity) * 100).toFixed(1);
                  return [
                    <>
                      <div>{value} unidades ({percent}%)</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(props.payload.revenue)}
                      </div>
                    </>,
                    "Vendas"
                  ];
                } else {
                  const percent = ((value / totalRevenue) * 100).toFixed(1);
                  return [
                    <>
                      <div>{formatCurrency(value)} ({percent}%)</div>
                      <div className="text-xs text-muted-foreground">
                        {props.payload.quantity} unidades
                      </div>
                    </>,
                    "Faturamento"
                  ];
                }
              }}
            />
            <Bar
              dataKey={viewMode === "quantity" ? "quantity" : "revenue"}
              radius={[0, 8, 8, 0]}
              label={{ position: "right", formatter: (value: number) =>
                viewMode === "revenue" ? formatCurrency(value) : value
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
          {data.map((product, index) => {
            const quantityPercent = ((product.quantity / totalQuantity) * 100).toFixed(1);
            const revenuePercent = ((product.revenue / totalRevenue) * 100).toFixed(1);

            return (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{product.name}</span>
                </div>
                <div className="flex items-center gap-4 font-medium">
                  {viewMode === "quantity" ? (
                    <>
                      <span>{product.quantity} un.</span>
                      <span className="text-muted-foreground">({quantityPercent}%)</span>
                      <span className="text-green-600">{formatCurrency(product.revenue)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-green-600">{formatCurrency(product.revenue)}</span>
                      <span className="text-muted-foreground">({revenuePercent}%)</span>
                      <span>{product.quantity} un.</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
