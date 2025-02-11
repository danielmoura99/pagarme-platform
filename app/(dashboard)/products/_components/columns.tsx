// app/(dashboard)/products/_components/columns.tsx
"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ProductColumn = {
  id: string;
  productId: number;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  createdAt: string;
};

const CheckoutLink = ({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");

  useEffect(() => {
    setCheckoutUrl(`${window.location.origin}/checkout?productId=${id}`);
  }, [id]);

  const onCopy = () => {
    if (!checkoutUrl) return;
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!checkoutUrl) return null;

  return (
    <div className="flex items-center gap-2">
      <code className="bg-muted px-2 py-1 rounded text-sm">
        {checkoutUrl.length > 40
          ? `${checkoutUrl.substring(0, 40)}...`
          : checkoutUrl}
      </code>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copiado!" : "Copiar link"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export const columns: ColumnDef<ProductColumn>[] = [
  {
    accessorKey: "productId",
    header: "ID",
    cell: ({ row }) => {
      return <div className="font-medium">#{row.getValue("productId")}</div>;
    },
  },
  {
    accessorKey: "name",
    header: "Nome",
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => {
      const description = row.getValue("description") as string;
      if (!description) return "-";

      const truncated =
        description.length > 50
          ? `${description.substring(0, 50)}...`
          : description;

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">{truncated}</div>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "price",
    header: "Preço",
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(price / 100);

      return <div>{formatted}</div>;
    },
  },
  {
    accessorKey: "active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("active");

      return (
        <Badge variant={isActive ? "default" : "destructive"}>
          {isActive ? "Ativo" : "Inativo"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Data",
  },
  {
    id: "checkout",
    header: "Link do Checkout",
    cell: ({ row }) => <CheckoutLink id={row.original.id} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];
