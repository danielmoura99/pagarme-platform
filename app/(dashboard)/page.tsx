// app/(dashboard)/page.tsx
import { Suspense } from "react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DateProvider } from "./_components/date-context";
import { DashboardContent } from "./_components/dashboard-content";

export default function DashboardPage() {
  return (
    <DateProvider>
      <div className="w-full py-0 space-y-4">
        <div className="px-6 flex flex-col space-y-2">
          <Heading
            title="Visão Geral"
            description="Monitor de vendas e transações"
          />
          <Separator className="my-2" />
        </div>

        <div className="px-6">
          <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
            <DashboardContent />
          </Suspense>
        </div>
      </div>
    </DateProvider>
  );
}
