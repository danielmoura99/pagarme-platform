/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, TestTube } from "lucide-react";

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    email?: string;
    name?: string;
    amount?: number;
    testOrderId?: string;
    configured?: boolean;
    hasCredentials?: boolean;
  };
  error?: string;
  testData?: {
    email?: string;
    orderId?: string;
    amount?: number;
  };
  rdStationResult?: any;
  rdStationResponse?: any;
}

export default function RDStationTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "Cliente Teste",
    phone: "11999999999",
    amount: "199.90",
    productName: "Produto de Teste",
  });

  // Teste rápido com dados padrão
  const handleQuickTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(
        "/api/integrations/rd-station/test-purchase",
        {
          method: "GET",
        }
      );

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: "Erro de conexão",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Teste com dados customizados
  const handleCustomTest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email) {
      setTestResult({
        success: false,
        message: "Email é obrigatório",
        error: "validation_error",
      });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(
        "/api/integrations/rd-station/test-purchase",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
            amount: Math.round(parseFloat(formData.amount) * 100), // Converter para centavos
            productName: formData.productName,
          }),
        }
      );

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: "Erro de conexão",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Teste de Integração RD Station</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teste Rápido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Teste Rápido
            </CardTitle>
            <CardDescription>
              Testa o envio com dados padrão gerados automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleQuickTest}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Executar Teste Rápido
            </Button>
          </CardContent>
        </Card>

        {/* Teste Customizado */}
        <Card>
          <CardHeader>
            <CardTitle>Teste Customizado</CardTitle>
            <CardDescription>
              Testa o envio com dados específicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCustomTest} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="teste@exemplo.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do Cliente"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="11999999999"
                />
              </div>

              <div>
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="199.90"
                />
              </div>

              <div>
                <Label htmlFor="productName">Nome do Produto</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) =>
                    setFormData({ ...formData, productName: e.target.value })
                  }
                  placeholder="Produto de Teste"
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Executar Teste Customizado
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Resultado do Teste */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Resultado do Teste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert
              className={
                testResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              <AlertDescription>
                <strong>{testResult.message}</strong>
              </AlertDescription>
            </Alert>

            {testResult.details && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Detalhes do Envio:</h4>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Email:</strong>{" "}
                    {testResult.details.email || testResult.testData?.email}
                  </p>
                  <p>
                    <strong>Nome:</strong>{" "}
                    {testResult.details.name || "Cliente Teste GET"}
                  </p>
                  <p>
                    <strong>Valor:</strong> R${" "}
                    {testResult.details.amount || testResult.testData?.amount}
                  </p>
                  <p>
                    <strong>Order ID:</strong>{" "}
                    {testResult.details.testOrderId ||
                      testResult.testData?.orderId}
                  </p>
                </div>
              </div>
            )}

            {testResult.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">
                  Detalhes do Erro:
                </h4>
                <p className="text-sm text-red-700">{testResult.error}</p>

                {testResult.details && !testResult.details.configured && (
                  <p className="text-sm text-red-700 mt-2">
                    💡 <strong>Dica:</strong> RD Station não está configurado.
                    Configure primeiro em Integrações → RD Station.
                  </p>
                )}

                {testResult.details && !testResult.details.hasCredentials && (
                  <p className="text-sm text-red-700 mt-2">
                    💡 <strong>Dica:</strong> Credenciais inválidas ou token
                    expirado. Reconecte a integração.
                  </p>
                )}
              </div>
            )}

            {testResult.rdStationResponse && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  Resposta do RD Station:
                </h4>
                <pre className="text-xs text-blue-700 overflow-auto">
                  {JSON.stringify(testResult.rdStationResponse, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Verificar no RD Station</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm">
          <div className="space-y-3">
            <p>
              <strong>1. Acesse o RD Station:</strong> Faça login na sua conta
              RD Station
            </p>
            <p>
              <strong>2. Vá para Contatos:</strong> Menu lateral → Contatos
            </p>
            <p>
              <strong>3. Busque pelo email:</strong> Use o email do teste na
              busca
            </p>
            <p>
              <strong>4. Verifique os dados:</strong> O contato deve aparecer
              com:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                Tag: <code>Paystep</code>
              </li>
              <li>
                Tag: <code>compra_confirmada</code>
              </li>
              <li>
                Tag: <code>cliente_pagante</code>
              </li>
              <li>
                Campo customizado: <code>cf_order_id</code>
              </li>
              <li>
                Campo customizado: <code>cf_purchase_value</code>
              </li>
              <li>
                Campos UTM: <code>cf_utm_source</code>,{" "}
                <code>cf_utm_medium</code>, etc. (se houver)
              </li>
            </ul>
            <p>
              <strong>5. Histórico:</strong> Verifique a linha do tempo para ver
              a conversão Compra Realizada
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
