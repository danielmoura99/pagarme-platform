"use client";
// <DataTable searchKey="name" columns={columns} data={data} />
// app/(dashboard)/products/_components/client.tsx
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ProductColumn } from "./columns";
import { FilterableProductTable } from "./filterable-product-table";

interface ProductClientProps {
  data: ProductColumn[]; // Usando o tipo importado
}

export function ProductClient({ data }: ProductClientProps) {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Produtos (${data.length})`}
          description="Gerencie seus produtos"
        />
        <Button onClick={() => router.push(`/products/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Produto
        </Button>
      </div>
      <Separator />
      <FilterableProductTable data={data} />
    </>
  );
}
