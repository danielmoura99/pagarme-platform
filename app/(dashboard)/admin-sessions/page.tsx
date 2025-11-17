"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Monitor, Users, LogOut, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SessionData {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export default function AdminSessionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [forceReloginLoading, setForceReloginLoading] = useState(false);

  // Verificar se é admin
  useEffect(() => {
    // Só redireciona se a sessão já carregou e o usuário não é admin
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/");
    }
  }, [session, status, router]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/all-sessions");
      const data = await response.json();

      if (response.ok) {
        setSessions(data.sessions);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao carregar sessões",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só carrega sessões se for admin
    if (status === "authenticated" && session?.user?.role === "admin") {
      loadSessions();
    }
  }, [status, session]);

  const handleForceRelogin = async () => {
    if (!confirm("Tem certeza? Todos os usuários (incluindo você) serão deslogados e precisarão fazer login novamente.")) {
      return;
    }

    try {
      setForceReloginLoading(true);

      const response = await fetch("/api/admin/force-relogin", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao forçar relogin");
      }

      toast({
        title: "Sucesso!",
        description: data.message,
      });

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao forçar relogin",
      });
    } finally {
      setForceReloginLoading(false);
    }
  };

  const getBrowserName = (userAgent: string | null) => {
    if (!userAgent) return "Desconhecido";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Outro";
  };

  const groupedSessions = sessions.reduce((acc, sess) => {
    const userEmail = sess.user.email;
    if (!acc[userEmail]) {
      acc[userEmail] = {
        user: sess.user,
        sessions: [],
      };
    }
    acc[userEmail].sessions.push(sess);
    return acc;
  }, {} as Record<string, { user: SessionData["user"]; sessions: SessionData[] }>);

  // Mostrar loading enquanto carrega a sessão
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Se não for admin, não renderiza nada (o useEffect vai redirecionar)
  if (status === "authenticated" && session?.user?.role !== "admin") {
    return null;
  }

  return (
    <div className="w-full py-0 space-y-4">
      <div className="px-6 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <Heading
            title="Sessões Ativas"
            description="Monitore todos os usuários conectados ao sistema"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceRelogin}
              disabled={forceReloginLoading}
            >
              {forceReloginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Deslogar Todos
                </>
              )}
            </Button>
          </div>
        </div>
        <Separator className="my-2" />
      </div>

      <div className="px-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{sessions.length}</div>
                <div className="text-sm text-muted-foreground">Sessões Ativas</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{Object.keys(groupedSessions).length}</div>
                <div className="text-sm text-muted-foreground">Usuários Conectados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(groupedSessions).length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-muted-foreground">
              Nenhuma sessão ativa encontrada
            </CardContent>
          </Card>
        ) : (
          Object.values(groupedSessions).map(({ user, sessions: userSessions }) => (
            <Card key={user.email}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {user.name || user.email}
                </CardTitle>
                <CardDescription>
                  {user.email} • {user.role === "admin" ? "Administrador" : "Afiliado"} • {userSessions.length} sessão(ões)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 border rounded-lg space-y-2 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {getBrowserName(sess.userAgent)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          IP: {sess.ipAddress || "Desconhecido"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div>
                          Login: {format(new Date(sess.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                        <div>
                          Última atividade: {format(new Date(sess.lastActiveAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
