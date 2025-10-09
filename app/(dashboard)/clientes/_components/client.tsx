// app/(dashboard)/clientes/_components/client.tsx
"use client";

import { useState } from "react";
import { ClientsTable } from "./clients-table";
import { SalesTable } from "./sales-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DateRangePicker } from "../../_components/date-range-picker";
import { useDateRange } from "../../_components/date-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ShoppingCart } from "lucide-react";

export const ClientsClient = () => {
  const { dateRange, setDateRange } = useDateRange();
  const [activeTab, setActiveTab] = useState("clients");

  return (
    <>
      <div className="flex flex-col space-y-4 mb-4">
        <div className="flex items-center justify-between">
          <Heading
            title="Clientes e Vendas"
            description="Base completa de clientes e vendas para acompanhamento"
          />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <Separator className="my-2" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Vendas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-0">
          <ClientsTable />
        </TabsContent>

        <TabsContent value="sales" className="mt-0">
          <SalesTable />
        </TabsContent>
      </Tabs>
    </>
  );
};
