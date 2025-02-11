// app/(dashboard)/coupons/_components/client.tsx
"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { columns, CouponColumn } from "./columns";

interface CouponClientProps {
  data: CouponColumn[];
}

export function CouponClient({ data }: CouponClientProps) {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Cupons (${data.length})`}
          description="Gerencie seus cupons de desconto"
        />
        <Button onClick={() => router.push(`/coupons/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cupom
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="code" columns={columns} data={data} />
    </>
  );
}
