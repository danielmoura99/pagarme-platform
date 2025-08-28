// app/(dashboard)/integrations/rd-station/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Zap, 
  Users, 
  TrendingUp,
  ExternalLink,
  Download
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeadsManager } from "./_components/leads-manager";
import { AuthModeSelector } from "./_components/auth-mode-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RDStationConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  syncEvents: {
    pageView: boolean;
    viewContent: boolean;
    initiateCheckout: boolean;
    addPaymentInfo: boolean;
    purchase: boolean;
  };
  leadMapping: {
    email: boolean;
    name: boolean;
    phone: boolean;
    utmSource: boolean;
    utmMedium: boolean;
    utmCampaign: boolean;
    utmTerm: boolean;
    utmContent: boolean;
  };
}

const defaultConfig: RDStationConfig = {
  enabled: false,
  clientId: "",
  clientSecret: "",
  syncEvents: {
    pageView: true,
    viewContent: true,
    initiateCheckout: true,
    addPaymentInfo: true,
    purchase: true,
  },
  leadMapping: {
    email: true,
    name: true,
    phone: true,
    utmSource: true,
    utmMedium: true,
    utmCampaign: true,
    utmTerm: true,
    utmContent: true,
  }
};

export default function RDStationPage() {
  const router = useRouter();
  const [config, setConfig] = useState<RDStationConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [authMode, setAuthMode] = useState<'api_key' | 'oauth' | null>(null);
  const [showOAuthConfig, setShowOAuthConfig] = useState(false);

  useEffect(() => {
    const handleCallbackAndLoad = async () => {
      console.log("[RD_STATION_FRONTEND_START] URL atual:", window.location.href);
      
      // Verificar parâmetros de URL para mensagens de callback PRIMEIRO
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      const message = urlParams.get('message');

      console.log("[RD_STATION_FRONTEND_PARAMS]", { success, error, message });

      if (success === 'connected') {
        console.log("[RD_STATION_FRONTEND_SUCCESS] Processando sucesso...");
        toast.success("RD Station conectado com sucesso!");
        // Limpar parâmetros da URL
        window.history.replaceState({}, '', window.location.pathname);
        console.log("[RD_STATION_FRONTEND_SUCCESS] Chamando loadConfig...");
        // Carregar config APÓS processar o sucesso
        await loadConfig();
      } else if (error) {
        let errorMessage = "Erro na conexão com RD Station";
        switch (error) {
          case 'oauth_error':
            errorMessage = message ? decodeURIComponent(message) : "Erro na autorização OAuth";
            break;
          case 'missing_code':
            errorMessage = "Código de autorização não recebido";
            break;
          case 'missing_credentials':
            errorMessage = "Credenciais não configuradas";
            break;
          case 'token_exchange_failed':
            errorMessage = "Falha na troca de tokens";
            break;
          case 'callback_failed':
            errorMessage = "Erro no callback de autorização";
            break;
        }
        toast.error(errorMessage);
        // Limpar parâmetros da URL
        window.history.replaceState({}, '', window.location.pathname);
        // Carregar config mesmo com erro
        await loadConfig();
      } else {
        console.log("[RD_STATION_FRONTEND_NORMAL] Sem parâmetros de callback, carregando config normal...");
        // Sem parâmetros de callback, apenas carregar config normal
        await loadConfig();
      }
    };

    handleCallbackAndLoad();
  }, []);

  const loadConfig = async () => {
    try {
      console.log("[RD_STATION_LOADCONFIG_START]");
      setIsLoading(true);
      
      // Verificar modo de autenticação primeiro
      const authResponse = await fetch('/api/integrations/rd-station/simple-auth');
      let shouldLoadConfig = false;
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log("[RD_STATION_LOADCONFIG_AUTH]", authData);
        setAuthMode(authData.mode);
        
        // Se tem modo configurado, mostrar interface OAuth se for oauth
        if (authData.mode === 'oauth') {
          setShowOAuthConfig(true);
          shouldLoadConfig = true;
        }
      }
      
      // Carregar config OAuth sempre se for modo oauth
      if (shouldLoadConfig || showOAuthConfig) {
        console.log("[RD_STATION_LOADCONFIG_FETCHING] Buscando config...");
        const response = await fetch('/api/integrations/rd-station/config');
        if (response.ok) {
          const data = await response.json();
          console.log("[RD_STATION_LOADCONFIG_DATA]", data);
          setConfig({ ...defaultConfig, ...data });
          setIsConnected(data.isConnected);
          console.log("[RD_STATION_LOADCONFIG_CONNECTED]", data.isConnected);
        } else {
          console.error("[RD_STATION_LOADCONFIG_ERROR] Response não ok:", response.status);
        }
      } else {
        console.log("[RD_STATION_LOADCONFIG_SKIP] Pulando config OAuth, shouldLoadConfig:", shouldLoadConfig, "showOAuthConfig:", showOAuthConfig);
      }
    } catch (error) {
      console.error('Failed to load RD Station config:', error);
      toast.error("Erro ao carregar configurações");
      setConfig(defaultConfig);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: 'api_key' | 'oauth' | null) => {
    setAuthMode(mode);
    if (mode === 'oauth') {
      setShowOAuthConfig(true);
    } else if (mode === 'api_key') {
      setShowOAuthConfig(false);
      // Recarregar para mostrar status da API Key
      loadConfig();
    }
  };

  const saveConfig = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/integrations/rd-station/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        toast.success("Configurações salvas com sucesso");
        // Não recarrega para manter estado atual - só conecta após OAuth
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save config');
      }
    } catch (error) {
      console.error('Failed to save RD Station config:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const connectRDStation = async () => {
    if (!config.clientId || !config.clientSecret) {
      toast.error("Preencha Client ID e Client Secret antes de conectar");
      return;
    }

    // Salvar config primeiro
    await saveConfig();
    
    // Redirecionar para OAuth do RD Station (URL correta da API v2)
    const authUrl = new URL('https://api.rd.services/auth/dialog');
    authUrl.searchParams.set('client_id', config.clientId);
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/integrations/rd-station/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', 'secure_random_string'); // Em produção, usar valor aleatório seguro
    
    window.location.href = authUrl.toString();
  };

  const testConnection = async () => {
    if (!isConnected) {
      toast.error("RD Station não está conectado");
      return;
    }

    try {
      const response = await fetch('/api/integrations/rd-station/test', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message + (data.account ? ` - Conta: ${data.account.name}` : ''));
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao testar conexão");
    }
  };

  const disconnectRDStation = async () => {
    try {
      const response = await fetch('/api/integrations/rd-station/disconnect', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsConnected(false);
        setConfig(prev => ({ ...prev, accessToken: undefined, refreshToken: undefined }));
        toast.success(data.message);
        // Recarregar configuração
        await loadConfig();
      } else {
        throw new Error(data.error || 'Disconnect failed');
      }
    } catch (error) {
      console.error('Failed to disconnect RD Station:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao desconectar RD Station");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1">
          <Heading
            title="Configuração RD Station"
            description="Configure a integração com RD Station para automação de marketing"
          />
        </div>

        <div>
          {isConnected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="h-3 w-3 mr-1" />
              Desconectado
            </Badge>
          )}
        </div>
      </div>
      
      <Separator className="mb-6" />

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2" disabled={!isConnected}>
            <Download className="h-4 w-4" />
            Gerenciar Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          {!showOAuthConfig ? (
            <AuthModeSelector onModeChange={handleModeChange} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Configuração Principal OAuth */}
              <div className="lg:col-span-2 space-y-6">
          {/* Status da Conexão */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração OAuth
              </CardTitle>
              <CardDescription>
                Configure suas credenciais OAuth e conecte com o RD Station
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type="text"
                    value={config.clientId}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    placeholder="Seu Client ID do RD Station"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={config.clientSecret}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                    placeholder="Seu Client Secret do RD Station"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isConnected ? (
                  <Button onClick={connectRDStation} disabled={!config.clientId || !config.clientSecret}>
                    <Zap className="h-4 w-4 mr-2" />
                    Conectar RD Station
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={testConnection} variant="outline">
                      Testar Conexão
                    </Button>
                    <Button onClick={disconnectRDStation} variant="destructive">
                      Desconectar
                    </Button>
                  </div>
                )}
                <Button 
                  onClick={saveConfig} 
                  disabled={isSaving}
                  variant="secondary"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
                <Button 
                  onClick={() => setShowOAuthConfig(false)}
                  variant="ghost"
                  size="sm"
                >
                  ← Voltar ao Seletor
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Eventos a Sincronizar */}
          <Card>
            <CardHeader>
              <CardTitle>Eventos para Sincronizar</CardTitle>
              <CardDescription>
                Escolha quais eventos do pixel serão enviados para o RD Station
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(config.syncEvents).map(([event, enabled]) => (
                  <div key={event} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        {event === 'pageView' && 'Visualização de Página'}
                        {event === 'viewContent' && 'Visualização de Conteúdo'}
                        {event === 'initiateCheckout' && 'Iniciar Checkout'}
                        {event === 'addPaymentInfo' && 'Adicionar Pagamento'}
                        {event === 'purchase' && 'Compra Finalizada'}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {event === 'pageView' && 'Usuário visualiza uma página'}
                        {event === 'viewContent' && 'Usuário visualiza conteúdo do produto'}
                        {event === 'initiateCheckout' && 'Usuário inicia processo de checkout'}
                        {event === 'addPaymentInfo' && 'Usuário adiciona informações de pagamento'}
                        {event === 'purchase' && 'Usuário completa uma compra'}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({
                          ...prev,
                          syncEvents: { ...prev.syncEvents, [event]: checked }
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mapeamento de Campos */}
          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Campos</CardTitle>
              <CardDescription>
                Configure quais dados serão enviados para o RD Station
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(config.leadMapping).map(([field, enabled]) => (
                  <div key={field} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">
                        {field === 'email' && 'Email do Lead'}
                        {field === 'name' && 'Nome do Lead'}
                        {field === 'phone' && 'Telefone do Lead'}
                        {field === 'utmSource' && 'UTM Source'}
                        {field === 'utmMedium' && 'UTM Medium'}
                        {field === 'utmCampaign' && 'UTM Campaign'}
                        {field === 'utmTerm' && 'UTM Term'}
                        {field === 'utmContent' && 'UTM Content'}
                      </Label>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        setConfig(prev => ({
                          ...prev,
                          leadMapping: { ...prev.leadMapping, [field]: checked }
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com Informações */}
        <div className="space-y-6">
          {/* Guia de Configuração */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como Configurar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <p className="font-medium">1. Obter Credenciais</p>
                <p className="text-muted-foreground">
                  Acesse o painel do RD Station e crie uma aplicação para obter Client ID e Secret
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://app.rdstation.com.br/integracoes" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Acessar RD Station
                  </a>
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="font-medium">2. Configurar URL de Callback</p>
                <p className="text-muted-foreground">
                  Use esta URL no painel do RD Station:
                </p>
                <code className="block p-2 bg-muted rounded text-xs break-all">
                  {window.location.origin}/api/integrations/rd-station/callback
                </code>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="font-medium">3. Conectar e Testar</p>
                <p className="text-muted-foreground">
                  Após inserir as credenciais, clique em conectar e teste a integração
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">0</p>
                  <p className="text-xs text-muted-foreground">Leads sincronizados</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">0</p>
                  <p className="text-xs text-muted-foreground">Eventos enviados hoje</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">-</p>
                  <p className="text-xs text-muted-foreground">Última sincronização</p>
                </div>
              </div>
            </CardContent>
          </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads">
          <LeadsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}