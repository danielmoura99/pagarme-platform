// app/(dashboard)/integrations/page.tsx
"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Plug, Settings, ExternalLink, CheckCircle, Circle } from "lucide-react";
import AdminPasswordModal from "@/components/auth/admin-password-modal";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Skeleton } from "@/components/ui/skeleton";

const integrations = [
  {
    id: "facebook-ads",
    name: "Facebook Ads",
    description: "Importe métricas de campanhas e calcule ROAS, CPA e CPL",
    logo: "📘",
    status: "available",
    category: "Mídia Paga",
    features: [
      "Importação de spend, cliques e impressões",
      "Cálculo de ROAS por campanha",
      "CPA e CPL reais cruzados com vendas",
      "Sync automático diário"
    ],
    setupUrl: "/integrations/facebook-ads"
  },
  {
    id: "rd-station",
    name: "RD Station",
    description: "Plataforma de marketing digital e automação de leads",
    logo: "🚀", // Pode ser substituído por imagem real
    status: "available", // available, connected, disabled
    category: "Marketing",
    features: [
      "Sincronização automática de leads",
      "Tracking de conversões",
      "Segmentação por campanha",
      "Automações de email marketing"
    ],
    setupUrl: "/integrations/rd-station"
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Plataforma de email marketing e automação",
    logo: "📧",
    status: "available",
    category: "Marketing",
    features: [
      "Listas de email automatizadas",
      "Campanhas de email",
      "Segmentação de audiência",
      "Analytics de email"
    ],
    setupUrl: "/integrations/mailchimp"
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Conecte com mais de 5.000 aplicativos",
    logo: "⚡",
    status: "disabled",
    category: "Automação",
    features: [
      "Integração com milhares de apps",
      "Automações personalizadas",
      "Workflows complexos",
      "Triggers de eventos"
    ],
    setupUrl: "/integrations/zapier"
  },
  {
    id: "webhook",
    name: "Webhooks",
    description: "Integração personalizada via HTTP",
    logo: "🔗",
    status: "available",
    category: "Desenvolvimento",
    features: [
      "Endpoints personalizados",
      "Eventos em tempo real",
      "Payload customizável",
      "Headers e autenticação"
    ],
    setupUrl: "/integrations/webhooks"
  }
];

const getStatusInfo = (status: string) => {
  switch (status) {
    case "connected":
      return {
        icon: CheckCircle,
        text: "Conectado",
        color: "bg-green-500",
        variant: "default" as const
      };
    case "available":
      return {
        icon: Circle,
        text: "Disponível",
        color: "bg-blue-500",
        variant: "secondary" as const
      };
    case "disabled":
      return {
        icon: Circle,
        text: "Em breve",
        color: "bg-gray-500",
        variant: "outline" as const
      };
    default:
      return {
        icon: Circle,
        text: "Desconhecido",
        color: "bg-gray-500",
        variant: "outline" as const
      };
  }
};

export default function IntegrationsPage() {
  const categories = [...new Set(integrations.map(i => i.category))];
  const { isAuthenticated, isLoading, showModal, authenticate, onSuccess, onClose } = useAdminAuth();

  // Verificar autenticação ao carregar a página
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      authenticate();
    }
  }, [isLoading, isAuthenticated, authenticate]);

  // Loading state enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  // Não renderizar conteúdo se não estiver autenticado
  if (!isAuthenticated) {
    return (
      <>
        <AdminPasswordModal
          isOpen={showModal}
          onClose={onClose}
          onSuccess={onSuccess}
          title="Área de Integrações"
          description="Esta área requer autenticação administrativa. Digite a senha para acessar as configurações de integração."
        />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-2">
              <Plug className="h-12 w-12 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-semibold">Área Restrita</h2>
              <p className="text-muted-foreground">Aguardando autenticação...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminPasswordModal
        isOpen={showModal}
        onClose={onClose}
        onSuccess={onSuccess}
        title="Área de Integrações"
        description="Esta área requer autenticação administrativa. Digite a senha para acessar as configurações de integração."
      />
      
      <div className="container mx-auto py-8">
      <Heading
        title="Integrações"
        description="Conecte sua plataforma com ferramentas de marketing e automação"
      />
      <Separator className="my-4" />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {integrations.filter(i => i.status === "connected").length}
                </p>
                <p className="text-xs text-muted-foreground">Conectadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {integrations.filter(i => i.status === "available").length}
                </p>
                <p className="text-xs text-muted-foreground">Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{integrations.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations by Category */}
      {categories.map(category => (
        <div key={category} className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">{category}</h2>
            <Badge variant="outline">
              {integrations.filter(i => i.category === category).length} integrações
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations
              .filter(integration => integration.category === category)
              .map(integration => {
                const statusInfo = getStatusInfo(integration.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={integration.id} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{integration.logo}</div>
                          <div>
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <Badge variant={statusInfo.variant} className="mt-1">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.text}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="text-sm">
                        {integration.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Recursos:</h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {integration.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-2">
                          {integration.status === "available" ? (
                            <Button 
                              className="w-full" 
                              size="sm"
                              onClick={() => window.location.href = integration.setupUrl}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configurar
                            </Button>
                          ) : integration.status === "connected" ? (
                            <div className="flex gap-2">
                              <Button 
                                className="flex-1" 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.location.href = integration.setupUrl}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Gerenciar
                              </Button>
                              <Button size="sm" variant="ghost">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button className="w-full" size="sm" disabled>
                              Em breve
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}
      </div>
    </>
  );
}