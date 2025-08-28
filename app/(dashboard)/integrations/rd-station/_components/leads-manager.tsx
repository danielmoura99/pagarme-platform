// app/(dashboard)/integrations/rd-station/_components/leads-manager.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Users, 
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { toast } from "sonner";

interface SyncStats {
  success: number;
  errors: number;
  total: number;
}

export function LeadsManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);

  const syncLeadsToRD = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/integrations/rd-station/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Enviar apenas eventos não sincronizados
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStats({
          success: data.synced || 0,
          errors: data.errors || 0,
          total: data.total || 0
        });
        toast.success(data.message);
      } else {
        throw new Error(data.error || 'Failed to sync leads');
      }
    } catch (error) {
      console.error('Failed to sync leads to RD Station:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao sincronizar leads");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                  <p className="text-xs text-muted-foreground">Enviados com sucesso</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total processados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Leads para RD Station
          </CardTitle>
          <CardDescription>
            Sincronize eventos de pixel não enviados para o RD Station
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Como funciona</p>
              <p>Esta funcionalidade envia automaticamente todos os eventos de pixel (PageView, Purchase, etc.) que ainda não foram sincronizados para o RD Station.</p>
            </div>
          </div>

          <Button 
            onClick={syncLeadsToRD} 
            disabled={isSyncing}
            className="w-full"
            size="lg"
          >
            {isSyncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sincronizando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Sincronizar Eventos Pendentes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}