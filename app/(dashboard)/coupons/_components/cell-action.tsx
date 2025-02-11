// app/(dashboard)/coupons/_components/cell-action.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "@/components/modals/alert-modal";
import { CouponColumn } from "./columns";
import { useToast } from "@/hooks/use-toast";

interface CellActionProps {
  data: CouponColumn;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(data.code);
    toast({
      description: "Código do cupom copiado!",
    });
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await fetch(`/api/coupons/${data.id}`, {
        method: "DELETE",
      });
      router.refresh();
      toast({
        description: "Cupom excluído com sucesso.",
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Ocorreu um erro ao excluir o cupom.",
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuItem onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" /> Copiar código
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/coupons/${data.id}`)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Trash className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
