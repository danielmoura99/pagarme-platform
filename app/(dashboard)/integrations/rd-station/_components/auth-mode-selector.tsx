// app/(dashboard)/integrations/rd-station/_components/auth-mode-selector.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Key, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface AuthMode {
  configured: boolean;
  mode: 'api_key' | 'oauth' | null;
  enabled: boolean;
  hasApiKey: boolean;
  hasOAuthTokens: boolean;
}

interface AuthModeSelectorProps {
  onModeChange: (mode: 'api_key' | 'oauth' | null) => void;
}

export function AuthModeSelector({ onModeChange }: AuthModeSelectorProps) {
  const [authMode, setAuthMode] = useState<AuthMode>({
    configured: false,
    mode: null,
    enabled: false,
    hasApiKey: false,
    hasOAuthTokens: false
  });
  const [selectedMode, setSelectedMode] = useState<'api_key' | 'oauth'>('oauth');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAuthMode();
  }, []);

  const loadAuthMode = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/integrations/rd-station/simple-auth');
      if (response.ok) {
        const data = await response.json();
        setAuthMode(data);
        if (data.mode) {
          setSelectedMode(data.mode);
          onModeChange(data.mode);
        }
      }
    } catch (error) {
      console.error('Failed to load auth mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const configureApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Preencha a API Key");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/integrations/rd-station/simple-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        await loadAuthMode();
        onModeChange('api_key');
      } else {
        throw new Error(data.error || 'Failed to configure API Key');
      }
    } catch (error) {
      console.error('Failed to configure API Key:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao configurar API Key");
    } finally {
      setIsSaving(false);
    }
  };

  const switchToOAuth = () => {
    setSelectedMode('oauth');
    onModeChange('oauth');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (authMode.configured && authMode.mode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {authMode.mode === 'api_key' ? <Key className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            Modo de Autenticação Configurado
          </CardTitle>
          <CardDescription>
            {authMode.mode === 'api_key' 
              ? 'Integração via API Key (funcionalidades limitadas)'
              : 'Integração via OAuth (funcionalidades completas)'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant={authMode.mode === 'oauth' ? 'default' : 'secondary'}>
              {authMode.mode === 'api_key' ? 'API Key' : 'OAuth 2.0'}
            </Badge>
            <Badge variant={authMode.enabled ? 'default' : 'secondary'}>
              <CheckCircle className="h-3 w-3 mr-1" />
              {authMode.enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>

          {authMode.mode === 'api_key' && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Funcionalidades Limitadas</p>
                  <ul className="text-yellow-700 mt-1 space-y-1">
                    <li>• Apenas envio de eventos de conversão</li>
                    <li>• Não é possível importar leads</li>
                    <li>• Funcionalidades reduzidas</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button 
              onClick={authMode.mode === 'api_key' ? switchToOAuth : () => {}}
              variant={authMode.mode === 'api_key' ? "default" : "secondary"}
              disabled={authMode.mode === 'oauth'}
            >
              {authMode.mode === 'api_key' 
                ? 'Migrar para OAuth (Recomendado)' 
                : 'Configuração Completa Ativa'
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escolha o Tipo de Integração</CardTitle>
        <CardDescription>
          Selecione como deseja integrar com o RD Station Marketing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={selectedMode} onValueChange={(value) => setSelectedMode(value as any)}>
          {/* Opção OAuth */}
          <div className="flex items-start space-x-3 border rounded-lg p-4">
            <RadioGroupItem value="oauth" id="oauth" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="oauth" className="text-base font-medium">
                OAuth 2.0 (Recomendado)
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Integração completa com todas as funcionalidades
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Enviar eventos de conversão
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Importar leads do RD Station
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Sincronização bidirecional
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Acesso completo à API
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Requer:</strong> Criar aplicativo na App Store do RD Station
                </p>
                <Button variant="outline" size="sm" className="mt-2" asChild>
                  <a href="https://appstore.rdstation.com/pt-BR/publisher" target="_blank">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Criar Aplicativo
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Opção API Key */}
          <div className="flex items-start space-x-3 border rounded-lg p-4">
            <RadioGroupItem value="api_key" id="api_key" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="api_key" className="text-base font-medium">
                API Key (Básica)
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Integração simples apenas para eventos
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-sm text-green-600">
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Enviar eventos de conversão
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  Não importa leads
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  Funcionalidades limitadas
                </div>
              </div>
            </div>
          </div>
        </RadioGroup>

        {selectedMode === 'api_key' && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key do RD Station</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Cole sua API Key aqui"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Obtenha sua API Key em: App Publisher → "Gerar chave de API"
              </p>
            </div>
            <Button 
              onClick={configureApiKey}
              disabled={isSaving || !apiKey.trim()}
              className="w-full"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Configurar API Key
            </Button>
          </div>
        )}

        {selectedMode === 'oauth' && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Para usar OAuth, você precisa primeiro criar um aplicativo na App Store do RD Station e obter as credenciais.
            </p>
            <Button 
              onClick={() => onModeChange('oauth')}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Configurar OAuth
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}