// app/(dashboard)/recipients/_components/recipient-form.tsx
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
  FormField,
  FormItem,
  FormMessage,
  FormDescription,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const formSchema = z
  .object({
    // Informações básicas da empresa
    company_name: z.string().optional(),
    trading_name: z.string().optional(),
    email: z.string().email("Email inválido").optional(),
    document: z.string().optional(),
    type: z.enum(["corporation", "individual"]).optional(),
    annual_revenue: z.coerce.number().optional(),

    // Endereço principal
    street: z.string().optional(),
    complementary: z.string().optional(),
    street_number: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip_code: z.string().optional(),
    reference_point: z.string().optional(),

    // Telefone
    phone_ddd: z.string().optional(),
    phone_number: z.string().optional(),
    phone_type: z.literal("mobile").optional(),

    // Sócio
    partner_name: z.string().optional(),
    partner_email: z.string().optional(),
    partner_document: z.string().optional(),
    partner_type: z.literal("individual").optional(),
    partner_birthdate: z.string().optional(),
    partner_monthly_income: z.coerce.number().optional(),
    partner_occupation: z.string().optional(),
    partner_self_declared: z.boolean().optional(),

    // Endereço do Sócio
    partner_street: z.string().optional(),
    partner_complementary: z.string().optional(),
    partner_street_number: z.string().optional(),
    partner_neighborhood: z.string().optional(),
    partner_city: z.string().optional(),
    partner_state: z.string().optional(),
    partner_zip_code: z.string().optional(),
    partner_reference_point: z.string().optional(),
    partner_phone_ddd: z.string().optional(),
    partner_phone_number: z.string().optional(),
    partner_phone_type: z.literal("mobile").optional(),

    // Transferência
    transfer_enabled: z.boolean().optional(),
    transfer_interval: z.enum(["daily", "weekly", "monthly"]).optional(),
    transfer_day: z.coerce.number().optional(),

    // Dados Bancários
    bank_holder_name: z.string().optional(),
    bank_holder_type: z.literal("individual").optional(),
    bank_holder_document: z.string().optional(),
    bank_code: z.string().optional(),
    bank_branch: z.string().optional(),
    bank_branch_digit: z.string().optional(),
    bank_account: z.string().optional(),
    bank_account_digit: z.string().optional(),
    bank_account_type: z.enum(["checking", "savings"]).optional(),

    // Antecipação
    anticipation_enabled: z.boolean().optional(),
    anticipation_type: z.literal("full").optional(),
    anticipation_volume_percentage: z.coerce.number().optional(),
    anticipation_delay: z.coerce.number().nullable().optional(),

    // Interno
    commission: z.coerce.number().optional(),
  })
  .partial();

type RecipientFormValues = z.infer<typeof formSchema>;

interface RecipientFormData extends z.infer<typeof formSchema> {
  id?: string;
  // Informações básicas da empresa
  company_name?: string;
  trading_name?: string;
  email?: string;
  document?: string;
  type?: "corporation" | "individual"; // Atualizado para aceitar ambos os tipos
  annual_revenue?: number;
}

interface RecipientFormProps {
  initialData?: RecipientFormData;
  mode?: "create" | "edit";
}

export function RecipientForm({
  initialData,
  mode = "create",
}: RecipientFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const title = mode === "edit" ? "Editar Recebedor" : "Novo Recebedor";
  const description =
    mode === "edit"
      ? "Atualize as informações do recebedor"
      : "Adicione um novo recebedor ao sistema";
  const actionText = mode === "edit" ? "Salvar Alterações" : "Criar Recebedor";

  const form = useForm<RecipientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      company_name: "",
      trading_name: "",
      email: "",
      document: "",
      type: "corporation",
      annual_revenue: 0,

      // Endereço principal
      street: "",
      complementary: "",
      street_number: "",
      neighborhood: "",
      city: "",
      state: "",
      zip_code: "",
      reference_point: "",

      // Telefone
      phone_ddd: "",
      phone_number: "",
      phone_type: "mobile",

      // Sócio
      partner_name: "",
      partner_email: "",
      partner_document: "",
      partner_type: "individual",
      partner_birthdate: "",
      partner_monthly_income: 0,
      partner_occupation: "",
      partner_self_declared: true,

      // Endereço do Sócio
      partner_street: "",
      partner_complementary: "",
      partner_street_number: "",
      partner_neighborhood: "",
      partner_city: "",
      partner_state: "",
      partner_zip_code: "",
      partner_reference_point: "",

      // Telefone do Sócio
      partner_phone_ddd: "",
      partner_phone_number: "",
      partner_phone_type: "mobile",

      commission: 10,

      // Transferência
      transfer_enabled: false,
      transfer_interval: "monthly",
      transfer_day: 1,

      // Dados Bancários
      bank_holder_name: "",
      bank_holder_type: "individual",
      bank_holder_document: "",
      bank_code: "",
      bank_branch: "",
      bank_branch_digit: "",
      bank_account: "",
      bank_account_digit: "",
      bank_account_type: "checking",

      // Antecipação
      anticipation_enabled: true,
      anticipation_type: "full",
      anticipation_volume_percentage: 50,
      anticipation_delay: null,
    },
  });

  const onSubmit = async (data: RecipientFormValues) => {
    try {
      setLoading(true);

      console.log("Dados do Formulário:", data);

      // Log do estado do formulário incluindo erros
      console.log("Estado do Formulário:", {
        isDirty: form.formState.isDirty,
        errors: form.formState.errors,
        isValid: form.formState.isValid,
        isSubmitting: form.formState.isSubmitting,
      });

      // Log dos erros de validação
      //const formState = form.getValues();
      const errors = form.formState.errors;

      if (Object.keys(errors).length > 0) {
        console.log("Erros de validação:", errors);

        // Criando uma mensagem amigável com os campos faltantes
        const missingFields = Object.keys(errors)
          .map((key) => {
            // Mapeamento mais amigável dos nomes dos campos
            const fieldNames: { [key: string]: string } = {
              partner_type: "Tipo de Sócio",
              phone_type: "Tipo de Telefone",
              partner_phone_type: "Tipo de Telefone do Sócio",
              partner_self_declared: "Declaração de Representante Legal",
              // Adicione outros campos conforme necessário
            };

            return fieldNames[key] || key;
          })
          .join(", ");

        toast({
          variant: "destructive",
          title: "Campos obrigatórios faltando",
          description: `Por favor, preencha os seguintes campos: ${missingFields}`,
        });

        return;
      }

      // Formatando os dados para o formato esperado pela Pagar.me
      const payload = {
        code: initialData?.id || "1234", // Usa ID existente ou gera novo
        register_information: {
          company_name: data.company_name,
          trading_name: data.trading_name,
          email: data.email,
          document: data.document,
          type: data.type,
          annual_revenue: data.annual_revenue,
          main_address: {
            street: data.street,
            complementary: data.complementary,
            street_number: data.street_number,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zip_code: data.zip_code,
            reference_point: data.reference_point,
          },
          phone_numbers: [
            {
              ddd: data.phone_ddd,
              number: data.phone_number,
              type: data.phone_type,
            },
          ],
          managing_partners: [
            {
              name: data.partner_name,
              email: data.partner_email,
              document: data.partner_document,
              type: data.partner_type,
              birthdate: data.partner_birthdate,
              monthly_income: data.partner_monthly_income,
              professional_occupation: data.partner_occupation,
              self_declared_legal_representative: data.partner_self_declared,
              address: {
                street: data.partner_street,
                complementary: data.partner_complementary,
                street_number: data.partner_street_number,
                neighborhood: data.partner_neighborhood,
                city: data.partner_city,
                state: data.partner_state,
                zip_code: data.partner_zip_code,
                reference_point: data.partner_reference_point,
              },
              phone_numbers: [
                {
                  ddd: data.partner_phone_ddd,
                  number: data.partner_phone_number,
                  type: data.partner_phone_type,
                },
              ],
            },
          ],
        },
        transfer_settings: {
          transfer_enabled: data.transfer_enabled,
          transfer_interval: data.transfer_interval,
          transfer_day: data.transfer_day,
        },
        default_bank_account: {
          holder_name: data.bank_holder_name,
          holder_type: "individual",
          holder_document: data.bank_holder_document,
          bank: data.bank_code,
          branch_number: data.bank_branch,
          branch_check_digit: data.bank_branch_digit,
          account_number: data.bank_account,
          account_check_digit: data.bank_account_digit,
          type: data.bank_account_type,
        },
        metadata: {
          commission: data.commission,
        },
      };

      // Determina se é criação ou atualização
      const isUpdate = !!initialData?.id;
      const url = isUpdate
        ? `/api/recipients/${initialData.id}`
        : "/api/recipients";

      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Erro ao ${isUpdate ? "atualizar" : "criar"} recebedor`
        );
      }

      router.push("/recipients");
      router.refresh();

      toast({
        title: "Sucesso!",
        description: `Recebedor ${
          isUpdate ? "atualizado" : "criado"
        } com sucesso.`,
      });
    } catch (error) {
      console.error("Erro:", error);
      toast({
        variant: "destructive",
        title: "Erro!",
        description: `Não foi possível ${
          initialData?.id ? "atualizar" : "criar"
        } o recebedor.`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-8">
          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trading_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Fantasia</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="annual_revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faturamento Anual</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Campos com valores fixos (hidden) */}

          <div className="hidden">
            <FormField
              control={form.control}
              name="bank_holder_type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} type="hidden" value="individual" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="partner_type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} type="hidden" value="individual" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone_type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} type="hidden" value="mobile" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="anticipation_type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} type="hidden" value="full" />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Endereço da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="street_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="complementary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="phone_ddd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DDD</FormLabel>
                      <FormControl>
                        <Input maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reference_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ponto de Referência</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sócio Administrador */}
          <Card>
            <CardHeader>
              <CardTitle>Sócio Administrador</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="partner_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pessoa</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">
                            Pessoa Física
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner_self_declared"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Representante Legal</FormLabel>
                        <FormDescription>
                          Declaro ser o representante legal
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Telefone</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mobile">Celular</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner_phone_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Telefone do Sócio</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mobile">Celular</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partner_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Sócio</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email do Sócio</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="partner_document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF do Sócio</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_birthdate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_monthly_income"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renda Mensal</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="partner_occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ocupação</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Endereço do Sócio */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço do Sócio</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="partner_street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="partner_street_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="partner_complementary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="partner_neighborhood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="partner_phone_ddd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DDD</FormLabel>
                      <FormControl>
                        <Input maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partner_reference_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ponto de Referência</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Campo type oculto com valor fixo */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormControl>
                  <Input type="hidden" {...field} value="corporation" />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Configurações de Transferência */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Transferência</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="transfer_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Transferência Automática</FormLabel>
                      <FormDescription>
                        Habilitar transferência automática de valores
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="transfer_interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervalo de Transferência</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o intervalo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Diário</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transfer_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia da Transferência</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="31" {...field} />
                      </FormControl>
                      <FormDescription>
                        0 = imediato, 1-7 = dia da semana, 1-31 = dia do mês
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dados Bancários */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancários</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Titular</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_holder_document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ do Titular</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bank_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="bank_branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agência</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_branch_digit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dígito</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="bank_account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_account_digit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dígito</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="bank_account_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conta</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de conta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="checking">Conta Corrente</SelectItem>
                        <SelectItem value="savings">Conta Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Configurações de Antecipação */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Antecipação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="anticipation_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Antecipação Automática</FormLabel>
                      <FormDescription>
                        Habilitar antecipação automática de recebíveis
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
                name="anticipation_delay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delay de Antecipação</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Deixe em branco para sem delay
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anticipation_volume_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual do Volume (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Comissão */}
          <Card>
            <CardHeader>
              <CardTitle>Comissão</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Comissão (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Porcentagem de comissão que o afiliado receberá por venda
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {actionText}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
