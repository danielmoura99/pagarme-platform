// app/(dashboard)/clientes/_components/client-details-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Copy,
  Check,
  FileText,
  MessageCircle,
  DollarSign,
  ShoppingBag,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Tipos para os dados detalhados do cliente
interface ClientDetails {
  id: string;
  name: string;
  email: string;
  document: string;
  phone: string | null;

  // Métricas de compra
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;

  // Datas importantes
  firstPurchase: string | null;
  lastPurchase: string | null;
  daysSinceLastPurchase: number | null;

  // Status e contadores
  clientStatus: "active" | "inactive" | "problematic";
  paidOrdersCount: number;
  failedOrdersCount: number;
  pendingOrdersCount: number;

  // Informações de afiliado
  hasAffiliateOrders: boolean;
  affiliatesUsed: Array<{
    id: string;
    name: string;
    totalOrders: number;
  }>;

  // Histórico de pedidos
  orders: Array<{
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    createdAt: string;
    productName: string;
    affiliateName?: string;
  }>;

  // Datas do registro
  createdAt: string;
  updatedAt: string;
}

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
}

export function ClientDetailsModal({
  isOpen,
  onClose,
  clientId,
}: ClientDetailsModalProps) {
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar detalhes do cliente quando o modal for aberto
  useEffect(() => {
    async function fetchClientDetails() {
      if (!clientId || !isOpen) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/clients/${clientId}`);

        if (!response.ok) {
          throw new Error("Não foi possível carregar os detalhes do cliente");
        }

        const data = await response.json();
        setClient(data);
      } catch (err) {
        console.error("Erro ao buscar detalhes do cliente:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar os detalhes do cliente"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchClientDetails();
  }, [clientId, isOpen]);

  // Limpar estado quando o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      setClient(null);
      setError(null);
      setCopied(null);
    }
  }, [isOpen]);

  // Função para formatar valores monetários
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount / 100);
  };

  // Função para formatar datas
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy, HH:mm", {
      locale: ptBR,
    });
  };

  // Formatar documento
  const formatDocument = (document: string) => {
    return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  // Copiar texto para área de transferência
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({
      description: `${type} copiado para a área de transferência`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  // Status badge com cores apropriadas
  const StatusBadge = ({
    status,
  }: {
    status: ClientDetails["clientStatus"];
  }) => {
    const statusConfig = {
      active: {
        label: "Ativo",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      inactive: {
        label: "Inativo",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
      problematic: {
        label: "Problemático",
        className: "bg-red-100 text-red-800 border-red-200",
      },
    };

    const config = statusConfig[status];

    return (
      <Badge className={`font-medium text-xs ${config.className}`}>
        {config.label}
      </Badge>
    );
  };

  // Gerar link do WhatsApp
  const generateWhatsAppLink = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${name}, tudo bem? Sou da equipe de vendas e gostaria de falar com você sobre nossos produtos.`
    );
    return `https://wa.me/55${cleanPhone}?text=${message}`;
  };

  // Exibir conteúdo baseado no estado de carregamento
  const renderContent = () => {
    if (loading) {
      return <ClientDetailsSkeleton />;
    }

    if (error) {
      return (
        <div className="py-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      );
    }

    if (!client) {
      return (
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhuma informação disponível
          </p>
          <Button onClick={onClose} variant="outline">
            Fechar
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={client.clientStatus} />
              <h3 className="text-lg font-semibold">{client.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 inline mr-1" />
              Cliente desde {formatDate(client.createdAt)}
            </span>
          </div>
        </div>

        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="grid grid-cols-4 h-10">
            <TabsTrigger value="contact">
              <User className="h-4 w-4 mr-2" />
              Contato
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <DollarSign className="h-4 w-4 mr-2" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="affiliates">
              <User className="h-4 w-4 mr-2" />
              Afiliados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contact" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Informações de Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Nome
                      </p>
                      <p className="text-sm">{client.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(client.name, "Nome")}
                    >
                      {copied === "Nome" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Email
                      </p>
                      <p className="text-sm">{client.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(client.email, "Email")}
                      >
                        {copied === "Email" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(`mailto:${client.email}`, "_blank")
                        }
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Enviar
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Documento
                      </p>
                      <p className="text-sm">
                        {formatDocument(client.document)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          formatDocument(client.document),
                          "Documento"
                        )
                      }
                    >
                      {copied === "Documento" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {client.phone && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Telefone
                        </p>
                        <p className="text-sm">{client.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(client.phone!, "Telefone")
                          }
                        >
                          {copied === "Telefone" ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              generateWhatsAppLink(client.phone!, client.name),
                              "_blank"
                            )
                          }
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      const clientData = `Nome: ${client.name}\nEmail: ${client.email}\nDocumento: ${formatDocument(client.document)}\nTelefone: ${client.phone || "N/A"}\nTotal Gasto: ${formatCurrency(client.totalSpent)}\nPedidos: ${client.totalOrders}`;
                      copyToClipboard(clientData, "Dados do Cliente");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Copiar Todos os Dados
                  </Button>

                  {client.phone && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() =>
                        window.open(
                          generateWhatsAppLink(client.phone!, client.name),
                          "_blank"
                        )
                      }
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Abrir WhatsApp
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() =>
                      window.open(
                        `mailto:${client.email}?subject=Contato%20da%20Equipe%20de%20Vendas`,
                        "_blank"
                      )
                    }
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Email
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Métricas Financeiras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Gasto
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(client.totalSpent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Ticket Médio
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(client.averageOrderValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total de Pedidos
                    </span>
                    <span className="font-semibold">{client.totalOrders}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Status dos Pedidos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Pedidos Pagos
                    </span>
                    <span className="font-semibold text-green-600">
                      {client.paidOrdersCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Pedidos Falharam
                    </span>
                    <span className="font-semibold text-red-600">
                      {client.failedOrdersCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Pedidos Pendentes
                    </span>
                    <span className="font-semibold text-yellow-600">
                      {client.pendingOrdersCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico de Compras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Primeira Compra
                  </span>
                  <span className="text-sm">
                    {client.firstPurchase
                      ? formatDate(client.firstPurchase)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Última Compra
                  </span>
                  <span className="text-sm">
                    {client.lastPurchase
                      ? formatDate(client.lastPurchase)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Dias desde última compra
                  </span>
                  <span className="text-sm">
                    {client.daysSinceLastPurchase
                      ? `${client.daysSinceLastPurchase} dias`
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.orders && client.orders.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {client.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {order.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(order.createdAt),
                              "dd/MM/yyyy HH:mm",
                              { locale: ptBR }
                            )}
                          </p>
                          {order.affiliateName && (
                            <p className="text-xs text-blue-600">
                              via {order.affiliateName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(order.amount)}
                          </p>
                          <Badge
                            variant={
                              order.status === "paid"
                                ? "default"
                                : order.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {order.status === "paid"
                              ? "Pago"
                              : order.status === "failed"
                                ? "Falhou"
                                : "Pendente"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum pedido encontrado
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Afiliados Utilizados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.hasAffiliateOrders &&
                client.affiliatesUsed.length > 0 ? (
                  <div className="space-y-3">
                    {client.affiliatesUsed.map((affiliate) => (
                      <div
                        key={affiliate.id}
                        className="flex justify-between items-center p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {affiliate.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {affiliate.totalOrders} pedido(s) via este afiliado
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {client.hasAffiliateOrders
                      ? "Nenhum afiliado específico encontrado"
                      : "Cliente não possui pedidos via afiliados"}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="flex justify-end items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

// Skeleton para carregamento
function ClientDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      <div className="flex justify-end">
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}
