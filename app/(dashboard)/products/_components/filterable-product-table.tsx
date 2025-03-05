// app/(dashboard)/products/_components/filterable-product-table.tsx
"use client";

import { useState, useEffect } from "react";
import { CustomDataTable } from "@/components/ui/custom-data-table"; // Importando o componente personalizado
import { ProductColumn, columns } from "./columns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterableProductTableProps {
  data: ProductColumn[];
}

export function FilterableProductTable({ data }: FilterableProductTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [filteredData, setFilteredData] = useState<ProductColumn[]>(data);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredData(data);
    } else if (statusFilter === "active") {
      setFilteredData(data.filter((item) => item.active));
    } else {
      setFilteredData(data.filter((item) => !item.active));
    }
  }, [statusFilter, data]);

  // Criar o elemento de filtro que será passado como extra
  const statusFilterElement = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filtrar por status" />
      </SelectTrigger>
      <SelectContent className="bg-white">
        <SelectItem value="active">Ativos</SelectItem>
        <SelectItem value="inactive">Inativos</SelectItem>
        <SelectItem value="all">Todos</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <CustomDataTable
        searchKey="name"
        columns={columns}
        data={filteredData}
        extraFilterElement={statusFilterElement}
      />
    </div>
  );
}
