/* eslint-disable react-hooks/exhaustive-deps */
// app/(dashboard)/clientes/_components/clients-table.tsx
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
  Download,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  FileText,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Users,
  Eye,
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
import { ClientDetailsModal } from "./client-details-modal";

// Tipo para representar um cliente
interface Client {
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

  // Datas do registro
  createdAt: string;
  updatedAt: string;
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
interface ClientsResponse {
  clients: Client[];
  pagination: PaginationInfo;
}

// Componente para exibir o status do cliente
function ClientStatusBadge({ status }: { status: Client["clientStatus"] }) {
  const statusConfig = {
    active: {
      label: "Ativo",
      variant: "default" as const,
      className: "bg-green-100 text-green-800 border-green-200",
    },
    inactive: {
      label: "Inativo",
      variant: "secondary" as const,
      className: "bg-gray-100 text-gray-800 border-gray-200",
    },
    problematic: {
      label: "Problemático",
      variant: "destructive" as const,
      className: "bg-red-100 text-red-800 border-red-200",
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

// Tipo para representar um afiliado
interface Affiliate {
  id: string;
  name: string;
  email: string;
  commission: number;
  recipientId: string | null;
}

export function ClientsTable() {
  const { dateRange } = useDateRange();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
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
  const [sortColumn, setSortColumn] = useState<string>("lastPurchase");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const tableRef = useRef<HTMLDivElement>(null);

  // Estado para o modal de detalhes do cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    undefined
  );

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

  // Função para buscar clientes com paginação
  const fetchClients = async (page = 1) => {
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

      const response = await fetch(`/api/clients?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }

      const data: ClientsResponse = await response.json();
      setClients(data.clients);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
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
      fetchClients(pagination.currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      fetchClients(pagination.currentPage + 1);
    }
  };

  // Carregar afiliados uma vez
  useEffect(() => {
    fetchAffiliates();
  }, []);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    fetchClients(1);
  }, [dateRange, statusFilter, affiliateFilter]);

  // Filtrar clientes localmente (sem afetar paginação)
  const filteredClients = clients
    .filter((client) => {
      // Filtragem por texto (nome, email ou documento)
      const textMatch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.document.includes(searchQuery.toLowerCase());

      return textMatch;
    })
    .sort((a, b) => {
      // Ordenação dinâmica baseada na coluna selecionada
      const direction = sortDirection === "asc" ? 1 : -1;

      switch (sortColumn) {
        case "lastPurchase":
          const aDate = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0;
          const bDate = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0;
          return direction * (aDate - bDate);
        case "totalSpent":
          return direction * (a.totalSpent - b.totalSpent);
        case "totalOrders":
          return direction * (a.totalOrders - b.totalOrders);
        case "name":
          return direction * a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  // Abrir o modal de detalhes do cliente
  const handleOpenClientDetails = (clientId: string) => {
    setSelectedClientId(clientId);
    setIsModalOpen(true);
  };

  // Exportar para CSV
  const exportToCSV = () => {
    const headers = [
      "ID",
      "Nome",
      "Email",
      "Documento",
      "Telefone",
      "Status",
      "Total Gasto",
      "Total Pedidos",
      "Ticket Médio",
      "Primeira Compra",
      "Última Compra",
      "Dias desde Última Compra",
      "Pedidos Pagos",
      "Pedidos Falharam",
      "Pedidos Pendentes",
      "Tem Vendas via Afiliado",
      "Data Cadastro",
    ];

    const csvRows = [
      headers.join(","),
      ...filteredClients.map((client) => {
        return [
          client.id,
          `"${client.name.replace(/"/g, '""')}"`,
          `"${client.email.replace(/"/g, '""')}"`,
          `"${formatDocument(client.document)}"`,
          client.phone
            ? `"${client.phone.replace(/"/g, '""')}"`
            : "Não informado",
          client.clientStatus === "active"
            ? "Ativo"
            : client.clientStatus === "inactive"
              ? "Inativo"
              : "Problemático",
          formatCurrency(client.totalSpent).replace(/\./g, ","),
          client.totalOrders.toString(),
          formatCurrency(client.averageOrderValue).replace(/\./g, ","),
          client.firstPurchase
            ? format(new Date(client.firstPurchase), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })
            : "N/A",
          client.lastPurchase
            ? format(new Date(client.lastPurchase), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })
            : "N/A",
          client.daysSinceLastPurchase?.toString() || "N/A",
          client.paidOrdersCount.toString(),
          client.failedOrdersCount.toString(),
          client.pendingOrdersCount.toString(),
          client.hasAffiliateOrders ? "Sim" : "Não",
          format(new Date(client.createdAt), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          }),
        ].join(",");
      }),
    ].join("\n");

    // Adicionar BOM (Byte Order Mark) para garantir encoding UTF-8 correto
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvRows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `clientes_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.click();
  };

  // Exportar para JSON
  const exportToJSON = () => {
    const formattedData = filteredClients.map((client) => ({
      // Informações básicas
      id: client.id,
      name: client.name,
      email: client.email,
      document: client.document,
      formattedDocument: formatDocument(client.document),
      phone: client.phone || "Não informado",

      // Status e métricas
      status: client.clientStatus,
      statusLabel:
        client.clientStatus === "active"
          ? "Ativo"
          : client.clientStatus === "inactive"
            ? "Inativo"
            : "Problemático",

      // Métricas financeiras
      totalSpent: client.totalSpent,
      formattedTotalSpent: formatCurrency(client.totalSpent),
      totalOrders: client.totalOrders,
      averageOrderValue: client.averageOrderValue,
      formattedAverageOrderValue: formatCurrency(client.averageOrderValue),

      // Contadores de pedidos
      paidOrdersCount: client.paidOrdersCount,
      failedOrdersCount: client.failedOrdersCount,
      pendingOrdersCount: client.pendingOrdersCount,

      // Datas importantes
      firstPurchase: client.firstPurchase,
      formattedFirstPurchase: client.firstPurchase
        ? format(new Date(client.firstPurchase), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })
        : null,
      lastPurchase: client.lastPurchase,
      formattedLastPurchase: client.lastPurchase
        ? format(new Date(client.lastPurchase), "dd/MM/yyyy HH:mm", {
            locale: ptBR,
          })
        : null,
      daysSinceLastPurchase: client.daysSinceLastPurchase,

      // Informações de afiliado
      hasAffiliateOrders: client.hasAffiliateOrders,
      affiliatesUsed: client.affiliatesUsed,

      // Datas do sistema
      createdAt: client.createdAt,
      formattedCreatedAt: format(
        new Date(client.createdAt),
        "dd/MM/yyyy HH:mm",
        { locale: ptBR }
      ),
      updatedAt: client.updatedAt,
      formattedUpdatedAt: format(
        new Date(client.updatedAt),
        "dd/MM/yyyy HH:mm",
        { locale: ptBR }
      ),
    }));

    const blob = new Blob([JSON.stringify(formattedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `clientes_${format(new Date(), "yyyy-MM-dd")}.json`
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
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Base de Clientes
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
                      : statusFilter === "active"
                        ? "Ativos"
                        : statusFilter === "inactive"
                          ? "Inativos"
                          : "Problemáticos"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="problematic">Problemáticos</SelectItem>
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
                placeholder="Buscar clientes..."
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Gasto</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-16" />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="text-center py-12 border rounded-md bg-muted/5">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              Nenhum cliente encontrado
            </p>
            <p className="text-xs">
              {searchQuery ||
              statusFilter !== "all" ||
              affiliateFilter !== "all"
                ? "Tente ajustar seus critérios de filtro"
                : "Não há clientes no período selecionado"}
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
                    {renderSortableHeader("Cliente", "name")}
                  </TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Total Gasto", "totalSpent")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Pedidos", "totalOrders")}
                  </TableHead>
                  <TableHead className="font-medium">
                    {renderSortableHeader("Última Compra", "lastPurchase")}
                  </TableHead>
                  <TableHead className="font-medium">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="hover:bg-muted/5 transition-colors"
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{client.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {client.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDocument(client.document)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ClientStatusBadge status={client.clientStatus} />
                      {client.hasAffiliateOrders && (
                        <div className="text-xs text-blue-600 mt-1">
                          Via Afiliado
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {formatCurrency(client.totalSpent)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ticket: {formatCurrency(client.averageOrderValue)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {client.totalOrders}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {client.paidOrdersCount}✓ {client.failedOrdersCount}✗{" "}
                        {client.pendingOrdersCount}⏳
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.lastPurchase ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            {format(
                              new Date(client.lastPurchase),
                              "dd MMM yyyy",
                              {
                                locale: ptBR,
                              }
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {client.daysSinceLastPurchase} dias atrás
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Nunca comprou
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenClientDetails(client.id)}
                        className="h-8 px-2"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
              {pagination.totalCount} clientes
              {filteredClients.length !== clients.length && (
                <span className="text-blue-600 ml-1">
                  ({filteredClients.length} filtrados)
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

      {/* Modal de detalhes do cliente */}
      <ClientDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientId={selectedClientId}
      />
    </div>
  );
}
