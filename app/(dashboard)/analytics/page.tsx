// app/(dashboard)/analytics/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminPasswordModal from "@/components/auth/admin-password-modal";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { BarChart3, Calendar, X } from "lucide-react";

import { PixelAnalytics } from "./_components/pixel-analytics";
import { EventsList } from "./_components/event-list";
import { TrafficSources } from "./_components/traffic-sources";
import { PaidMedia } from "./_components/paid-media";

// Componente de loading para os cards
function AnalyticsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de loading para gráficos
function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );
}

function getMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function PixelAnalyticsPage() {
  const { isAuthenticated, isLoading, showModal, authenticate, onSuccess, onClose } = useAdminAuth();
  const [fromDate, setFromDate] = useState<string>(getMonthStart());
  const [toDate, setToDate] = useState<string>(getToday());
  const [inputFrom, setInputFrom] = useState<string>(getMonthStart());
  const [inputTo, setInputTo] = useState<string>(getToday());

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      authenticate();
    }
  }, [isLoading, isAuthenticated, authenticate]);

  const handleApplyFilter = () => { setFromDate(inputFrom); setToDate(inputTo); };
  const handleClearFilter = () => {
    const start = getMonthStart(); const end = getToday();
    setFromDate(start); setToDate(end);
    setInputFrom(start); setInputTo(end);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  // Não renderizar conteúdo se não estiver autenticado
  if (!isAuthenticated) {
    return (
      <>
        <AdminPasswordModal
          isOpen={showModal}
          onClose={onClose}
          onSuccess={onSuccess}
          title="Área de Analytics"
          description="Esta área requer autenticação administrativa. Digite a senha para acessar os dados analíticos e métricas."
        />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-semibold">Área Restrita</h2>
              <p className="text-muted-foreground">Aguardando autenticação...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPasswordModal
        isOpen={showModal}
        onClose={onClose}
        onSuccess={onSuccess}
        title="Área de Analytics"
        description="Esta área requer autenticação administrativa. Digite a senha para acessar os dados analíticos e métricas."
      />

      <div className="container mx-auto py-8">
        <Heading
          title="Analytics de Pixels"
          description="Acompanhe o desempenho dos seus pixels de rastreamento"
        />
        <Separator className="my-4" />

        {/* Filtro de data */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/40 rounded-lg border">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap">Período:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">De:</span>
            <Input
              type="date"
              value={inputFrom}
              onChange={(e) => setInputFrom(e.target.value)}
              className="w-40 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Até:</span>
            <Input
              type="date"
              value={inputTo}
              onChange={(e) => setInputTo(e.target.value)}
              className="w-40 h-8 text-sm"
            />
          </div>
          <Button size="sm" onClick={handleApplyFilter}>
            Aplicar
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClearFilter} className="gap-1">
            <X className="h-3 w-3" />
            Mês atual
          </Button>
          <span className="text-xs text-muted-foreground">
            {new Date(fromDate + "T00:00:00").toLocaleDateString("pt-BR")} — {new Date(toDate + "T00:00:00").toLocaleDateString("pt-BR")}
          </span>
        </div>

        {/* Resumo Principal */}
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {[...Array(4)].map((_, i) => <AnalyticsCardSkeleton key={i} />)}
            </div>
          }
        >
          <div className="mb-6">
            <PixelAnalytics fromDate={fromDate} toDate={toDate} />
          </div>
        </Suspense>

        {/* Performance de Mídia Paga */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Performance de Mídia Paga</h2>
          <Suspense fallback={<ChartSkeleton />}>
            <PaidMedia fromDate={fromDate} toDate={toDate} />
          </Suspense>
        </div>

        {/* Análise de Tráfego */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Análise de Tráfego</h2>
          <Suspense fallback={<ChartSkeleton />}>
            <TrafficSources fromDate={fromDate} toDate={toDate} />
          </Suspense>
        </div>

        {/* Lista de Leads */}
        <Suspense fallback={<ChartSkeleton />}>
          <EventsList fromDate={fromDate} toDate={toDate} />
        </Suspense>
      </div>
    </>
  );
}
