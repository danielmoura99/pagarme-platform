/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/analytics/_components/events-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface LeadEvent {
  id: string;
  eventType: string;
  platform: string;
  productName: string;
  timestamp: string;
  data: any;
  value?: number;
  // Dados do lead/cliente
  customerName?: string;
  customerEmail?: string;
  customerDocument?: string;
  // Dados do pedido
  orderId?: string;
  orderStatus?: string;
  paymentMethod?: string;
  installments?: number;
  // Dados de tracking
  source?: string;
  campaign?: string;
  medium?: string;
  referrer?: string;
}

interface EventsData {
  leadEvents: LeadEvent[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export function EventsList() {
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchEvents(currentPage);
  }, [currentPage]);

  const fetchEvents = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/pixels?page=${page}&limit=20`);
      const result: EventsData = await response.json();
      console.log("EventsList - Dados recebidos:", result);
      setEvents(result.leadEvents || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || 0);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatEventData = (eventType: string, data: any, value?: number) => {
    if (eventType === "Purchase" && value) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    }
    return "";
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "Purchase":
        return "bg-green-100 text-green-800";
      case "ViewContent":
        return "bg-blue-100 text-blue-800";
      case "InitiateCheckout":
        return "bg-orange-100 text-orange-800";
      case "AddPaymentInfo":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Componente de detalhes do lead
  const LeadDetails = ({ event }: { event: LeadEvent }) => (
    <div className="space-y-6">
      {/* Dados do Lead/Cliente */}
      {(event.customerName || event.customerEmail) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            📧 Dados do Lead
          </h4>
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
            {event.customerName && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">Nome:</span> {event.customerName}
              </p>
            )}
            {event.customerEmail && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">Email:</span> {event.customerEmail}
              </p>
            )}
            {event.customerDocument && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">Documento:</span> {event.customerDocument}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dados do Pedido */}
      {event.orderId && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            🛍️ Detalhes da Compra
          </h4>
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
            <p className="text-sm">
              <span className="font-medium text-gray-700">Pedido:</span> #{event.orderId.slice(-8)}
            </p>
            {event.orderStatus && (
              <p className="text-sm flex items-center">
                <span className="font-medium text-gray-700 mr-2">Status:</span>
                <Badge variant="outline">
                  {event.orderStatus}
                </Badge>
              </p>
            )}
            {event.paymentMethod && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">Pagamento:</span> {event.paymentMethod}
                {event.installments && event.installments > 1 && (
                  <span className="text-gray-500 ml-1">
                    ({event.installments}x)
                  </span>
                )}
              </p>
            )}
            {event.value && (
              <p className="text-sm">
                <span className="font-medium text-gray-700">Valor:</span>{" "}
                <span className="font-semibold text-green-600">
                  {formatEventData(event.eventType, event.data, event.value)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dados de Tracking */}
      {(event.source || event.campaign || event.referrer) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            📊 Origem do Tráfego
          </h4>
          <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {event.source && (
                <Badge variant="outline" className="text-xs">
                  Fonte: {event.source}
                </Badge>
              )}
              {event.campaign && (
                <Badge variant="outline" className="text-xs">
                  Campanha: {event.campaign}
                </Badge>
              )}
              {event.medium && (
                <Badge variant="outline" className="text-xs">
                  Meio: {event.medium}
                </Badge>
              )}
            </div>
            {event.referrer && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">Referrer:</span> {event.referrer}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dados técnicos do evento */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          🔧 Detalhes Técnicos
        </h4>
        <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
          <p className="text-sm">
            <span className="font-medium text-gray-700">ID do Evento:</span> {event.id}
          </p>
          <p className="text-sm">
            <span className="font-medium text-gray-700">Plataforma:</span> {event.platform}
          </p>
          <p className="text-sm">
            <span className="font-medium text-gray-700">Data/Hora:</span>{" "}
            {new Date(event.timestamp).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-40"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads e Conversões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum lead ou conversão registrado ainda.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Os dados de leads aparecerão aqui quando houver eventos com conversões.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Leads e Conversões</CardTitle>
        <div className="text-sm text-muted-foreground">
          {totalCount > 0 && `${totalCount} total`}
        </div>
      </CardHeader>
      <CardContent>
        {/* Lista resumida */}
        <div className="space-y-2">
          {events.map((event) => (
            <Dialog key={event.id}>
              <DialogTrigger asChild>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge
                      className={getEventColor(event.eventType)}
                      variant="secondary"
                    >
                      {event.eventType}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.productName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{event.platform}</span>
                        <span>•</span>
                        <span>{new Date(event.timestamp).toLocaleDateString("pt-BR")}</span>
                        {event.customerName && (
                          <>
                            <span>•</span>
                            <span className="truncate">{event.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {event.value && (
                      <span className="text-sm font-semibold text-green-600">
                        {formatEventData(event.eventType, event.data, event.value)}
                      </span>
                    )}
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Badge className={getEventColor(event.eventType)} variant="secondary">
                      {event.eventType}
                    </Badge>
                    {event.productName}
                  </DialogTitle>
                </DialogHeader>
                <LeadDetails event={event} />
              </DialogContent>
            </Dialog>
          ))}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
