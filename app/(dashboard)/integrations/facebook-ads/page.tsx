// app/(dashboard)/integrations/facebook-ads/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Unplug,
  Zap,
  ChevronDown,
} from "lucide-react";

interface Config {
  connected: boolean;
  enabled: boolean;
  adAccountId: string | null;
  adAccountName: string | null;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  tokenExpired: boolean;
  autoSync: boolean;
  syncInterval: number;
}

interface AdAccount {
  id: string;
  name: string;
  currency: string;
}

interface SyncLog {
  id: string;
  status: string;
  campaigns: number;
  dateRange: string | null;
  errorMessage: string | null;
  duration: number | null;
  createdAt: string;
}

export default function FacebookAdsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectingUrl, setConnectingUrl] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Verificar parâmetros de retorno do OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setMessage({ type: "success", text: "Conta conectada com sucesso!" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("error")) {
      setMessage({ type: "error", text: `Erro: ${params.get("error")}` });
      window.history.replaceState({}, "", window.location.pathname);
    }

    fetchConfig();
    fetchLogs();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/facebook-ads/config");
      const data = await res.json();
      setConfig(data);

      // Se conectado, buscar contas de anúncio
      if (data.connected && !data.tokenExpired) {
        const accRes = await fetch("/api/integrations/facebook-ads/accounts");
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao carregar configuração" });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/integrations/facebook-ads/sync-logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {}
  };

  const handleConnect = async () => {
    setConnectingUrl(true);
    try {
      const res = await fetch("/api/integrations/facebook-ads/connect");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setMessage({ type: "error", text: "Erro ao iniciar conexão" });
      setConnectingUrl(false);
    }
  };

  const handleSelectAccount = async (account: AdAccount) => {
    try {
      await fetch("/api/integrations/facebook-ads/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId: account.id, adAccountName: account.name }),
      });
      setShowAccounts(false);
      setMessage({ type: "success", text: `Conta "${account.name}" selecionada!` });
      fetchConfig();
    } catch {
      setMessage({ type: "error", text: "Erro ao selecionar conta" });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/facebook-ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage({ type: "success", text: `Sync concluído: ${data.campaigns} campanhas em ${(data.duration / 1000).toFixed(1)}s` });
      fetchConfig();
      fetchLogs();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro ao sincronizar" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Deseja desconectar o Facebook Ads? Os dados já importados serão mantidos.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/integrations/facebook-ads/disconnect", { method: "POST" });
      setMessage({ type: "success", text: "Conta desconectada." });
      fetchConfig();
    } catch {
      setMessage({ type: "error", text: "Erro ao desconectar" });
    } finally {
      setDisconnecting(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("pt-BR");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const isConnected = config?.connected && !config?.tokenExpired;

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Heading
        title="Facebook Ads"
        description="Conecte sua conta de anúncios para importar métricas de campanhas e calcular ROAS."
      />
      <Separator className="my-4" />

      {/* Alerta de feedback */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {message.type === "success"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Card de status */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Status da Conexão</CardTitle>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-600" : ""}>
            {isConnected ? "Conectado" : config?.tokenExpired ? "Token Expirado" : "Desconectado"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {isConnected && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Conta de anúncios</p>
                  <p className="font-medium">{config?.adAccountName || "Nenhuma selecionada"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Último sync</p>
                  <p className="font-medium">{formatDate(config?.lastSyncAt ?? null)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Token expira em</p>
                  <p className="font-medium">{formatDate(config?.tokenExpiresAt ?? null)}</p>
                </div>
              </div>

              <Separator />

              {/* Seletor de conta */}
              {accounts.length > 0 && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setShowAccounts(!showAccounts)}
                  >
                    {config?.adAccountName ? `Conta: ${config.adAccountName}` : "Selecionar conta de anúncios"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                  {showAccounts && (
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      {accounts.map((acc) => (
                        <button
                          key={acc.id}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors border-b last:border-0"
                          onClick={() => handleSelectAccount(acc)}
                        >
                          <span className="font-medium">{acc.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({acc.id}) · {acc.currency}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing || !config?.adAccountId}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Sincronizando..." : "Sincronizar Agora"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="gap-2"
                >
                  <Unplug className="h-4 w-4" />
                  Desconectar
                </Button>
              </div>
            </>
          )}

          {!isConnected && (
            <div className="text-center py-4 space-y-3">
              {config?.tokenExpired && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
                  Seu token expirou. Reconecte sua conta para continuar recebendo dados.
                </p>
              )}
              <Button onClick={handleConnect} disabled={connectingUrl} className="gap-2">
                <Zap className="h-4 w-4" />
                {connectingUrl ? "Redirecionando..." : "Conectar com Facebook"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de syncs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Sincronizações</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum sync realizado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left pb-2 font-medium">Data</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                    <th className="text-right pb-2 font-medium">Campanhas</th>
                    <th className="text-left pb-2 font-medium">Período</th>
                    <th className="text-right pb-2 font-medium">Duração</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-2 pr-4">
                        {log.status === "success" ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">OK</Badge>
                        ) : log.status === "partial" ? (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Parcial</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs" title={log.errorMessage || ""}>Erro</Badge>
                        )}
                      </td>
                      <td className="py-2 text-right font-medium">{log.campaigns}</td>
                      <td className="py-2 px-4 text-xs text-muted-foreground">{log.dateRange || "—"}</td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
