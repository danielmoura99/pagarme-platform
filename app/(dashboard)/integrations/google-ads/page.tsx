// app/(dashboard)/integrations/google-ads/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

interface Config {
  connected: boolean;
  enabled: boolean;
  customerId: string | null;
  loginCustomerId: string | null;
  conversionActionId: string | null;
  clientId?: string | null;
  hasDeveloperToken: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  lastUploadAt: string | null;
}

export default function GoogleAdsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Campos do formulário
  const [developerToken, setDeveloperToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [loginCustomerId, setLoginCustomerId] = useState("");
  const [conversionActionId, setConversionActionId] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/google-ads/config");
      const data = await res.json();
      setConfig(data);
      setClientId(data.clientId || "");
      setCustomerId(data.customerId || "");
      setLoginCustomerId(data.loginCustomerId || "");
      setConversionActionId(data.conversionActionId || "");
    } catch {
      setMessage({ type: "error", text: "Erro ao carregar configuração" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/google-ads/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(developerToken.trim() ? { developerToken } : {}),
          ...(clientId.trim() ? { clientId } : {}),
          ...(clientSecret.trim() ? { clientSecret } : {}),
          ...(refreshToken.trim() ? { refreshToken } : {}),
          customerId,
          loginCustomerId,
          conversionActionId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao salvar");

      setDeveloperToken("");
      setClientSecret("");
      setRefreshToken("");

      if (data.validation && !data.validation.valid) {
        setMessage({
          type: "error",
          text: `Salvo, mas a validação falhou: ${data.validation.error}`,
        });
      } else if (data.validation?.valid) {
        setMessage({
          type: "success",
          text: "Credenciais salvas e validadas com sucesso!",
        });
      } else {
        setMessage({
          type: "success",
          text: "Configuração salva. Preencha todos os campos para validar.",
        });
      }
      fetchConfig();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Erro ao salvar",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      await fetch("/api/integrations/google-ads/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      fetchConfig();
    } catch {
      setMessage({ type: "error", text: "Erro ao alterar status" });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Heading
        title="Google Ads"
        description="Importe conversões para o Google Ads pelo servidor, garantindo o registro de vendas que o navegador não reporta."
      />
      <Separator className="my-4" />

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Importação de Conversões</CardTitle>
          <Badge
            variant={config?.connected ? "default" : "secondary"}
            className={config?.connected ? "bg-green-600" : ""}
          >
            {config?.connected ? "Configurado" : "Incompleto"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
            <p className="font-semibold">Antes de começar</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>
                Solicite um <strong>developer token</strong> com acesso Basic no
                API Center (leva ~5 dias úteis)
              </li>
              <li>
                Crie credenciais <strong>OAuth2</strong> (client ID e secret) no
                Google Cloud e gere um <strong>refresh token</strong> com o
                escopo <code className="text-xs">adwords</code>
              </li>
              <li>
                No Google Ads, crie uma <strong>ação de conversão</strong> do
                tipo <strong>Importar → Cliques</strong> e copie o ID dela
              </li>
            </ol>
            <a
              href="https://ads.google.com/aw/apicenter"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-700 underline text-xs mt-1"
            >
              Abrir API Center <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Developer Token</label>
              <Input
                type="password"
                autoComplete="off"
                placeholder={
                  config?.hasDeveloperToken
                    ? "•••••••• (salvo — em branco mantém)"
                    : "Cole o developer token"
                }
                value={developerToken}
                onChange={(e) => setDeveloperToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID (OAuth2)</label>
              <Input
                placeholder="xxxxx.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <Input
                type="password"
                autoComplete="off"
                placeholder={
                  config?.hasClientSecret
                    ? "•••••••• (salvo — em branco mantém)"
                    : "Cole o client secret"
                }
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Refresh Token</label>
              <Input
                type="password"
                autoComplete="off"
                placeholder={
                  config?.hasRefreshToken
                    ? "•••••••• (salvo — em branco mantém)"
                    : "Cole o refresh token"
                }
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Customer ID</label>
              <Input
                placeholder="1234567890 (sem hífens)"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                ID da conta Google Ads que recebe as conversões.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Login Customer ID (opcional)
              </label>
              <Input
                placeholder="Conta gerenciadora (MCC)"
                value={loginCustomerId}
                onChange={(e) => setLoginCustomerId(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Só necessário se o acesso for via conta MCC.
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">
                ID da Ação de Conversão
              </label>
              <Input
                placeholder="Ex: 987654321"
                value={conversionActionId}
                onChange={(e) => setConversionActionId(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Da ação criada com tipo &quot;Importar → Cliques&quot;.
              </p>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando e validando..." : "Salvar credenciais"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Envio automático</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Enviar conversões automaticamente
              </p>
              <p className="text-sm text-muted-foreground">
                Ao confirmar um pagamento, a venda é enviada ao Google Ads se o
                pedido tiver vindo de um clique em anúncio.
              </p>
            </div>
            <Switch
              checked={config?.enabled ?? false}
              onCheckedChange={handleToggleEnabled}
              disabled={!config?.connected}
            />
          </div>

          {!config?.connected && (
            <p className="text-xs text-amber-700">
              Complete as credenciais acima para habilitar o envio.
            </p>
          )}

          {config?.lastUploadAt && (
            <p className="text-xs text-muted-foreground">
              Último envio: {new Date(config.lastUploadAt).toLocaleString("pt-BR")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
