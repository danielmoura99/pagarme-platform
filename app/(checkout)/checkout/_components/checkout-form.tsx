/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(checkout)/checkout/_components/checkout-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMask } from "@react-input/mask";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, QrCode } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interfaces do Payload
interface CheckoutPayloadBase {
  product: {
    id: string;
    price: number;
  };
  customer: {
    name: string;
    email: string;
    document: string;
    phone: string;
  };
  paymentMethod: "credit_card" | "pix";
}

interface CreditCardPayload extends CheckoutPayloadBase {
  paymentMethod: "credit_card";
  card_token: string;
}

interface PixPayload extends CheckoutPayloadBase {
  paymentMethod: "pix";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type CheckoutPayload = CreditCardPayload | PixPayload;

// Definir dois sub-schemas separados
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const personalInfoSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(11, "Telefone é obrigatório"),
  document: z.string().min(11, "CPF é obrigatório"),
  paymentMethod: z.enum(["credit_card", "pix"]),
});

const checkoutFormSchema = z.discriminatedUnion("paymentMethod", [
  // Schema para cartão de crédito
  z.object({
    paymentMethod: z.literal("credit_card"),
    name: z.string().min(3, "Nome completo é obrigatório"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(11, "Telefone é obrigatório"),
    document: z.string().min(11, "CPF é obrigatório"),
    cardNumber: z.string().min(16, "Número do cartão inválido"),
    cardExpiry: z.string().min(5, "Validade inválida"),
    cardCvv: z.string().min(3, "CVV inválido"),
    cardHolder: z.string().min(3, "Nome do titular é obrigatório"),
  }),
  // Schema para PIX
  z.object({
    paymentMethod: z.literal("pix"),
    name: z.string().min(3, "Nome completo é obrigatório"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(11, "Telefone é obrigatório"),
    document: z.string().min(11, "CPF é obrigatório"),
    cardNumber: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvv: z.string().optional(),
    cardHolder: z.string().optional(),
  }),
]);

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

interface CheckoutFormProps {
  product: {
    id: string;
    name: string;
    description: string | null | undefined;
    prices: Array<{
      amount: number;
      [key: string]: any;
    }>;
  };
  selectedInstallments?: number;
  totalAmount?: number;
  onPaymentMethodChange?: (method: "credit_card" | "pix") => void;
  selectedBumps?: string[];
}

export function CheckoutForm({
  product,
  selectedInstallments, // valor padrão de 1
  totalAmount,
  onPaymentMethodChange,
  selectedBumps = [],
}: CheckoutFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">(
    "credit_card"
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document: "",
      paymentMethod: "credit_card",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      cardHolder: "",
    },
    mode: "onChange",
  });

  // Aqui vai o novo handler
  const handlePaymentMethodChange = (value: string) => {
    const method = value as "credit_card" | "pix";
    setPaymentMethod(method);
    form.setValue("paymentMethod", method);
    onPaymentMethodChange?.(method);

    // Se mudar para PIX, limpa os campos do cartão
    if (method === "pix") {
      form.setValue("cardNumber", "");
      form.setValue("cardExpiry", "");
      form.setValue("cardCvv", "");
      form.setValue("cardHolder", "");
    }

    // Revalida o formulário
    form.trigger();
  };

  // Adicione isso no início do componente
  useEffect(() => {
    const subscription = form.watch((value) => {
      console.log("Valores do formulário alterados:", value);
      console.log("Estado do formulário:", form.formState);
      console.log("Erros de validação:", form.formState.errors);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Input Masks
  const phoneRef = useMask({
    mask: "(__) _____-____",
    replacement: { _: /\d/ },
  });
  const documentRef = useMask({
    mask: "___.___.___-__",
    replacement: { _: /\d/ },
  });
  const cardNumberRef = useMask({
    mask: "____ ____ ____ ____",
    replacement: { _: /\d/ },
  });
  const cardExpiryRef = useMask({ mask: "__/__", replacement: { _: /\d/ } });

  const onSubmit = async (data: CheckoutFormValues) => {
    try {
      console.log("Iniciando submissão do formulário...");
      setLoading(true);

      // Validar se o produto tem preço
      if (!product.prices || product.prices.length === 0) {
        throw new Error("Produto sem preço definido");
      }

      // Base do payload
      const payload = {
        product: {
          id: product.id,
          price: product.prices[0].amount,
        },
        customer: {
          name: data.name,
          email: data.email,
          document: data.document.replace(/\D/g, ""),
          phone: data.phone,
        },
        paymentMethod,
        selectedBumps,
        installments: selectedInstallments,
        totalAmount: totalAmount || product.prices[0].amount,
        // Se for cartão, incluir os dados
        ...(paymentMethod === "credit_card" && {
          cardData: {
            cardNumber: data.cardNumber,
            cardHolder: data.cardHolder,
            cardExpiry: data.cardExpiry,
            cardCvv: data.cardCvv,
          },
        }),
      };

      console.log("[Checkout] Enviando pagamento:", {
        method: payload.paymentMethod,
        amount: payload.product.price,
      });

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao processar pagamento");
      }

      const result = await response.json();

      if (paymentMethod === "pix") {
        // Redireciona para página de PIX com todos os dados necessários
        window.location.href = `/processing?${new URLSearchParams({
          orderId: result.orderId,
          qrCode: result.qrCode,
          qrCodeUrl: result.qrCodeUrl,
          expiresAt: result.expiresAt,
          status: result.status,
        }).toString()}`;
      } else {
        // Pagamento com cartão - fluxo existente
        window.location.href =
          result.status === "paid"
            ? `/success?orderId=${result.orderId}`
            : `/error?orderId=${result.orderId}`;
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      toast({
        variant: "destructive",
        title: "Erro no Pagamento",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao processar pagamento",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 shadow-lg bg-white">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Pessoais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                1
              </span>
              <h2 className="text-lg font-semibold">Informações Pessoais</h2>
            </div>

            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Nome Completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite seu nome"
                          {...field}
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          {...field}
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Telefone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          ref={phoneRef}
                          placeholder="(00) 00000-0000"
                          className="h-9"
                        />
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
                      <FormLabel className="text-sm">CPF</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          ref={documentRef}
                          placeholder="000.000.000-00"
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Método de Pagamento */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                2
              </span>
              <h2 className="text-lg font-semibold">Pagamento</h2>
            </div>

            <Tabs
              value={paymentMethod}
              onValueChange={handlePaymentMethodChange} // Aqui!
            >
              <TabsList className="grid grid-cols-2 h-10">
                <TabsTrigger value="credit_card">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Cartão
                </TabsTrigger>
                <TabsTrigger value="pix">
                  <QrCode className="mr-2 h-4 w-4" />
                  PIX
                </TabsTrigger>
              </TabsList>

              <TabsContent value="credit_card" className="space-y-3 mt-3">
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">
                        Número do Cartão
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          ref={cardNumberRef}
                          placeholder="0000 0000 0000 0000"
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="cardExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Validade</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            ref={cardExpiryRef}
                            placeholder="MM/AA"
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cardCvv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">CVV</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="000"
                            maxLength={4}
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cardHolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Nome no Cartão</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nome impresso no cartão"
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="pix" className="mt-3">
                <div className="bg-primary/5 p-3 rounded">
                  <p className="text-sm text-muted-foreground">
                    Você receberá um QR Code para pagamento após confirmar.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Botão e Informações */}
          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={loading || !form.formState.isValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Finalizar Compra"
              )}
            </Button>

            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Ao confirmar sua compra, você concorda com os{" "}
                <a href="/termos" className="text-primary hover:underline">
                  Termos de Uso
                </a>{" "}
                e Regulamento da Traders House.
              </p>

              <p className="text-xs text-muted-foreground/60">
                Powered by PayStep, 2024.
              </p>
            </div>
          </div>
        </form>
      </Form>
    </Card>
  );
}
