// app/(dashboard)/clientes/_components/client.tsx
"use client";

import { ClientsTable } from "./clients-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "../../_components/date-range-picker";
import { useDateRange } from "../../_components/date-context";

export const ClientsClient = () => {
  const { dateRange, setDateRange } = useDateRange();

  return (
    <>
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex items-center justify-between">
          <Heading
            title="Clientes"
            description="Base completa dos clientes para acompanhamento"
          />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <Separator className="my-2" />
      </div>
      <ClientsTable />
    </>
  );
};
