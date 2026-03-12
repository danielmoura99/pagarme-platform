// app/(dashboard)/analytics/_components/paid-media.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Zap,
  ExternalLink,
  RefreshCw,
  Loader2,
  X,
  ChevronDown,
  Check,
  Filter,
} from "lucide-react";

interface CampaignRow {
  campaignId: string;
  campaignName: string;
  spend: number;
  clicks: number;
  impressions: number;
  reach: number;
  purchases: number;
  revenue: number;
  roas: number;
  cpa: number;
  cpc: number;
  ctr: number;
}

interface Summary {
  totalSpend: number;
  totalRevenue: number;
  totalPurchases: number;
  totalClicks: number;
  totalImpressions: number;
  roas: number;
  cpa: number;
  profit: number;
  lastSyncAt: string | null;
}

interface PaidMediaData {
  connected: boolean;
  summary: Summary | null;
  campaigns: CampaignRow[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtNum = (v: number) =>
  new Intl.NumberFormat("pt-BR").format(v);

function getRoasColor(roas: number) {
  if (roas >= 3) return "text-green-600";
  if (roas >= 1.5) return "text-yellow-600";
  return "text-red-600";
}

export function PaidMedia({ fromDate, toDate }: { fromDate?: string; toDate?: string }) {
  const [data, setData] = useState<PaidMediaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/analytics/paid-media?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      setData({ connected: false, summary: null, campaigns: [] });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/integrations/facebook-ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSyncMsg(`${json.campaigns} campanhas sincronizadas`);
      fetchData();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  function toggleCampaign(id: string) {
    setSelectedCampaigns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    if (!data) return;
    setSelectedCampaigns(new Set(data.campaigns.map((c) => c.campaignId)));
  }

  function clearSelection() {
    setSelectedCampaigns(new Set());
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-8 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-48 bg-gray-200 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.connected) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Facebook Ads não conectado</p>
              <p className="text-xs text-muted-foreground">
                Conecte sua conta para ver ROAS, CPA e métricas de campanhas
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/integrations/facebook-ads">
              <ExternalLink className="h-4 w-4 mr-2" />
              Configurar
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { campaigns } = data;

  if (!data.summary || campaigns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Nenhum dado de campanha no período</p>
              <p className="text-xs text-muted-foreground">
                Sincronize os dados ou ajuste o período selecionado
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Filtrar campanhas com base na seleção (vazio = todas)
  const hasFilter = selectedCampaigns.size > 0;
  const filtered = hasFilter
    ? campaigns.filter((c) => selectedCampaigns.has(c.campaignId))
    : campaigns;

  // Recalcular summary com base no filtro
  const totalSpend = filtered.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = filtered.reduce((s, c) => s + c.revenue, 0);
  const totalPurchases = filtered.reduce((s, c) => s + c.purchases, 0);
  const totalClicks = filtered.reduce((s, c) => s + c.clicks, 0);
  const totalImpressions = filtered.reduce((s, c) => s + c.impressions, 0);

  const summary = {
    totalSpend,
    totalRevenue,
    totalPurchases,
    totalClicks,
    totalImpressions,
    roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
    profit: totalRevenue - totalSpend,
    lastSyncAt: data.summary?.lastSyncAt ?? null,
  };

  return (
    <div className="space-y-4">
      {/* Filtro por campanha + sync */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Dropdown multi-select */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            {hasFilter
              ? `${selectedCampaigns.size} campanha${selectedCampaigns.size > 1 ? "s" : ""}`
              : "Todas as campanhas"}
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </Button>

          {dropdownOpen && (
            <div className="absolute z-50 mt-1 w-72 bg-white border rounded-lg shadow-lg">
              {/* Header do dropdown */}
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <span className="text-xs font-medium text-muted-foreground">Filtrar campanhas</span>
                <div className="flex gap-1">
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={selectAll}
                  >
                    Todas
                  </button>
                  <span className="text-xs text-muted-foreground">·</span>
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={clearSelection}
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Lista de campanhas */}
              <div className="max-h-56 overflow-y-auto py-1">
                {campaigns.map((c) => {
                  const isSelected = selectedCampaigns.has(c.campaignId);
                  return (
                    <button
                      key={c.campaignId}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                      onClick={() => toggleCampaign(c.campaignId)}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="truncate flex-1">{c.campaignName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{fmt(c.spend)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tags das campanhas selecionadas */}
        {hasFilter && (
          <div className="flex flex-wrap items-center gap-1.5">
            {campaigns
              .filter((c) => selectedCampaigns.has(c.campaignId))
              .map((c) => (
                <Badge
                  key={c.campaignId}
                  variant="secondary"
                  className="gap-1 pl-2 pr-1 py-0.5 text-xs cursor-pointer hover:bg-muted"
                  onClick={() => toggleCampaign(c.campaignId)}
                >
                  {c.campaignName.length > 25 ? c.campaignName.slice(0, 25) + "..." : c.campaignName}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            <button
              className="text-xs text-muted-foreground hover:text-foreground ml-1"
              onClick={clearSelection}
            >
              Limpar filtro
            </button>
          </div>
        )}

        {/* Sync button + info */}
        <div className="flex items-center gap-2 ml-auto">
          {syncMsg && (
            <span className={`text-xs ${syncMsg.includes("Erro") || syncMsg.includes("erro") ? "text-red-600" : "text-green-600"}`}>
              {syncMsg}
            </span>
          )}
          {summary.lastSyncAt && !syncMsg && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Sync: {new Date(summary.lastSyncAt).toLocaleString("pt-BR")}
            </span>
          )}
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-2 h-8 text-xs">
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(summary.totalSpend)}</div>
            <p className="text-xs text-muted-foreground">
              {fmtNum(summary.totalClicks)} cliques · {fmtNum(summary.totalImpressions)} impressões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRoasColor(summary.roas)}`}>
              {summary.roas.toFixed(2)}x
            </div>
            <p className="text-xs text-muted-foreground">
              Receita / Investimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPA</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(summary.cpa)}</div>
            <p className="text-xs text-muted-foreground">
              {fmtNum(summary.totalPurchases)} compras atribuídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Estimado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(summary.profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita {fmt(summary.totalRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de campanhas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Campanhas
            {hasFilter && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({filtered.length} de {campaigns.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead className="text-right">Investido</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">CPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.campaignId}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={c.campaignName}>
                    {c.campaignName}
                  </TableCell>
                  <TableCell className="text-right">{fmt(c.spend)}</TableCell>
                  <TableCell className="text-right">{fmtNum(c.clicks)}</TableCell>
                  <TableCell className="text-right">{c.purchases}</TableCell>
                  <TableCell className="text-right">{fmt(c.revenue)}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={c.roas >= 3 ? "default" : c.roas >= 1.5 ? "secondary" : "destructive"}
                      className="font-mono"
                    >
                      {c.roas.toFixed(2)}x
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{c.purchases > 0 ? fmt(c.cpa) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
