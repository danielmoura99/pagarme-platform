// app/(dashboard)/analytics/page.tsx
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
//import { Skeleton } from "@/components/ui/skeleton";

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
  return (
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
  );
}
