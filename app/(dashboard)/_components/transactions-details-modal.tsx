// app/(dashboard)/_components/transaction-details-modal.tsx
"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  QrCode,
  User,
  Package,
  ClipboardList,
  ExternalLink,
  RefreshCcw,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Definição do tipo de Transação com todas as informações detalhadas
interface TransactionDetails {
  id: string;
  orderId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    document: string;
    phone?: string;
  };
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
  };
  items?: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  paymentMethod: "credit_card" | "pix";
  status: "pending" | "paid" | "failed" | "refunded";
  amount: number;
  installments?: number;
  createdAt: string;
  updatedAt: string;
  affiliate?: {
    id: string;
    name: string;
    email: string;
    commission: number;
    amount: number;
  };
  coupon?: {
    id: string;
    code: string;
    discountPercentage: number;
  };
  pagarmeTransactionId?: string;

  failureReason?: string;
  failureCode?: string;
  attempts?: number;
  lastAttemptAt?: string;
  failureDetails?: {
    method: string;
    code?: string;
    message?: string;

    // ✅ DETALHES DO GATEWAY_RESPONSE
    gatewayCode?: string;
    gatewayErrors?: string[];

    // Detalhes do Acquirer/Emissor
    acquirerCode?: string;
    acquirerMessage?: string;
    responseCode?: string;

    // Detalhes específicos de cartão
    cardLastDigits?: string;
    cardFlag?: string;
    cardFirstDigits?: string;

    // Detalhes específicos de PIX
    pixExpiration?: string;

    // Informações técnicas adicionais
    installments?: number;
    operationType?: string;
    success?: boolean;
  };
}

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId?: string;
}

export function TransactionDetailsModal({
  isOpen,
  onClose,
  transactionId,
}: TransactionDetailsModalProps) {
  const [transaction, setTransaction] = useState<TransactionDetails | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const { toast } = useToast();

  // Buscar detalhes da transação quando o modal for aberto
  useEffect(() => {
    async function fetchTransactionDetails() {
      if (!transactionId || !isOpen) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/transactions/${transactionId}`);

        if (!response.ok) {
          throw new Error("Não foi possível carregar os detalhes da transação");
        }

        const data = await response.json();
        setTransaction(data);
      } catch (err) {
        console.error("Erro ao buscar detalhes da transação:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Erro ao carregar os detalhes da transação"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchTransactionDetails();
  }, [transactionId, isOpen]);

  // Limpar estado quando o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      setTransaction(null);
      setError(null);
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

  // Copiar ID da transação
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      description: "ID copiado para a área de transferência",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Processar reembolso
  const handleRefund = async () => {
    if (!transactionId) return;

    setRefunding(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}/refund`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar reembolso");
      }

      toast({
        title: "Reembolso processado",
        description: "A transação foi reembolsada com sucesso.",
      });

      // Atualizar o status local da transação
      if (transaction) {
        setTransaction({
          ...transaction,
          status: "refunded",
        });
      }

      setShowRefundConfirm(false);
    } catch (err) {
      console.error("Erro ao processar reembolso:", err);
      toast({
        title: "Erro ao processar reembolso",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setRefunding(false);
    }
  };

  // Status badge com cores apropriadas
  const StatusBadge = ({
    status,
  }: {
    status: TransactionDetails["status"];
  }) => {
    const statusConfig = {
      pending: {
        label: "Pendente",
        variant: "secondary" as const,
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      paid: {
        label: "Pago",
        variant: "default" as const,
        className: "bg-green-100 text-green-800 border-green-200",
      },
      failed: {
        label: "Falhou",
        variant: "destructive" as const,
        className: "bg-red-100 text-red-800 border-red-200",
      },
      refunded: {
        label: "Reembolsado",
        variant: "outline" as const,
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
    };

    const config = statusConfig[status];

    return (
      <Badge
        variant={config.variant}
        className={`font-medium text-xs ${config.className}`}
      >
        {config.label}
      </Badge>
    );
  };

  // Componente para o método de pagamento
  const PaymentMethodIcon = ({
    method,
  }: {
    method: TransactionDetails["paymentMethod"];
  }) => {
    return method === "credit_card" ? (
      <div className="flex items-center gap-2">
        <div className="bg-blue-100 p-1 rounded-full">
          <CreditCard className="h-3 w-3 text-blue-600" />
        </div>
        <span>Cartão de Crédito</span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <div className="bg-green-100 p-1 rounded-full">
          <QrCode className="h-3 w-3 text-green-600" />
        </div>
        <span>PIX</span>
      </div>
    );
  };

  // ✅ COMPONENTE PARA EXIBIR INFORMAÇÕES DE FALHA
  const FailureInfo = ({
    transaction,
  }: {
    transaction: TransactionDetails;
  }) => {
    if (transaction.status !== "failed") return null;

    return (
      <div className="p-3 border rounded-lg border-red-200 bg-red-50">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-2">
              Informações da Falha
            </h3>

            <div className="space-y-2 text-sm">
              {transaction.failureReason && (
                <div>
                  <span className="text-red-700 font-medium">Motivo: </span>
                  <span className="text-red-600">
                    {transaction.failureReason}
                  </span>
                </div>
              )}

              {transaction.failureCode && (
                <div>
                  <span className="text-red-700 font-medium">Código: </span>
                  <code className="bg-red-100 px-1 py-0.5 rounded text-red-600">
                    {transaction.failureCode}
                  </code>
                </div>
              )}

              {transaction.failureDetails && (
                <div className="mt-3 p-2 bg-red-100 rounded text-xs space-y-1">
                  <div className="font-medium text-red-800">
                    Detalhes Técnicos:
                  </div>

                  {/* ✅ INFORMAÇÕES DO GATEWAY */}
                  {transaction.failureDetails.gatewayCode && (
                    <div>
                      <span className="text-red-700">Código do Gateway: </span>
                      <code className="text-red-600">
                        {transaction.failureDetails.gatewayCode}
                      </code>
                    </div>
                  )}

                  {transaction.failureDetails.gatewayErrors &&
                    transaction.failureDetails.gatewayErrors.length > 0 && (
                      <div>
                        <span className="text-red-700">Erros do Gateway: </span>
                        <div className="ml-2">
                          {transaction.failureDetails.gatewayErrors.map(
                            (error, index) => (
                              <div key={index} className="text-red-600">
                                • {error}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* ✅ INFORMAÇÕES DO EMISSOR/ADQUIRENTE */}
                  {transaction.failureDetails.acquirerMessage && (
                    <div>
                      <span className="text-red-700">
                        Mensagem do Emissor:{" "}
                      </span>
                      <span className="text-red-600">
                        {transaction.failureDetails.acquirerMessage}
                      </span>
                    </div>
                  )}

                  {transaction.failureDetails.acquirerCode && (
                    <div>
                      <span className="text-red-700">Código do Emissor: </span>
                      <code className="text-red-600">
                        {transaction.failureDetails.acquirerCode}
                      </code>
                    </div>
                  )}

                  {/* ✅ INFORMAÇÕES DO CARTÃO */}
                  {transaction.failureDetails.cardFlag &&
                    transaction.failureDetails.cardLastDigits && (
                      <div>
                        <span className="text-red-700">Cartão: </span>
                        <span className="text-red-600">
                          {transaction.failureDetails.cardFlag} ****
                          {transaction.failureDetails.cardLastDigits}
                          {transaction.failureDetails.cardFirstDigits &&
                            ` (${transaction.failureDetails.cardFirstDigits}****)`}
                        </span>
                      </div>
                    )}

                  {/* ✅ INFORMAÇÕES ADICIONAIS */}
                  {transaction.failureDetails.installments &&
                    transaction.failureDetails.installments > 1 && (
                      <div>
                        <span className="text-red-700">Parcelamento: </span>
                        <span className="text-red-600">
                          {transaction.failureDetails.installments}x
                        </span>
                      </div>
                    )}

                  {transaction.failureDetails.operationType && (
                    <div>
                      <span className="text-red-700">Tipo Operação: </span>
                      <span className="text-red-600">
                        {transaction.failureDetails.operationType}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ INFORMAÇÕES DE TENTATIVAS */}
              {transaction.attempts && transaction.attempts > 1 && (
                <div className="flex items-center gap-1 mt-2">
                  <RotateCcw className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">
                    {transaction.attempts} tentativa
                    {transaction.attempts > 1 ? "s" : ""}
                  </span>
                  {transaction.lastAttemptAt && (
                    <span className="text-red-500 text-xs">
                      (última: {formatDate(transaction.lastAttemptAt)})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  // Exibir conteúdo baseado no estado de carregamento
  const renderContent = () => {
    if (loading) {
      return <TransactionDetailsSkeleton />;
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

    if (!transaction) {
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <StatusBadge status={transaction.status} />
              <span className="text-sm font-medium">{transaction.orderId}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(transaction.id)}
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              {formatDate(transaction.createdAt)}
            </span>
          </div>
        </div>

        {/* ✅ ALERTA DE FALHA NO TOPO SE NECESSÁRIO */}
        {transaction.status === "failed" && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Esta transação falhou. Veja os detalhes na aba Detalhes.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="customer">
          <TabsList className="grid grid-cols-4 h-10">
            <TabsTrigger value="customer">
              <User className="h-4 w-4 mr-2" />
              Cliente
            </TabsTrigger>
            <TabsTrigger value="payment">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagamento
            </TabsTrigger>
            <TabsTrigger value="items">
              <Package className="h-4 w-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="details">
              <ClipboardList className="h-4 w-4 mr-2" />
              Detalhes
              {transaction.status === "failed" && (
                <div className="w-2 h-2 bg-red-500 rounded-full ml-1"></div>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customer" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Nome</h3>
                <p className="text-sm">{transaction.customer.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Email</h3>
                <p className="text-sm">{transaction.customer.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Documento</h3>
                <p className="text-sm">
                  {transaction.customer.document.replace(
                    /(\d{3})(\d{3})(\d{3})(\d{2})/,
                    "$1.$2.$3-$4"
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Telefone</h3>
                <p className="text-sm">
                  {transaction.customer.phone || "Não informado"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payment" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1">Método</h3>
                <PaymentMethodIcon method={transaction.paymentMethod} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Valor</h3>
                <p className="text-sm font-semibold">
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
              {transaction.installments && transaction.installments > 1 && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Parcelamento</h3>
                  <p className="text-sm">
                    {transaction.installments}x de{" "}
                    {formatCurrency(
                      transaction.amount / transaction.installments
                    )}
                  </p>
                </div>
              )}
              {transaction.coupon && (
                <div>
                  <h3 className="text-sm font-medium mb-1">Cupom</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {transaction.coupon.code}
                    </Badge>
                    <span className="text-xs text-green-600">
                      {transaction.coupon.discountPercentage}% off
                    </span>
                  </div>
                </div>
              )}
              {transaction.pagarmeTransactionId && (
                <div className="col-span-2">
                  <h3 className="text-sm font-medium mb-1">
                    ID da Transação (Pagar.me)
                  </h3>
                  <code className="text-xs bg-muted p-1 rounded">
                    {transaction.pagarmeTransactionId}
                  </code>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="items" className="p-4 space-y-4">
            {transaction.items && transaction.items.length > 0 ? (
              <div className="space-y-3">
                {transaction.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{item.productName}</h3>
                      <p className="text-xs text-muted-foreground">
                        ID: {item.productId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(item.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qtd: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                Nenhum item encontrado para esta transação
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="p-4 space-y-4">
            <div className="space-y-4">
              {/* ✅ MOSTRAR INFORMAÇÕES DE FALHA SE APLICÁVEL */}
              <FailureInfo transaction={transaction} />

              {transaction.affiliate && (
                <div className="p-3 border rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Afiliado</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p>{transaction.affiliate.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Comissão</p>
                      <p>{transaction.affiliate.commission}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p>{formatCurrency(transaction.affiliate.amount)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 border rounded-lg">
                <h3 className="text-sm font-medium mb-2">Datas</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Criação</p>
                    <p>{formatDate(transaction.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Última atualização
                    </p>
                    <p>{formatDate(transaction.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="flex justify-between items-center">
          <div className="space-x-2">
            {transaction.status === "paid" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => setShowRefundConfirm(true)}
                disabled={refunding}
              >
                <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                Reembolsar
              </Button>
            )}
            {transaction.status === "failed" && (
              <Button variant="outline" size="sm" className="text-blue-600">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Tentar Novamente
              </Button>
            )}
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => window.open(`/orders/${transaction.id}`, "_blank")}
            >
              Ver Completo
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Dialog de confirmação de reembolso */}
        <AlertDialog open={showRefundConfirm} onOpenChange={setShowRefundConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Reembolso</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja reembolsar esta transação? Esta ação irá
                alterar o status da transação para &quot;Reembolsado&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={refunding}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRefund}
                disabled={refunding}
                className="bg-red-600 hover:bg-red-700"
              >
                {refunding ? "Processando..." : "Confirmar Reembolso"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Transação</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

// Skeleton para carregamento
function TransactionDetailsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-5 w-40" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-24" />
        <div className="space-x-2">
          <Skeleton className="h-9 w-20 inline-block" />
          <Skeleton className="h-9 w-32 inline-block" />
        </div>
      </div>
    </div>
  );
}
