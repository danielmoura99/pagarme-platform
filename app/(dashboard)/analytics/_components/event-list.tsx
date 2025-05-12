/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/analytics/_components/events-list.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecentEvent {
  id: string;
  eventType: string;
  platform: string;
  productName: string;
  timestamp: string;
  data: any;
  value?: number;
}

interface EventsData {
  recentEvents: RecentEvent[];
}

export function EventsList() {
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/analytics/pixels");
      const result: EventsData = await response.json();
      console.log("EventsList - Dados recebidos:", result);
      setEvents(result.recentEvents || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
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
          <CardTitle>Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum evento registrado ainda.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Configure pixels nos seus produtos para começar a rastrear
              eventos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <Badge
                      className={getEventColor(event.eventType)}
                      variant="secondary"
                    >
                      {event.eventType}
                    </Badge>
                    <p className="text-sm font-medium mt-1">
                      {event.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.platform} • {event.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatEventData(event.eventType, event.data, event.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
