// app/(dashboard)/integrations/facebook-ads/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Unplug,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

interface Config {
  connected: boolean;
  enabled: boolean;
  adAccountId: string | null;
  adAccountName: string | null;
  lastSyncAt: string | null;
  tokenExpired: boolean;
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
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/facebook-ads/config");
      const data = await res.json();
      setConfig(data);

      if (data.connected) {
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

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/facebook-ads/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao salvar token");
      setTokenInput("");
      setMessage({ type: "success", text: `Conectado! ${data.user ? `Usuário: ${data.user}` : ""} Selecione a conta de anúncios.` });
      fetchConfig();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Erro ao salvar token" });
    } finally {
      setSaving(false);
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
      setAccounts([]);
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
      <div className="container mx-auto py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Heading
        title="Facebook Ads"
        description="Importe métricas de campanhas e calcule ROAS, CPA e CPL cruzados com suas vendas."
      />
      <Separator className="my-4" />

      {/* Feedback */}
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

      {/* Card principal */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Conexão</CardTitle>
          <Badge
            variant={config?.connected ? "default" : "secondary"}
            className={config?.connected ? "bg-green-600" : ""}
          >
            {config?.connected ? "Conectado" : "Desconectado"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config?.connected ? (
            <>
              {/* Instrução */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
                <p className="font-semibold">Como obter o token de acesso:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Acesse o <strong>Business Manager</strong> do Facebook</li>
                  <li>Vá em <strong>Configurações → Usuários do Sistema</strong></li>
                  <li>Crie um usuário de sistema (tipo "Funcionário")</li>
                  <li>Atribua acesso à conta de anúncios com permissão de <strong>Analista</strong></li>
                  <li>Clique em <strong>"Gerar token"</strong>, selecione o App e marque <strong>ads_read</strong></li>
                  <li>Copie o token gerado e cole abaixo</li>
                </ol>
                <a
                  href="https://business.facebook.com/settings/system-users"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 underline text-xs mt-1"
                >
                  Abrir Business Manager <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Input do token */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Token de acesso</label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Cole o token aqui..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button onClick={handleSaveToken} disabled={saving || !tokenInput.trim()}>
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Info da conexão */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Conta de anúncios</p>
                  <p className="font-medium">{config.adAccountName || "Nenhuma selecionada"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Último sync</p>
                  <p className="font-medium">{formatDate(config.lastSyncAt)}</p>
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
                    {config.adAccountName ? `Conta: ${config.adAccountName}` : "Selecionar conta de anúncios"}
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

              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing || !config.adAccountId}
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
                  className="gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <Unplug className="h-4 w-4" />
                  Desconectar
                </Button>
              </div>

              {!config.adAccountId && (
                <p className="text-xs text-amber-700">Selecione uma conta de anúncios para habilitar o sync.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Histórico de syncs */}
      {config?.connected && (
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
      )}
    </div>
  );
}
