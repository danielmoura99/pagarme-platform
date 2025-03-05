// app/(dashboard)/_components/dashboard-metrics.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, QrCode, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "./date-context";

interface MetricProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, description, icon }: MetricProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[50px] mb-2" />
        <Skeleton className="h-3 w-[140px]" />
      </CardContent>
    </Card>
  );
}

export function DashboardMetrics() {
  const { dateRange } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    conversionRate: 0,
    cardPayments: 0,
    pixPayments: 0,
  });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);

        // Usar o período do contexto
        const queryParams = new URLSearchParams({
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        });

        const response = await fetch(
          `/api/dashboard/metrics?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch metrics");
        }

        const data = await response.json();

        setMetrics({
          totalTransactions: data.totalTransactions || 0,
          conversionRate: data.conversionRate || 0,
          cardPayments: data.cardPayments || 0,
          pixPayments: data.pixPayments || 0,
        });
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [dateRange]); // Dependência do contexto

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total de Transações"
        value={metrics.totalTransactions.toString()}
        description="Pedidos finalizados no período"
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
      />
      <MetricCard
        title="Taxa de Conversão"
        value={`${metrics.conversionRate.toFixed(1)}%`}
        description="Checkout concluído vs. iniciado"
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
      />
      <MetricCard
        title="Pagamentos por Cartão"
        value={metrics.cardPayments.toString()}
        description="Transações via cartão de crédito"
        icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
      />
      <MetricCard
        title="Pagamentos por PIX"
        value={metrics.pixPayments.toString()}
        description="Transações via PIX"
        icon={<QrCode className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
}
