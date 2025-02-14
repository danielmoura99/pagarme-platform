// app/(dashboard)/recipients/_components/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";

export type RecipientColumn = {
  id: string;
  name: string;
  email: string;
  document: string;
  status: "active" | "inactive" | "suspended";
  bankAccount: {
    bank: string;
    agency: string;
    account: string;
  } | null;
  createdAt: string;
};

export const columns: ColumnDef<RecipientColumn>[] = [
  {
    accessorKey: "name",
    header: "Nome",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "document",
    header: "Documento",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={
            status === "active"
              ? "default"
              : status === "inactive"
              ? "secondary"
              : "destructive"
          }
        >
          {status === "active"
            ? "Ativo"
            : status === "inactive"
            ? "Inativo"
            : "Suspenso"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "bankAccount",
    header: "Conta Bancária",
    cell: ({ row }) => {
      const bankAccount = row.getValue(
        "bankAccount"
      ) as RecipientColumn["bankAccount"];
      if (!bankAccount) return "-";
      return `${bankAccount.bank} - Ag: ${bankAccount.agency} Conta: ${bankAccount.account}`;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Cadastrado em",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
