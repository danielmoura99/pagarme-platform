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
    <>
      {/* Seletor de período */}
      <div className="flex justify-end">
        <DateRangePicker value={dateRange} onChange={handleDateChange} />
      </div>

      {/* Métricas principais */}
      <DashboardMetrics />

      {/* Tabela de transações */}
      <Card className="p-6">
        <TransactionsTable />
      </Card>
    </>
  );
}
