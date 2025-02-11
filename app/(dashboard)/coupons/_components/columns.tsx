// app/(dashboard)/coupons/_components/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type CouponColumn = {
  id: string;
  code: string;
  active: boolean;
  discountPercentage: number;
  products: { id: string; name: string }[];
  usageCount: number;
  maxUses: number | null;
  createdAt: string;
  expiresAt: string | null;
};

export const columns: ColumnDef<CouponColumn>[] = [
  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => {
      return <div className="font-mono uppercase">{row.getValue("code")}</div>;
    },
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("active");
      const expired =
        row.original.expiresAt && new Date(row.original.expiresAt) < new Date();
      const maxedOut =
        row.original.maxUses && row.original.usageCount >= row.original.maxUses;

      let status: {
        label: string;
        variant: "default" | "destructive" | "secondary" | "outline";
      } = isActive
        ? { label: "Ativo", variant: "default" }
        : { label: "Inativo", variant: "destructive" };

      if (expired) {
        status = { label: "Expirado", variant: "secondary" };
      }
      if (maxedOut) {
        status = { label: "Limite Atingido", variant: "outline" };
      }

      return <Badge variant={status.variant}>{status.label}</Badge>;
    },
  },
  {
    accessorKey: "discountPercentage",
    header: "Desconto",
    cell: ({ row }) => {
      return <div>{row.getValue("discountPercentage")}%</div>;
    },
  },
  {
    id: "products",
    header: "Produtos",
    cell: ({ row }) => {
      const products = row.original.products;

      if (!products?.length) return "-";

      return (
        <div className="flex flex-wrap gap-1">
          {products.slice(0, 2).map((product) => (
            <Badge key={product.id} variant="secondary" className="text-xs">
              {product.name}
            </Badge>
          ))}
          {products.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{products.length - 2}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "usage",
    header: "Utilização",
    cell: ({ row }) => {
      const usageCount = row.original.usageCount;
      const maxUses = row.original.maxUses;

      return (
        <div>
          {usageCount}
          {maxUses ? ` / ${maxUses}` : ""}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Criado em",
    cell: ({ row }) => {
      const date = row.getValue("createdAt");
      if (!date) return null;
      return format(new Date(date as string), "PPp", { locale: ptBR });
    },
  },
  {
    accessorKey: "expiresAt",
    header: "Expira em",
    cell: ({ row }) => {
      const date = row.getValue("expiresAt");
      if (!date) return "Sem expiração";
      return format(new Date(date as string), "PPp", { locale: ptBR });
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
