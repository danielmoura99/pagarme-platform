// app/(dashboard)/integrations/rd-station/_components/leads-manager.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Download, 
  RefreshCw, 
  Users, 
  UserPlus, 
  UserCheck, 
  AlertCircle,
  Calendar,
  Filter,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface ImportStats {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  total: number;
}

interface ImportHistory {
  id: string;
  timestamp: string;
  stats: ImportStats;
  filters: any;
}

export function LeadsManager() {
  const [isImporting, setIsImporting] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [filters, setFilters] = useState({
    email: '',
    createdAtPeriod: '',
    pageSize: '50'
  });

  useEffect(() => {
    loadImportHistory();
  }, []);

  const loadImportHistory = async () => {
    try {
      // Buscar logs de importação 
      const response = await fetch('/api/integrations/rd-station/sync-logs?type=import');
      if (response.ok) {
        const data = await response.json();
        // ✅ Proteção adicional contra dados malformados
        const logs = Array.isArray(data.logs) ? data.logs : [];
        const importHistory = Array.isArray(data.importHistory) ? data.importHistory : [];
        
        setHistory(importHistory); // ✅ Usar importHistory ao invés de logs
      } else {
        console.warn('Failed to fetch import history:', response.status);
        setHistory([]); // ✅ Fallback para array vazio
      }
    } catch (error) {
      console.error('Failed to load import history:', error);
      setHistory([]); // ✅ Fallback para array vazio em caso de erro
    }
  };

  const importLeads = async (importAll = false) => {
    setIsImporting(true);
    try {
      const response = await fetch('/api/integrations/rd-station/import-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: 1,
          pageSize: parseInt(filters.pageSize),
          importAll,
          filters: {
            email: filters.email || undefined,
            created_at_period: filters.createdAtPeriod || undefined
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStats(data.results);
        toast.success(data.message);
        await loadImportHistory();
      } else {
        throw new Error(data.error || 'Failed to import leads');
      }
    } catch (error) {
      console.error('Failed to import leads:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao importar leads");
    } finally {
      setIsImporting(false);
    }
  };

  const syncLatestLeads = async () => {
    // Importar apenas leads dos últimos 7 dias
    setFilters(prev => ({ ...prev, createdAtPeriod: 'last_7_days' }));
    await importLeads(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.imported}</p>
                  <p className="text-xs text-muted-foreground">Novos leads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.updated}</p>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-600">{stats.skipped}</p>
                  <p className="text-xs text-muted-foreground">Ignorados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar Leads do RD Station
          </CardTitle>
          <CardDescription>
            Sincronize leads do RD Station para sua base local
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => syncLatestLeads()} 
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar Recentes (7 dias)
            </Button>
            
            <Button 
              onClick={() => importLeads(true)} 
              disabled={isImporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Importar Todos
            </Button>
          </div>

          <Separator />

          {/* Advanced Filters */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <Label className="font-medium">Filtros Avançados</Label>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="email-filter">Email específico</Label>
                <Input
                  id="email-filter"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={filters.email}
                  onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period-filter">Período de criação</Label>
                <Select value={filters.createdAtPeriod} onValueChange={(value) => setFilters(prev => ({ ...prev, createdAtPeriod: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os períodos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="yesterday">Ontem</SelectItem>
                    <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                    <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                    <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pagesize-filter">Tamanho da página</Label>
                <Select value={filters.pageSize} onValueChange={(value) => setFilters(prev => ({ ...prev, pageSize: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 por página</SelectItem>
                    <SelectItem value="25">25 por página</SelectItem>
                    <SelectItem value="50">50 por página</SelectItem>
                    <SelectItem value="100">100 por página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={() => importLeads(false)} 
                disabled={isImporting}
                variant="secondary"
                className="w-full"
              >
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Importar com Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Importações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma importação realizada ainda</p>
              <p className="text-sm">Faça sua primeira importação de leads do RD Station</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">
                      {/* ✅ Proteção para date string e fallback */}
                      {item.date ? new Date(item.date).toLocaleDateString("pt-BR") : 'Data inválida'}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.imported || 0} novos
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.updated || 0} atualizados
                      </Badge>
                      {(item.errors || 0) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {item.errors || 0} erros
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Total: {item.total || 0} leads
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}