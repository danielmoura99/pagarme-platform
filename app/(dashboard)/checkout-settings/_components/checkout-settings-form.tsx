"use client";

// app/(dashboard)/checkout-settings/_components/checkout-settings-form.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import Image from "next/image";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ColorPicker } from "./color-picker";
import { CheckoutPreview } from "./checkout-preview";
import { updateCheckoutSettings } from "../_actions";

const formSchema = z.object({
  companyName: z.string().min(1, "Nome da empresa é obrigatório"),
  logoUrl: z.string().url("URL da logo inválida").optional().or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor primária inválida"),
  secondaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor secundária inválida"),
  accentColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor de destaque inválida"),
  checkoutTitle: z.string().min(1, "Título do checkout é obrigatório"),
  checkoutDescription: z.string().min(1, "Descrição do checkout é obrigatória"),
  successMessage: z.string().min(1, "Mensagem de sucesso é obrigatória"),
  termsAndConditionsUrl: z
    .string()
    .url("URL dos termos e condições inválida")
    .optional()
    .or(z.literal("")),
  privacyPolicyUrl: z
    .string()
    .url("URL da política de privacidade inválida")
    .optional()
    .or(z.literal("")),
  showInstallments: z.boolean().default(true),
  maxInstallments: z.coerce.number().min(1).max(12),
  showPixDiscount: z.boolean().default(false),
  pixDiscountPercentage: z.coerce.number().min(0).max(100).default(0),
  defaultPaymentMethod: z.enum(["credit_card", "pix"]),
  enableOrderBumps: z.boolean().default(true),
  headerBackgroundImage: z
    .string()
    .url("URL da imagem de fundo inválida")
    .optional()
    .or(z.literal("")),
  footerText: z.string().optional(),
  customCss: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof formSchema>;

interface CheckoutSettingsFormProps {
  initialData: SettingsFormValues;
}

export function CheckoutSettingsForm({
  initialData,
}: CheckoutSettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      companyName: "PayStep",
      logoUrl: "",
      primaryColor: "#000000",
      secondaryColor: "#4F46E5",
      accentColor: "#10B981",
      checkoutTitle: "Finalizar Compra",
      checkoutDescription: "Complete suas informações para prosseguir",
      successMessage:
        "Pagamento Confirmado! Seu pedido foi processado com sucesso.",
      termsAndConditionsUrl: "",
      privacyPolicyUrl: "",
      showInstallments: true,
      maxInstallments: 12,
      showPixDiscount: false,
      pixDiscountPercentage: 0,
      defaultPaymentMethod: "credit_card",
      enableOrderBumps: true,
      headerBackgroundImage: "",
      footerText: "© 2024 PayStep. Todos os direitos reservados.",
      customCss: "",
    },
  });

  const watchedValues = form.watch();

  async function onSubmit(data: SettingsFormValues) {
    try {
      setLoading(true);
      await updateCheckoutSettings(data);
      toast({
        title: "Sucesso!",
        description: "Configurações do checkout atualizadas",
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro!",
        description: "Houve um erro ao salvar as configurações",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="aparencia">Aparência</TabsTrigger>
                <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
                <TabsTrigger value="avancado">Avançado</TabsTrigger>
              </TabsList>

              <Card className="mt-4 border rounded-md">
                <CardContent className="p-6">
                  <TabsContent value="geral" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Empresa</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={loading}
                              placeholder="Nome da sua empresa"
                            />
                          </FormControl>
                          <FormDescription>
                            Este nome será exibido em várias partes do checkout
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Logo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={loading}
                              placeholder="https://exemplo.com/logo.png"
                            />
                          </FormControl>
                          <FormDescription>
                            URL da imagem do logo da sua empresa
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="checkoutTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título do Checkout</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={loading}
                                placeholder="Finalizar Compra"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="defaultPaymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Método de Pagamento Padrão</FormLabel>
                            <Select
                              disabled={loading}
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o método padrão" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white">
                                <SelectItem value="credit_card">
                                  Cartão de Crédito
                                </SelectItem>
                                <SelectItem value="pix">PIX</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="checkoutDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Checkout</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              disabled={loading}
                              placeholder="Complete suas informações para prosseguir"
                              rows={2}
                            />
                          </FormControl>
                          <FormDescription>
                            Uma breve descrição exibida abaixo do título
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="successMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensagem de Sucesso</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              disabled={loading}
                              placeholder="Pagamento Confirmado! Seu pedido foi processado com sucesso."
                              rows={2}
                            />
                          </FormControl>
                          <FormDescription>
                            Mensagem exibida após a conclusão do pagamento
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="termsAndConditionsUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL dos Termos e Condições</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={loading}
                                placeholder="https://exemplo.com/termos"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="privacyPolicyUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              URL da Política de Privacidade
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={loading}
                                placeholder="https://exemplo.com/privacidade"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="aparencia" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor Primária</FormLabel>
                            <FormControl>
                              <ColorPicker {...field} disabled={loading} />
                            </FormControl>
                            <FormDescription>
                              Cor principal dos botões e títulos
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor Secundária</FormLabel>
                            <FormControl>
                              <ColorPicker {...field} disabled={loading} />
                            </FormControl>
                            <FormDescription>
                              Cor para elementos secundários
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accentColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de Destaque</FormLabel>
                            <FormControl>
                              <ColorPicker {...field} disabled={loading} />
                            </FormControl>
                            <FormDescription>
                              Cor para elementos de destaque
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="headerBackgroundImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Imagem de Fundo do Cabeçalho</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={loading}
                              placeholder="https://exemplo.com/background.jpg"
                            />
                          </FormControl>
                          <FormDescription>
                            URL da imagem para o fundo do cabeçalho do checkout
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Renderização condicional da imagem de preview */}
                    {form.watch("headerBackgroundImage") && (
                      <div className="mt-2 relative w-full h-32 rounded-md overflow-hidden">
                        <Image
                          src={form.watch("headerBackgroundImage") || ""}
                          alt="Background preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="footerText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Texto do Rodapé</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={loading}
                              placeholder="© 2024 PayStep. Todos os direitos reservados."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="pagamento" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="showInstallments"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Exibir Parcelamento
                            </FormLabel>
                            <FormDescription>
                              Permitir que os clientes escolham o número de
                              parcelas
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

                    {form.watch("showInstallments") && (
                      <FormField
                        control={form.control}
                        name="maxInstallments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número Máximo de Parcelas</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                disabled={loading}
                                min={1}
                                max={12}
                              />
                            </FormControl>
                            <FormDescription>
                              Máximo de parcelas permitidas (entre 1 e 12)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="showPixDiscount"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Desconto para PIX
                            </FormLabel>
                            <FormDescription>
                              Oferecer um desconto para pagamentos via PIX
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

                    {form.watch("showPixDiscount") && (
                      <FormField
                        control={form.control}
                        name="pixDiscountPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Percentual de Desconto PIX</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  {...field}
                                  disabled={loading}
                                  min={0}
                                  max={100}
                                  step={0.5}
                                  className="pr-8"
                                />
                                <span className="absolute right-3 top-2">
                                  %
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Percentual de desconto para pagamentos via PIX
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="enableOrderBumps"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Order Bumps
                            </FormLabel>
                            <FormDescription>
                              Permitir a exibição de produtos complementares
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
                  </TabsContent>

                  <TabsContent value="avancado" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customCss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CSS Personalizado</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              disabled={loading}
                              placeholder=".checkout-container { background-color: #f9f9f9; }"
                              rows={10}
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormDescription>
                            CSS personalizado para ajustar a aparência do
                            checkout
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>

            <Button type="submit" disabled={loading} className="ml-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Salvar Configurações
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div className="lg:col-span-4">
        <div className="sticky top-4 space-y-4">
          <div className="text-sm font-medium">Pré-visualização</div>
          <div
            className={cn(
              "rounded-md border overflow-hidden",
              "h-[600px] overflow-y-auto",
              "transform scale-[0.85] origin-top"
            )}
          >
            <CheckoutPreview settings={watchedValues} />
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Esta é uma prévia simplificada. O checkout real pode ter pequenas
            diferenças.
          </div>
        </div>
      </div>
    </div>
  );
}
