// app/(dashboard)/analytics/_components/conversion-funnel.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface FunnelData {
  pageViews: number;
  viewContent: number;
  initiateCheckout: number;
  addPaymentInfo: number;
  purchases: number;
  conversionRates: {
    viewToCheckout: number;
    checkoutToPurchase: number;
    overallConversion: number;
  };
}

export function ConversionFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFunnelData();
  }, []);

  const fetchFunnelData = async () => {
    try {
      const response = await fetch("/api/analytics/funnel");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch funnel data:", error);
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

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Erro ao carregar dados do funil
        </CardContent>
      </Card>
    );
  }

  const steps = [
    {
      name: "Visualizações de Página",
      value: data.pageViews,
      color: "bg-blue-500",
      icon: "👁️",
    },
    {
      name: "Conteúdo Visualizado",
      value: data.viewContent,
      color: "bg-green-500",
      icon: "📄",
    },
    {
      name: "Checkout Iniciado",
      value: data.initiateCheckout,
      color: "bg-yellow-500",
      icon: "🛒",
    },
    {
      name: "Pagamento Inserido",
      value: data.addPaymentInfo,
      color: "bg-orange-500",
      icon: "💳",
    },
    {
      name: "Compra Finalizada",
      value: data.purchases,
      color: "bg-purple-500",
      icon: "✅",
    },
  ];

  const maxValue = Math.max(...steps.map((step) => step.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
        <div className="text-sm text-muted-foreground">
          <p>
            Taxa geral:{" "}
            <Badge variant="secondary">
              {data.conversionRates.overallConversion.toFixed(2)}%
            </Badge>
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
            const dropRate =
              index > 0
                ? ((steps[index - 1].value - step.value) /
                    steps[index - 1].value) *
                  100
                : 0;

            return (
              <div key={step.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{step.icon}</span>
                    <span className="text-sm font-medium">{step.name}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-bold">
                      {step.value.toLocaleString()}
                    </div>
                    {index > 0 && dropRate > 0 && (
                      <div className="text-red-500 text-xs">
                        -{dropRate.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
                <Progress value={percentage} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{percentage.toFixed(1)}% do máximo</span>
                  {index > 0 && (
                    <span>
                      {((step.value / steps[index - 1].value) * 100).toFixed(1)}
                      % do anterior
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Métricas principais */}
        <div className="mt-6 pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span>Visualização → Checkout:</span>
            <span className="font-medium">
              {data.conversionRates.viewToCheckout.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Checkout → Compra:</span>
            <span className="font-medium">
              {data.conversionRates.checkoutToPurchase.toFixed(2)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
