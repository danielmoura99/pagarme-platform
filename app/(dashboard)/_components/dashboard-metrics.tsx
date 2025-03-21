// app/(dashboard)/_components/dashboard-metrics.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreditCard,
  QrCode,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "./date-context";
import { Progress } from "@/components/ui/progress";

// Cores temáticas para os cartões
const cardThemes = {
  blue: {
    bgGradient: "bg-gradient-to-r from-blue-50 to-blue-100",
    iconBg: "bg-blue-500",
    progressBg: "bg-blue-200",
    progressFill: "bg-blue-500",
  },
  green: {
    bgGradient: "bg-gradient-to-r from-green-50 to-green-100",
    iconBg: "bg-green-500",
    progressBg: "bg-green-200",
    progressFill: "bg-green-500",
  },
  purple: {
    bgGradient: "bg-gradient-to-r from-purple-50 to-purple-100",
    iconBg: "bg-purple-500",
    progressBg: "bg-purple-200",
    progressFill: "bg-purple-500",
  },
  amber: {
    bgGradient: "bg-gradient-to-r from-amber-50 to-amber-100",
    iconBg: "bg-amber-500",
    progressBg: "bg-amber-200",
    progressFill: "bg-amber-500",
  },
};

interface MetricProps {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  theme: keyof typeof cardThemes;
  progressValue?: number; // Valor para a barra de progresso (0-100)
}

function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  theme,
  progressValue = 70,
}: MetricProps) {
  const themeClasses = cardThemes[theme];

  return (
    <Card
      className={`overflow-hidden border-0 shadow-sm ${themeClasses.bgGradient}`}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className={`rounded-full ${themeClasses.iconBg} p-2 text-white`}>
            {icon}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {trend && (
              <div
                className={`flex items-center text-xs font-medium ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {trend.value}%
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">{description}</p>

          {/* Barra de progresso */}
          <div className="pt-2">
            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
              <span>Percentual</span>
              <span>{progressValue}%</span>
            </div>
            <Progress
              value={progressValue}
              className={`h-1.5 ${themeClasses.progressBg}`}
              indicatorClassName={themeClasses.progressFill}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-8 w-[80px]" />
          <Skeleton className="h-3 w-[140px]" />

          <div className="pt-3">
            <div className="flex justify-between items-center mb-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full" />
          </div>
        </div>
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

  // Calcular progresso relativo dos métodos de pagamento
  const totalPayments = metrics.cardPayments + metrics.pixPayments;
  const cardProgress =
    totalPayments > 0
      ? Math.round((metrics.cardPayments / totalPayments) * 100)
      : 0;
  const pixProgress =
    totalPayments > 0
      ? Math.round((metrics.pixPayments / totalPayments) * 100)
      : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total de Transações"
        value={metrics.totalTransactions.toString()}
        description="Pedidos finalizados no período"
        icon={<TrendingUp className="h-4 w-4" />}
        trend={{ value: 12, isPositive: true }}
        theme="blue"
        progressValue={85}
      />
      <MetricCard
        title="Taxa de Conversão"
        value={`${metrics.conversionRate.toFixed(1)}%`}
        description="Checkout concluído vs. iniciado"
        icon={<Users className="h-4 w-4" />}
        trend={{ value: 3.5, isPositive: true }}
        theme="green"
        progressValue={metrics.conversionRate}
      />
      <MetricCard
        title="Cartão de Crédito"
        value={metrics.cardPayments.toString()}
        description="Transações via cartão"
        icon={<CreditCard className="h-4 w-4" />}
        trend={{ value: 8, isPositive: true }}
        theme="purple"
        progressValue={cardProgress}
      />
      <MetricCard
        title="Pagamentos PIX"
        value={metrics.pixPayments.toString()}
        description="Transações via PIX"
        icon={<QrCode className="h-4 w-4" />}
        trend={{ value: 24, isPositive: true }}
        theme="amber"
        progressValue={pixProgress}
      />
    </div>
  );
}
