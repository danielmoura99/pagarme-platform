/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(dashboard)/recipients/_components/cell-action.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Link2, MoreHorizontal, Trash, KeyRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/modals/alert-modal";
import { RecipientColumn } from "./columns";
import { useToast } from "@/hooks/use-toast";
import GenerateLinkModal from "./generate-link-modal";

interface CellActionProps {
  data: RecipientColumn;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const onEdit = () => {
    // Nova rota de edição
    router.push(`/recipients/edit/${data.id}`);
  };

  const onResetPassword = async () => {
    try {
      setResetPasswordLoading(true);

      const response = await fetch(
        `/api/recipients/${data.id}/reset-password`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao resetar senha");
      }

      const result = await response.json();

      toast({
        title: "Senha resetada com sucesso!",
        description: "Nova senha: Senha@123",
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao resetar senha do afiliado.",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/recipients/${data.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao desativar recebedor");
      }

      router.refresh();
      toast({
        description: "Afiliado desativado com sucesso.",
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao desativar afiliado.",
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
        <DropdownMenuContent className="bg-white" align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <GenerateLinkModal
              affiliateId={data.id}
              trigger={
                <div className="flex items-center px-2 py-1.5 text-sm w-full">
                  <Link2 className="mr-2 h-4 w-4" /> Gerar Link
                </div>
              }
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onResetPassword}
            disabled={resetPasswordLoading}
            className="text-blue-600 focus:text-blue-600"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {resetPasswordLoading ? "Resetando..." : "Resetar Senha"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash className="mr-2 h-4 w-4" /> Desativar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
