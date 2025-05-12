/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(dashboard)/products/[id]/pixels/_components/pixels-list.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Edit,
  Trash,
  TestTube,
  Copy,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { AlertModal } from "@/components/modals/alert-modal";
import { PixelPlatform } from "@/lib/tracking/types";

interface PixelConfig {
  id: string;
  platform: string;
  pixelId: string;
  enabled: boolean;
  events: any;
  testMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PixelsListProps {
  data: PixelConfig[];
  productId: string;
}

const platformIcons: Record<PixelPlatform, string> = {
  facebook: "🔵",
  google_ads: "🟢",
  google_analytics: "📊",
  tiktok: "⚫",
  snapchat: "🟡",
};

export function PixelsList({ data, productId }: PixelsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    pixelId: string | null;
  }>({ open: false, pixelId: null });

  const handleToggleEnabled = async (pixelId: string, enabled: boolean) => {
    try {
      setLoading(pixelId);
      const response = await fetch(`/api/pixels/manage/${pixelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        toast({
          description: `Pixel ${enabled ? "ativado" : "desativado"} com sucesso`,
        });
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao atualizar pixel",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleTestPixel = async (pixelId: string) => {
    try {
      const response = await fetch(`/api/pixels/manage/${pixelId}/test`, {
        method: "POST",
      });

      if (response.ok) {
        toast({
          description:
            "Evento de teste disparado! Verifique o console do navegador.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao testar pixel",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.pixelId) return;

    try {
      setLoading(deleteModal.pixelId);
      const response = await fetch(
        `/api/pixels/manage/${deleteModal.pixelId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast({
          description: "Pixel removido com sucesso",
        });
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao remover pixel",
      });
    } finally {
      setLoading(null);
      setDeleteModal({ open: false, pixelId: null });
    }
  };

  const copyPixelId = async (pixelId: string) => {
    try {
      await navigator.clipboard.writeText(pixelId);
      toast({
        description: "ID do pixel copiado!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao copiar ID",
      });
    }
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum pixel configurado. Adicione um pixel para começar a rastrear
          conversões.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {data.map((pixel) => (
          <Card key={pixel.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {platformIcons[pixel.platform as PixelPlatform]}
                  </span>
                  <div>
                    <h3 className="font-semibold capitalize">
                      {pixel.platform.replace("_", " ")}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <code className="bg-muted px-2 py-1 rounded">
                        {pixel.pixelId}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyPixelId(pixel.pixelId)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {pixel.testMode && (
                    <Badge variant="secondary">Modo Teste</Badge>
                  )}
                  <Switch
                    checked={pixel.enabled}
                    onCheckedChange={(checked) =>
                      handleToggleEnabled(pixel.id, checked)
                    }
                    disabled={loading === pixel.id}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(
                            `/products/${productId}/pixels/${pixel.id}/edit`
                          )
                        }
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleTestPixel(pixel.id)}
                      >
                        <TestTube className="mr-2 h-4 w-4" />
                        Testar Pixel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() =>
                          setDeleteModal({ open: true, pixelId: pixel.id })
                        }
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    Eventos rastreados:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(pixel.events) ? pixel.events : []).map(
                      (event: string) => (
                        <Badge
                          key={event}
                          variant="outline"
                          className="text-xs"
                        >
                          {event}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Última atualização:
                  </span>
                  <p>{new Date(pixel.updatedAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, pixelId: null })}
        onConfirm={handleDelete}
        loading={loading === deleteModal.pixelId}
      />
    </>
  );
}
