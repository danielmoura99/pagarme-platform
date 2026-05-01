// app/(dashboard)/recipients/_components/cell-action.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Link2, MoreHorizontal, Trash, KeyRound, Copy, Check, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertModal } from "@/components/modals/alert-modal";
import { RecipientColumn } from "./columns";
import { useToast } from "@/hooks/use-toast";
import GenerateLinkModal from "./generate-link-modal";

interface CellActionProps {
  data: RecipientColumn;
}

interface ResetResult {
  newPassword: string;
  affiliateName: string;
  affiliateEmail: string;
}

export function CellAction({ data }: CellActionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [copied, setCopied] = useState(false);

  const onEdit = () => {
    router.push(`/recipients/edit/${data.id}`);
  };

  const copyPassword = () => {
    if (!resetResult) return;
    navigator.clipboard.writeText(resetResult.newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onResetPassword = async () => {
    try {
      setResetPasswordLoading(true);

      const response = await fetch(
        `/api/recipients/${data.id}/reset-password`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Erro ao resetar senha");
      }

      const result = await response.json();
      setResetResult(result);
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

      {/* Modal com a nova senha gerada */}
      <Dialog open={!!resetResult} onOpenChange={() => { setResetResult(null); setCopied(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              Senha Resetada com Sucesso
            </DialogTitle>
            <DialogDescription>
              Copie a senha abaixo e envie para o afiliado. Ela não poderá ser visualizada novamente.
            </DialogDescription>
          </DialogHeader>

          {resetResult && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Afiliado:</span> {resetResult.affiliateName}</p>
                <p><span className="font-medium text-foreground">Email:</span> {resetResult.affiliateEmail}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Nova senha:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-3 rounded-md text-lg font-mono tracking-widest text-center select-all">
                    {resetResult.newPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyPassword}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Esta senha é exibida apenas uma vez. Após fechar este modal, não será possível recuperá-la.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={copyPassword} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar Senha"}
            </Button>
            <Button onClick={() => { setResetResult(null); setCopied(false); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
