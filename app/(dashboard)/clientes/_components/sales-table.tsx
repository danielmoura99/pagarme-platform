/* eslint-disable react-hooks/exhaustive-deps */
// app/(dashboard)/clientes/_components/sales-table.tsx
"use client";

import { useState, useEffect } from "react";
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
  Download,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  FileText,
  FileJson,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "../../_components/date-context";
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

// Tipo para representar uma venda
interface Sale {
  id: string;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
  customerPhone: string | null;
  productName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  installments: number;
  affiliateId: string | null;
  affiliateName: string | null;
  couponCode: string | null;
  splitAmount: number | null;
  createdAt: string;
  pagarmeTransactionId: string | null;
}

// Tipo para paginação
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startItem: number;
  endItem: number;
}

// Tipo para resposta da API
interface SalesResponse {
  sales: Sale[];
  pagination: PaginationInfo;
}

// Componente para exibir o status da venda
function SaleStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    paid: {
      label: "Pago",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    pending: {
      label: "Pendente",
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    },
    failed: {
      label: "Falhou",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    cancelled: {
      label: "Cancelado",
      className: "bg-gray-100 text-gray-800 border-gray-200",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge className={`font-medium text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}

// Formatar valor monetário
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount / 100);
}

// Formatar documento
function formatDocument(document: string) {
  return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Formatar método de pagamento
function formatPaymentMethod(method: string) {
  const methods: Record<string, string> = {
    credit_card: "Cartão",
    pix: "PIX",
    boleto: "Boleto",
  };
  return methods[method] || method;
}

// Tipo para representar um afiliado
interface Affiliate {
  id: string;
  name: string;
  email: string;
  commission: number;
  recipientId: string | null;
}

export function SalesTable() {
  const { dateRange } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false,
    startItem: 1,
    endItem: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [affiliateFilter, setAffiliateFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Função para buscar afiliados
  const fetchAffiliates = async () => {
    try {
      const response = await fetch("/api/affiliates");
      if (response.ok) {
        const data = await response.json();
        setAffiliates(data);
      }
    } catch (error) {
      console.error("Error fetching affiliates:", error);
    }
  };

  // Função para buscar vendas com paginação
  const fetchSales = async (page = 1) => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      // Adicionar filtros se selecionados
      if (statusFilter !== "all") {
        queryParams.append("status", statusFilter);
      }
      if (affiliateFilter !== "all") {
        queryParams.append("affiliate", affiliateFilter);
      }

      const response = await fetch(`/api/sales?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch sales");
      }

      const data: SalesResponse = await response.json();
      setSales(data.sales);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching sales:", error);
      setSales([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 50,
        hasNextPage: false,
        hasPreviousPage: false,
        startItem: 1,
        endItem: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Navegação da paginação
  const handlePreviousPage = () => {
    if (pagination.hasPreviousPage) {
      fetchSales(pagination.currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      fetchSales(pagination.currentPage + 1);
    }
  };

  // Carregar afiliados uma vez
  useEffect(() => {
    fetchAffiliates();
  }, []);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    fetchSales(1);
  }, [dateRange, statusFilter, affiliateFilter]);

  // Filtrar vendas localmente (sem afetar paginação)
  const filteredSales = sales
    .filter((sale) => {
      // Filtragem por texto (nome, email, documento ou produto)
      const textMatch =
        sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sale.customerDocument.includes(searchQuery.toLowerCase()) ||
        sale.productName.toLowerCase().includes(searchQuery.toLowerCase());

      return textMatch;
    })
    .sort((a, b) => {
      // Ordenação dinâmica baseada na coluna selecionada
      const direction = sortDirection === "asc" ? 1 : -1;

      switch (sortColumn) {
        case "createdAt":
          return (
            direction *
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        case "amount":
          return direction * (a.amount - b.amount);
        case "customerName":
          return direction * a.customerName.localeCompare(b.customerName);
        case "productName":
          return direction * a.productName.localeCompare(b.productName);
        default:
          return 0;
      }
    });

  // Exportar para CSV - busca TODOS os dados do período
  const exportToCSV = async () => {
    try {
      // Buscar TODOS os dados (sem paginação) aplicando os mesmos filtros
      const queryParams = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        limit: "999999", // Sem limite para exportação
      });

      if (statusFilter !== "all") {
        queryParams.append("status", statusFilter);
      }
      if (affiliateFilter !== "all") {
        queryParams.append("affiliate", affiliateFilter);
      }

      const response = await fetch(`/api/sales?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch all sales");
      }

      const data: SalesResponse = await response.json();
      const allSales = data.sales;

      // Aplicar filtro de busca local (se houver)
      const salesToExport = allSales.filter((sale) => {
        if (!searchQuery) return true;
        const textMatch =
          sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.customerDocument.includes(searchQuery.toLowerCase()) ||
          sale.productName.toLowerCase().includes(searchQuery.toLowerCase());
        return textMatch;
      });

      const headers = [
        "ID",
        "Data",
        "Cliente",
        "Email",
        "Telefone",
        "Documento",
        "Produto",
        "Valor",
        "Status",
        "Método Pagamento",
        "Parcelas",
        "Afiliado",
        "Cupom",
        "Comissão",
        "ID Transação",
      ];

      // Função auxiliar para escapar valores CSV
      const escapeCSV = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '""';
        const stringValue = String(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      };

      // Função para formatar valor monetário para CSV
      const formatCurrencyForCSV = (amount: number): string => {
        const value = (amount / 100).toFixed(2);
        return escapeCSV(value.replace(".", ","));
      };

      const csvRows = [
        headers.map(escapeCSV).join(","),
        ...salesToExport.map((sale) => {
          return [
            escapeCSV(sale.id),
            escapeCSV(
              format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })
            ),
            escapeCSV(sale.customerName),
            escapeCSV(sale.customerEmail),
            escapeCSV(sale.customerPhone || "Não informado"),
            escapeCSV(formatDocument(sale.customerDocument)),
            escapeCSV(sale.productName),
            formatCurrencyForCSV(sale.amount),
            escapeCSV(
              sale.status === "paid"
                ? "Pago"
                : sale.status === "failed"
                  ? "Falhou"
                  : sale.status === "cancelled"
                    ? "Cancelado"
                    : "Pendente"
            ),
            escapeCSV(formatPaymentMethod(sale.paymentMethod)),
            escapeCSV(sale.installments),
            escapeCSV(sale.affiliateName || "Direto"),
            escapeCSV(sale.couponCode || "Sem cupom"),
            sale.splitAmount
              ? formatCurrencyForCSV(Math.round(sale.splitAmount * 100))
              : escapeCSV("0,00"),
            escapeCSV(sale.pagarmeTransactionId || "N/A"),
          ].join(",");
        }),
      ].join("\n");

      // Adicionar BOM (Byte Order Mark) para garantir encoding UTF-8 correto
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvRows], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `vendas_${format(new Date(), "yyyy-MM-dd")}.csv`
      );
      link.click();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Erro ao exportar CSV. Tente novamente.");
    }
  };

  // Exportar para JSON - busca TODOS os dados do período
  const exportToJSON = async () => {
    try {
      // Buscar TODOS os dados (sem paginação) aplicando os mesmos filtros
      const queryParams = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        limit: "999999", // Sem limite para exportação
      });

      if (statusFilter !== "all") {
        queryParams.append("status", statusFilter);
      }
      if (affiliateFilter !== "all") {
        queryParams.append("affiliate", affiliateFilter);
      }

      const response = await fetch(`/api/sales?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch all sales");
      }

      const data: SalesResponse = await response.json();
      const allSales = data.sales;

      // Aplicar filtro de busca local (se houver)
      const salesToExport = allSales.filter((sale) => {
        if (!searchQuery) return true;
        const textMatch =
          sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sale.customerDocument.includes(searchQuery.toLowerCase()) ||
          sale.productName.toLowerCase().includes(searchQuery.toLowerCase());
        return textMatch;
      });

      const formattedData = salesToExport.map((sale) => ({
        id: sale.id,
        data: sale.createdAt,
        dataFormatada: format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", {
          locale: ptBR,
        }),

        // Informações do cliente
        cliente: {
          nome: sale.customerName,
          email: sale.customerEmail,
          telefone: sale.customerPhone || "Não informado",
          documento: sale.customerDocument,
          documentoFormatado: formatDocument(sale.customerDocument),
        },

        // Informações do produto
        produto: sale.productName,

        // Informações financeiras
        valor: sale.amount,
        valorFormatado: formatCurrency(sale.amount),
        metodoPagamento: sale.paymentMethod,
        metodoPagamentoFormatado: formatPaymentMethod(sale.paymentMethod),
        parcelas: sale.installments,

        // Status
        status: sale.status,
        statusFormatado:
          sale.status === "paid"
            ? "Pago"
            : sale.status === "failed"
              ? "Falhou"
              : sale.status === "cancelled"
                ? "Cancelado"
                : "Pendente",

        // Afiliado
        afiliado: sale.affiliateId
          ? {
              id: sale.affiliateId,
              nome: sale.affiliateName,
              comissao: sale.splitAmount,
              comissaoFormatada: sale.splitAmount
                ? formatCurrency(Math.round(sale.splitAmount * 100))
                : "R$ 0,00",
            }
          : null,

        // Cupom
        cupom: sale.couponCode,

        // ID da transação
        transacaoId: sale.pagarmeTransactionId,
      }));

      const blob = new Blob([JSON.stringify(formattedData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `vendas_${format(new Date(), "yyyy-MM-dd")}.json`
      );
      link.click();
    } catch (error) {
      console.error("Error exporting JSON:", error);
      alert("Erro ao exportar JSON. Tente novamente.");
    }
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Base de Vendas
        </h2>

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
                        : statusFilter === "failed"
                          ? "Falhados"
                          : statusFilter === "pending"
                            ? "Pendentes"
                            : "Cancelados"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falhados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de afiliado específico */}
            <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
              <SelectTrigger className="h-9 w-[180px] bg-white">
                <div className="flex items-center">
                  <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">
                    {affiliateFilter === "all"
                      ? "Todos Afiliados"
                      : affiliateFilter === "with_affiliate"
                        ? "Com Afiliado"
                        : affiliateFilter === "without_affiliate"
                          ? "Sem Afiliado"
                          : affiliates.find((a) => a.id === affiliateFilter)
                              ?.name || "Afiliado"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Afiliados</SelectItem>
                <SelectItem value="with_affiliate">Com Afiliado</SelectItem>
                <SelectItem value="without_affiliate">Sem Afiliado</SelectItem>
                {affiliates.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t">
                      Afiliados Específicos
                    </div>
                    {affiliates.map((affiliate) => (
                      <SelectItem key={affiliate.id} value={affiliate.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{affiliate.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar vendas..."
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
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Afiliado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
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
      ) : filteredSales.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="text-center py-12 border rounded-md bg-muted/5">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              Nenhuma venda encontrada
            </p>
            <p className="text-xs">
              {searchQuery ||
              statusFilter !== "all" ||
              affiliateFilter !== "all"
                ? "Tente ajustar seus critérios de filtro"
                : "Não há vendas no período selecionado"}
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
                    {renderSortableHeader("Data", "createdAt")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Cliente", "customerName")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Produto", "productName")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Valor", "amount")}
                  </TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Pagamento</TableHead>
                  <TableHead className="font-medium">Afiliado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="hover:bg-muted/5 transition-colors"
                  >
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(sale.createdAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(sale.createdAt), "HH:mm", {
                          locale: ptBR,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {sale.customerName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sale.customerEmail}
                        </div>
                        {sale.customerPhone && (
                          <div className="text-xs text-muted-foreground">
                            {sale.customerPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-[200px] truncate">
                        {sale.productName}
                      </div>
                      {sale.couponCode && (
                        <div className="text-xs text-blue-600">
                          Cupom: {sale.couponCode}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {formatCurrency(sale.amount)}
                      </div>
                      {sale.splitAmount && sale.splitAmount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Comissão:{" "}
                          {formatCurrency(Math.round(sale.splitAmount))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <SaleStatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatPaymentMethod(sale.paymentMethod)}
                      </div>
                      {sale.installments > 1 && (
                        <div className="text-xs text-muted-foreground">
                          {sale.installments}x
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {sale.affiliateName ? (
                        <div className="text-sm text-blue-600">
                          {sale.affiliateName}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Direto
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginação e resumo dos resultados */}
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between items-center text-sm">
            <div className="text-muted-foreground">
              Exibindo {pagination.startItem} - {pagination.endItem} de{" "}
              {pagination.totalCount} vendas
              {filteredSales.length !== sales.length && (
                <span className="text-blue-600 ml-1">
                  ({filteredSales.length} filtradas)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Página {pagination.currentPage} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={handlePreviousPage}
                disabled={!pagination.hasPreviousPage || loading}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage || loading}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
