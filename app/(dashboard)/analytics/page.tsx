// app/(dashboard)/analytics/page.tsx
//import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { PixelAnalytics } from "./_components/pixel-analytics";
import { EventsList } from "./_components/event-list";
import { ConversionChart } from "./_components/conversion-chart";

export default function PixelAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <Heading
        title="Analytics de Pixels"
        description="Acompanhe o desempenho dos seus pixels de rastreamento"
      />
      <Separator className="my-4" />

      <div className="grid gap-6">
        {/* Cards de resumo */}
        <PixelAnalytics />

        {/* Gráfico de conversões */}
        <ConversionChart />

        {/* Lista de eventos recentes */}
        <EventsList />
      </div>
    </div>
  );
}
