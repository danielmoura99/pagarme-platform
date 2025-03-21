// app/(dashboard)/_components/dashboard-content.tsx
"use client";

import { Card } from "@/components/ui/card";
import { useDateRange } from "./date-context";
import { DateRangePicker } from "./date-range-picker";
import { DashboardMetrics } from "./dashboard-metrics";
import { TransactionsTable } from "./transactions-table";

export function DashboardContent() {
  const { dateRange, setDateRange } = useDateRange();

  const handleDateChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Seletor de período com alinhamento à direita */}
      <div className="flex justify-end mb-2">
        <DateRangePicker value={dateRange} onChange={handleDateChange} />
      </div>

      {/* Métricas principais */}
      <DashboardMetrics />

      {/* Tabela de transações */}
      <Card className="p-4 md:p-6 w-full">
        <TransactionsTable />
      </Card>
    </div>
  );
}
