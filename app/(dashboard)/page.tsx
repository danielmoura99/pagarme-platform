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
      <div className="container mx-3 py-8 space-y-6">
        <Heading
          title="Visão Geral"
          description="Monitor de vendas e transações"
        />
        <Separator />

        <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
          <DashboardContent />
        </Suspense>
      </div>
    </DateProvider>
  );
}
