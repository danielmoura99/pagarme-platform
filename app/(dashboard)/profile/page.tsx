// app/(dashboard)/profile/page.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, KeyRound } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar senha");
      }

      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso.",
      });

      // Limpar campos
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao alterar senha",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full py-0 space-y-4">
      <div className="px-6 flex flex-col space-y-2">
        <Heading
          title="Meu Perfil"
          description="Gerencie suas informações pessoais e senha"
        />
        <Separator className="my-2" />
      </div>

      <div className="px-6 space-y-6">
        {/* Card de Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>
              Suas informações de conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome
              </Label>
              <div className="px-3 py-2 bg-gray-50 border rounded-md">
                {session?.user?.name || "Não informado"}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <div className="px-3 py-2 bg-gray-50 border rounded-md">
                {session?.user?.email || "Não informado"}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Conta</Label>
              <div className="px-3 py-2 bg-gray-50 border rounded-md">
                {session?.user?.role === "admin" ? "Administrador" : "Afiliado"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Altere sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button
                onClick={() => setShowPasswordForm(true)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Alterar Senha
              </Button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual *</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha (mínimo 6 caracteres)"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente a nova senha"
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
