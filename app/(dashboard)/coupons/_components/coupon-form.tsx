// app/(dashboard)/coupons/_components/coupon-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createCoupon, updateCoupon } from "../_actions";
//import { Select } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";

interface CouponFormProps {
  initialData?: {
    id: string;
    code: string;
    active: boolean;
    discountPercentage: number;
    maxUses: number | null;
    expiresAt: Date | null;
    productIds: string[];
  };
  products: {
    id: string;
    name: string;
  }[];
}

const formSchema = z.object({
  code: z
    .string()
    .min(3, "Código deve ter pelo menos 3 caracteres")
    .refine(
      (str) => /^[A-Z0-9]+$/.test(str),
      "Código deve conter apenas letras maiúsculas e números"
    ),
  active: z.boolean().default(true),
  discountPercentage: z.coerce
    .number()
    .min(1, "Desconto mínimo de 1%")
    .max(100, "Desconto máximo de 100%"),
  productIds: z.array(z.string()).min(1, "Selecione pelo menos um produto"),
  maxUses: z.coerce.number().min(1, "Mínimo de 1 uso").optional().nullable(),
  expiresAt: z.date().optional().nullable(),
});

type CouponFormValues = z.infer<typeof formSchema>;

export function CouponForm({ initialData, products }: CouponFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Editar cupom" : "Novo cupom";
  const description = initialData
    ? "Atualize as informações do cupom"
    : "Crie um novo cupom de desconto";
  const action = initialData ? "Salvar alterações" : "Criar cupom";

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      code: "",
      active: true,
      discountPercentage: 10,
      maxUses: null,
      expiresAt: null,
      productIds: [],
    },
  });

  const onSubmit = async (data: CouponFormValues) => {
    try {
      setLoading(true);

      // Converter o código para maiúsculas
      data.code = data.code.toUpperCase();

      if (initialData?.id) {
        await updateCoupon(initialData.id, data);
        toast({
          title: "Sucesso!",
          description: "Cupom atualizado com sucesso.",
        });
      } else {
        await createCoupon(data);
        toast({
          title: "Sucesso!",
          description: "Cupom criado com sucesso.",
        });
      }

      router.push("/coupons");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro!",
        description: "Não foi possível salvar o cupom.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/coupons")}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground font-normal">
              {description}
            </p>
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4">
                {/* Código do Cupom */}
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do cupom</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={loading}
                          placeholder="DESCONTO10"
                          className="uppercase"
                        />
                      </FormControl>
                      <FormDescription>
                        Apenas letras maiúsculas e números
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Porcentagem de Desconto */}
                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porcentagem de desconto</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            {...field}
                            disabled={loading}
                            placeholder="10"
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-2">%</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Produtos Aplicáveis */}
                <FormField
                  control={form.control}
                  name="productIds"
                  render={({ field }) => {
                    // Garantir que field.value é sempre um array, mesmo quando undefined
                    const value = field.value ?? [];

                    return (
                      <FormItem>
                        <FormLabel>Produtos aplicáveis</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={(products ?? []).map((product) => ({
                              value: product.id,
                              label: product.name,
                            }))}
                            selected={value}
                            onChange={field.onChange}
                            placeholder="Selecione os produtos"
                          />
                        </FormControl>
                        <FormDescription className="mt-1">
                          Selecione os produtos aos quais este cupom pode ser
                          aplicado
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Limite de Usos */}
                <FormField
                  control={form.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de usos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          disabled={loading}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : Number(value));
                          }}
                          className="h-9"
                          placeholder="Sem limite"
                        />
                      </FormControl>
                      <FormDescription className="mt-1">
                        Deixe em branco para usos ilimitados
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data de Expiração */}
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de expiração</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Deixe em branco para cupom sem expiração
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Status do cupom
                        </FormLabel>
                        <FormDescription>
                          {field.value
                            ? "Cupom ativo e disponível para uso"
                            : "Cupom inativo e não pode ser utilizado"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={loading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  disabled={loading}
                  variant="outline"
                  onClick={() => router.push("/coupons")}
                >
                  Cancelar
                </Button>
                <Button disabled={loading} type="submit">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {action}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
