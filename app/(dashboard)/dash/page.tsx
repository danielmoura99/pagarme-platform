// app/(dashboard)/dash/page.tsx
import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Components
import { SalesMetrics } from "./_components/sales-metrics";
import { SalesByMonthChart } from "./_components/sales-by-month-chart";
import { ProductsSoldChart } from "./_components/products-sold-chart";
import { RevenueChart } from "./_components/revenue-chart";

// Loading skeletons
function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Heading
        title="Dashboard de Vendas"
        description="Acompanhe as métricas e performance de vendas dos seus produtos"
      />
      <Separator className="my-4" />

      {/* Métricas Principais */}
      <Suspense fallback={<MetricsSkeleton />}>
        <div className="mb-6">
          <SalesMetrics />
        </div>
      </Suspense>

      {/* Gráficos de Vendas */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Vendas por Mês */}
        <Suspense fallback={<ChartSkeleton />}>
          <SalesByMonthChart />
        </Suspense>

        {/* Produtos Vendidos */}
        <Suspense fallback={<ChartSkeleton />}>
          <ProductsSoldChart />
        </Suspense>
      </div>

      {/* Receita ao Longo do Tempo */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}
