// app/(dashboard)/analytics/_components/traffic-sources.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CampaignRow {
  campaign: string;
  source: string;
  medium: string;
  initiateCheckout: number;
  purchases: number;
  conversionRate: number;
  revenue: number;
}

interface MajorSource {
  source: string; // "facebook" | "google" | "direct" | etc.
  visitors: number;
  purchases: number;
  revenue: number;
}

interface TrafficData {
  campaigns: CampaignRow[];
  majorSources: MajorSource[];
}

export function TrafficSources({ fromDate }: { fromDate?: string }) {
  const [data, setData] = useState<TrafficData>({ campaigns: [], majorSources: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      const response = await fetch(`/api/analytics/traffic-sources?${params}`);
      const result = await response.json();

      // Tabela de campanhas: vem de topCampaigns (Order como fonte)
      const campaigns: CampaignRow[] = (result.topCampaigns || []).map((c: any) => ({
        campaign: c.campaign || "—",
        source: c.source || "direct",
        medium: c.medium || "none",
        initiateCheckout: c.initiateCheckout || 0,
        purchases: c.conversions || 0,
        conversionRate: c.initiateCheckout > 0
          ? (c.conversions / c.initiateCheckout) * 100
          : 0,
        revenue: c.revenue || 0,
      }));

      // Fontes major: agrupar sources por nome base (facebook, google, direct, etc.)
      const sourceMap = new Map<string, MajorSource>();
      (result.sources || []).forEach((s: any) => {
        const key = normalizeSouce(s.source);
        const existing = sourceMap.get(key);
        if (existing) {
          existing.visitors += s.visitors || 0;
          existing.purchases += s.conversions || 0;
          existing.revenue += s.revenue || 0;
        } else {
          sourceMap.set(key, {
            source: key,
            visitors: s.visitors || 0,
            purchases: s.conversions || 0,
            revenue: s.revenue || 0,
          });
        }
      });

      setData({
        campaigns,
        majorSources: Array.from(sourceMap.values()).sort((a, b) => b.revenue - a.revenue),
      });
    } catch (error) {
      console.error("Failed to fetch traffic sources:", error);
    } finally {
      setLoading(false);
    }
  };

  // Normaliza source para nomes major
  const normalizeSouce = (source: string): string => {
    const s = (source || "direct").toLowerCase();
    if (s.includes("facebook") || s.includes("fb") || s.includes("instagram")) return "Facebook / Instagram";
    if (s.includes("google")) return "Google";
    if (s.includes("tiktok")) return "TikTok";
    if (s.includes("snapchat")) return "Snapchat";
    if (s === "direct" || s === "(direct)" || s === "") return "Direto";
    if (s.includes("email") || s.includes("newsletter")) return "Email";
    return source; // mantém o original se não mapear
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const sourceColor = (source: string) => {
    if (source.includes("Facebook")) return "bg-blue-100 text-blue-800";
    if (source.includes("Google")) return "bg-yellow-100 text-yellow-800";
    if (source.includes("TikTok")) return "bg-pink-100 text-pink-800";
    if (source.includes("Snapchat")) return "bg-orange-100 text-orange-800";
    if (source === "Direto") return "bg-gray-100 text-gray-700";
    return "bg-purple-100 text-purple-800";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card><CardContent className="p-6"><div className="animate-pulse h-48 bg-gray-200 rounded" /></CardContent></Card>
        <Card><CardContent className="p-6"><div className="animate-pulse h-48 bg-gray-200 rounded" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Fontes de tráfego major */}
      <Card>
        <CardHeader>
          <CardTitle>Visitantes por Fonte</CardTitle>
        </CardHeader>
        <CardContent>
          {data.majorSources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma fonte registrada no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left pb-2 font-medium">Fonte</th>
                    <th className="text-right pb-2 font-medium">Visitantes</th>
                    <th className="text-right pb-2 font-medium">Compras</th>
                    <th className="text-right pb-2 font-medium">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.majorSources.map((row) => (
                    <tr key={row.source} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <Badge className={sourceColor(row.source)} variant="secondary">
                          {row.source}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-medium">{row.visitors.toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-right font-medium">{row.purchases.toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-right font-medium text-green-700">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Campanha</CardTitle>
        </CardHeader>
        <CardContent>
          {data.campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma campanha com UTM registrada no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="text-left pb-2 font-medium">Campanha</th>
                    <th className="text-left pb-2 font-medium">Fonte</th>
                    <th className="text-right pb-2 font-medium">Checkouts</th>
                    <th className="text-right pb-2 font-medium">Compras</th>
                    <th className="text-right pb-2 font-medium">Conversão</th>
                    <th className="text-right pb-2 font-medium">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.campaigns.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4 font-medium max-w-[200px] truncate" title={row.campaign}>
                        {row.campaign}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">{row.source}</Badge>
                          <Badge variant="secondary" className="text-xs">{row.medium}</Badge>
                        </div>
                      </td>
                      <td className="py-3 text-right">{row.initiateCheckout.toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-right font-medium">{row.purchases.toLocaleString("pt-BR")}</td>
                      <td className="py-3 text-right">
                        <span className={row.conversionRate >= 1 ? "text-green-700 font-medium" : "text-muted-foreground"}>
                          {row.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-medium text-green-700">{formatCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
