// app/(dashboard)/recipients/_components/client.tsx
"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { columns, RecipientColumn } from "./columns";

export interface RecipientData {
  id: string;
  name: string;
  email: string;
  document: string;
  commission: number;
  active: boolean;
  createdAt: string;
}

interface RecipientClientProps {
  data: RecipientColumn[]; // Usar o tipo RecipientColumn
}

export function RecipientClient({ data }: RecipientClientProps) {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Afiliados (${data.length})`}
          description="Gerencie seus afiliados e recebedores"
        />
        <Button onClick={() => router.push(`/recipients/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Afiliado
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
}
