// app/(dashboard)/dash/_components/recent-sales.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentSale {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: string;
  createdAt: string;
  items: {
    productName: string;
    quantity: number;
    unitAmount: number;
  }[];
}

export function RecentSales() {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/analytics/sales?months=12");
        const result = await response.json();
        setSales(result.recentSales || []);
      } catch (error) {
        console.error("Error fetching recent sales:", error);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas Recentes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Últimas 10 vendas realizadas
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma venda encontrada
            </p>
          ) : (
            sales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-start justify-between border-b pb-4 last:border-0"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{sale.customerName}</p>
                    <Badge variant="outline" className="text-xs">
                      {sale.status === "paid" ? "Pago" : sale.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sale.customerEmail}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {sale.items.map((item, idx) => (
                      <div key={idx}>
                        {item.quantity}x {item.productName}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(sale.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{formatCurrency(sale.amount)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
