// components/auth/admin-password-modal.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function AdminPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Área Restrita",
  description = "Esta área requer autenticação administrativa. Digite a senha para continuar."
}: AdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError("Digite a senha");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/admin-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          description: "Acesso autorizado!",
        });
        setPassword("");
        onSuccess();
      } else {
        setError("Senha incorreta");
        setPassword("");
        
        // Opcional: redirecionar para dashboard após 3 tentativas
        if (data.attempts && data.attempts >= 3) {
          toast({
            variant: "destructive",
            description: "Muitas tentativas incorretas. Retornando ao dashboard.",
          });
          setTimeout(() => {
            router.push("/");
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Erro na autenticação admin:", error);
      setError("Erro interno. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError("");
    onClose();
    router.push("/"); // Voltar para dashboard
  };

  const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Senha Administrativa</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              disabled={isLoading}
              className={error ? "border-red-500" : ""}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !password.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Acessar
            </Button>
          </DialogFooter>
        </form>

        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          <p>🔒 Área de administração protegida</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}