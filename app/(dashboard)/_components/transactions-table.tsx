// app/(dashboard)/_components/transactions-table.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  QrCode,
  Download,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  FileText,
  FileJson,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "./date-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

// Tipo para representar uma transação
interface Transaction {
  id: string;
  orderId: string;
  customer: string;
  product: string;
  paymentMethod: "credit_card" | "pix";
  status: "pending" | "paid" | "failed" | "refunded";
  date: string;
  amount: number;
}

// Componente para exibir o status da transação
function StatusBadge({ status }: { status: Transaction["status"] }) {
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
}

// Componente para exibir o método de pagamento
function PaymentMethodIcon({
  method,
}: {
  method: Transaction["paymentMethod"];
}) {
  return (
    <div className="flex items-center">
      {method === "credit_card" ? (
        <>
          <div className="bg-blue-100 p-1 rounded-full mr-2">
            <CreditCard className="h-3 w-3 text-blue-600" />
          </div>
          <span className="text-xs">Cartão</span>
        </>
      ) : (
        <>
          <div className="bg-green-100 p-1 rounded-full mr-2">
            <QrCode className="h-3 w-3 text-green-600" />
          </div>
          <span className="text-xs">PIX</span>
        </>
      )}
    </div>
  );
}

// Formatar valor monetário
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount / 100);
}

export function TransactionsTable() {
  const { dateRange } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const tableRef = useRef<HTMLDivElement>(null);

  // Filtrar transações com base em múltiplos critérios
  const filteredTransactions = transactions
    .filter((transaction) => {
      // Filtragem por texto (cliente, produto ou ID do pedido)
      const textMatch =
        transaction.customer
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.orderId.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtragem por status
      const statusMatch =
        statusFilter === "all" || transaction.status === statusFilter;

      // Filtragem por método de pagamento
      const paymentMatch =
        paymentFilter === "all" || transaction.paymentMethod === paymentFilter;

      return textMatch && statusMatch && paymentMatch;
    })
    .sort((a, b) => {
      // Ordenação dinâmica baseada na coluna selecionada
      const direction = sortDirection === "asc" ? 1 : -1;

      switch (sortColumn) {
        case "date":
          return (
            direction *
            (new Date(a.date).getTime() - new Date(b.date).getTime())
          );
        case "amount":
          return direction * (a.amount - b.amount);
        case "customer":
          return direction * a.customer.localeCompare(b.customer);
        case "product":
          return direction * a.product.localeCompare(b.product);
        default:
          return 0;
      }
    });

  // Exportar para CSV
  const exportToCSV = () => {
    const headers = [
      "ID",
      "Pedido",
      "Cliente",
      "Produto",
      "Valor",
      "Método",
      "Status",
      "Data",
    ];

    const csvRows = [
      headers.join(","),
      ...filteredTransactions.map((t) => {
        return [
          t.id,
          t.orderId,
          `"${t.customer.replace(/"/g, '""')}"`, // Escapar aspas no formato CSV
          `"${t.product.replace(/"/g, '""')}"`,
          formatCurrency(t.amount).replace(/\./g, ","),
          t.paymentMethod === "credit_card" ? "Cartão" : "PIX",
          t.status === "paid"
            ? "Pago"
            : t.status === "pending"
              ? "Pendente"
              : t.status === "failed"
                ? "Falhou"
                : "Reembolsado",
          format(new Date(t.date), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `transacoes_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.click();
  };

  // Exportar para JSON
  const exportToJSON = () => {
    const formattedData = filteredTransactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      customer: t.customer,
      product: t.product,
      amount: t.amount,
      formattedAmount: formatCurrency(t.amount),
      paymentMethod: t.paymentMethod,
      status: t.status,
      date: t.date,
      formattedDate: format(new Date(t.date), "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      }),
    }));

    const blob = new Blob([JSON.stringify(formattedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `transacoes_${format(new Date(), "yyyy-MM-dd")}.json`
    );
    link.click();
  };

  // Alternar ordem de classificação
  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc"); // Padrão para nova coluna
    }
  };

  useEffect(() => {
    async function fetchTransactions() {
      try {
        setLoading(true);

        const queryParams = new URLSearchParams({
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        });

        const response = await fetch(
          `/api/transactions?${queryParams.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [dateRange]);

  // Renderiza cabeçalho de coluna ordenável
  const renderSortableHeader = (title: string, column: string) => (
    <Button
      variant="ghost"
      onClick={() => toggleSort(column)}
      className="h-8 px-2 text-sm font-medium"
    >
      {title}
      {sortColumn === column ? (
        <ArrowUpDown
          className={`ml-1 h-4 w-4 ${sortDirection === "asc" ? "rotate-180" : ""}`}
        />
      ) : (
        <ArrowUpDown className="ml-1 h-4 w-4 opacity-20" />
      )}
    </Button>
  );

  return (
    <div className="space-y-4" ref={tableRef}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Transações Recentes</h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {/* Filtro de status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[130px] bg-white">
                <div className="flex items-center">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    {statusFilter === "all"
                      ? "Status"
                      : statusFilter === "paid"
                        ? "Pagos"
                        : statusFilter === "pending"
                          ? "Pendentes"
                          : statusFilter === "failed"
                            ? "Falhas"
                            : "Reembolsados"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Status</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falhas</SelectItem>
                <SelectItem value="refunded">Reembolsados</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de método de pagamento */}
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-9 w-[130px] bg-white">
                <div className="flex items-center">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    {paymentFilter === "all"
                      ? "Métodos"
                      : paymentFilter === "credit_card"
                        ? "Cartão de Crédito"
                        : "PIX"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Métodos</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
              </SelectContent>
            </Select>

            {/* Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar transações..."
                className="pl-8 h-9 pr-4 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Botão de exportação */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 bg-white">
                <Download className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Formato</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={exportToCSV}
                className="cursor-pointer"
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={exportToJSON}
                className="cursor-pointer"
              >
                <FileJson className="h-4 w-4 mr-2" />
                JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {loading ? (
        <Card className="overflow-hidden">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : filteredTransactions.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="text-center py-12 border rounded-md bg-muted/5">
            <p className="text-muted-foreground mb-2">
              Nenhuma transação encontrada
            </p>
            <p className="text-xs">
              {searchQuery || statusFilter !== "all" || paymentFilter !== "all"
                ? "Tente ajustar seus critérios de filtro"
                : "Não há transações no período selecionado"}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Pedido", "orderId")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Cliente", "customer")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Produto", "product")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Valor", "amount")}
                  </TableHead>
                  <TableHead className="font-medium whitespace-nowrap">
                    Método
                  </TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Data", "date")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="hover:bg-muted/5 transition-colors"
                  >
                    <TableCell className="font-medium text-sm">
                      {transaction.orderId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {transaction.customer}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {transaction.id.slice(0, 8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-sm"
                      title={transaction.product}
                    >
                      {transaction.product}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <PaymentMethodIcon method={transaction.paymentMethod} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {format(new Date(transaction.date), "dd MMM yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(transaction.date), "HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Resumo dos resultados e paginação */}
          <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center text-xs text-muted-foreground">
            <div>
              Exibindo {filteredTransactions.length} de {transactions.length}{" "}
              transações
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2">
                Anterior
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                Próxima
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
