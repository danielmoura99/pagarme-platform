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
      const result = await response.json();
      setEvents(result.recentEvents || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventData = (eventType: string, data: any) => {
    if (eventType === "Purchase" && data?.value) {
      return `R$ ${data.value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`;
    }
    return "";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse h-64 bg-gray-200 rounded"></div>
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
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <Badge variant="outline" className="mb-1">
                        {event.eventType}
                      </Badge>
                      <p className="text-sm font-medium">{event.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.platform}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatEventData(event.eventType, event.data)}
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
}
