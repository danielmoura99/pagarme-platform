/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(dashboard)/products/[id]/pixels/_components/pixel-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { PixelPlatform, PixelEvent } from "@/lib/tracking/types";

const pixelFormSchema = z.object({
  platform: z.enum(["facebook", "google_ads", "google_analytics"]),
  pixelId: z.string().min(1, "ID do pixel é obrigatório"),
  enabled: z.boolean().default(true),
  testMode: z.boolean().default(false),
  events: z.array(z.string()).min(1, "Selecione pelo menos um evento"),
});

type PixelFormValues = z.infer<typeof pixelFormSchema>;

const availableEvents: PixelEvent[] = [
  "PageView",
  "ViewContent",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
];

interface PixelFormProps {
  productId: string;
  initialData?: Partial<PixelFormValues> & { id?: string };
}

export function PixelForm({ productId, initialData }: PixelFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<PixelFormValues>({
    resolver: zodResolver(pixelFormSchema),
    defaultValues: {
      platform: initialData?.platform || "facebook",
      pixelId: initialData?.pixelId || "",
      enabled: initialData?.enabled ?? true,
      testMode: initialData?.testMode ?? false,
      events: initialData?.events || ["PageView", "Purchase"],
    },
  });

  const onSubmit = async (data: PixelFormValues) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        productId,
      };

      const url = initialData?.id
        ? `/api/pixels/${initialData.id}`
        : "/api/pixels";

      const method = initialData?.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar pixel");
      }

      toast({
        description: `Pixel ${initialData ? "atualizado" : "criado"} com sucesso`,
      });

      router.push(`/products/${productId}/pixels`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Erro ao salvar pixel",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? "Editar Pixel" : "Adicionar Pixel"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="facebook">
                        Facebook/Instagram
                      </SelectItem>
                      <SelectItem value="google_ads">Google Ads</SelectItem>
                      <SelectItem value="google_analytics">
                        Google Analytics
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pixelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Pixel</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        form.watch("platform") === "facebook"
                          ? "Ex: 123456789012345"
                          : form.watch("platform") === "google_ads"
                            ? "Ex: AW-123456789"
                            : "Ex: G-XXXXXXXXXX"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    O ID do pixel fornecido pela plataforma
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="events"
              render={() => (
                <FormItem>
                  <FormLabel>Eventos para Rastrear</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    {availableEvents.map((event) => (
                      <FormField
                        key={event}
                        control={form.control}
                        name="events"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={event}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(event)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, event])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== event
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {event}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormDescription>
                    Selecione quais eventos deseja rastrear
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativo</FormLabel>
                      <FormDescription>
                        Ativar ou desativar o rastreamento deste pixel
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Modo Teste</FormLabel>
                      <FormDescription>
                        Quando ativado, os eventos são logados no console ao
                        invés de serem enviados
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Salvar Alterações" : "Criar Pixel"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
