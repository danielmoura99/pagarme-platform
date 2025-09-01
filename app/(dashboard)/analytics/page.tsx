// app/(dashboard)/analytics/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import AdminPasswordModal from "@/components/auth/admin-password-modal";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { BarChart3 } from "lucide-react";

// Componentes existentes
import { PixelAnalytics } from "./_components/pixel-analytics";
import { EventsList } from "./_components/event-list";
import { ConversionChart } from "./_components/conversion-chart";

// Novos componentes
import { ConversionFunnel } from "./_components/conversion-funnel";
import { TrafficSources } from "./_components/traffic-sources";
import { PeriodComparison } from "./_components/period-comparison";

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

export default function PixelAnalyticsPage() {
  const { isAuthenticated, isLoading, showModal, authenticate, onSuccess, onClose } = useAdminAuth();

  // Verificar autenticação ao carregar a página
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      authenticate();
    }
  }, [isLoading, isAuthenticated, authenticate]);

  // Loading state enquanto verifica autenticação
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

      {/* Resumo Principal */}
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <AnalyticsCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <div className="mb-6">
          <PixelAnalytics />
        </div>
      </Suspense>

      {/* Comparação de Períodos */}
      <Suspense fallback={<ChartSkeleton />}>
        <div className="mb-6">
          <PeriodComparison />
        </div>
      </Suspense>

      {/* Seção de Análise de Tráfego */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Análise de Tráfego</h2>
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          }
        >
          <TrafficSources />
        </Suspense>
      </div>

      {/* Seção de Funil e Conversão */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Funil de Conversão */}
        <div className="lg:col-span-1">
          <Suspense fallback={<ChartSkeleton />}>
            <ConversionFunnel />
          </Suspense>
        </div>

        {/* Gráficos de Conversão */}
        <div className="lg:col-span-2">
          <Suspense
            fallback={
              <div className="grid gap-4 md:grid-cols-2">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            }
          >
            <ConversionChart />
          </Suspense>
        </div>
      </div>

      {/* Lista de Leads e Conversões */}
      <Suspense fallback={<ChartSkeleton />}>
        <EventsList />
      </Suspense>
      </div>
    </>
  );
}
