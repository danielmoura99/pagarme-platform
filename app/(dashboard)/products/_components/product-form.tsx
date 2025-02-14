/* eslint-disable @typescript-eslint/no-unused-vars */
// app/(dashboard)/products/_components/product-form.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ImagePlus, Loader2, Save } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createProduct, updateProduct } from "../_actions";
import { MultiSelect } from "@/components/ui/multi-select";
import { OrderBumpSelect } from "./order-bump-select";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z
    .string()
    .min(10, "Descrição deve ter pelo menos 10 caracteres"),
  price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
  active: z.boolean().default(true),
  image: z
    .custom<FileList>()
    .refine(
      (files) => files?.length === 0 || files?.length === 1,
      "Uma imagem é obrigatória"
    )
    .refine(
      (files) => files?.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE,
      "Imagem deve ter no máximo 5MB"
    )
    .refine(
      (files) =>
        files?.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Formato de imagem inválido. Use JPG, PNG ou WebP"
    )
    .optional(),
  variations: z
    .array(
      z.object({
        name: z.string(),
        price: z.coerce.number().min(0),
      })
    )
    .optional(),
  orderBumps: z
    .array(
      z.object({
        productId: z.string(),
        discount: z.number().min(0).max(100).optional(),
      })
    )
    .default([]),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData?: ProductFormValues;
  availableProducts?: Array<{
    id: string;
    name: string;
  }>;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  availableProducts = [],
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const title = initialData ? "Editar produto" : "Novo produto";
  const description = initialData
    ? "Atualize as informações do produto"
    : "Adicione um novo produto ao catálogo";
  const action = initialData ? "Salvar alterações" : "Criar produto";

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      price: 0,
      active: true,
    },
    mode: "onChange",
  });

  const watchImage = form.watch("image");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 100);
    return interval;
  };

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);
      const progressInterval = simulateProgress();

      const priceInCents = Math.round(data.price * 100);

      if (initialData?.id) {
        await updateProduct(initialData.id, {
          ...data,
          price: priceInCents,
        });

        toast({
          title: "Sucesso!",
          description: "Produto atualizado com sucesso.",
        });
      } else {
        await createProduct({
          ...data,
          price: priceInCents,
        });

        toast({
          title: "Sucesso!",
          description: "Produto criado com sucesso.",
        });
      }

      clearInterval(progressInterval);
      setUploadProgress(100);

      router.push("/products");
      router.refresh();
    } catch (error) {
      console.error("[PRODUCT_FORM_ERROR]", error);
      toast({
        variant: "destructive",
        title: "Erro!",
        description: "Não foi possível salvar o produto.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/products")} // Alterado aqui
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
              <Tabs defaultValue="basic" className="w-full">
                <TabsList>
                  <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                  <TabsTrigger value="media">Mídia</TabsTrigger>
                  <TabsTrigger value="pricing">Preços</TabsTrigger>
                  <TabsTrigger value="orderbumps">Order Bumps</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do produto</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Ex: Curso de Marketing Digital"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Nome que será exibido para seus clientes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Descreva seu produto..."
                            {...field}
                            className="resize-none"
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Descrição detalhada do seu produto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Status do produto
                          </FormLabel>
                          <FormDescription>
                            {field.value
                              ? "Produto ativo e visível"
                              : "Produto inativo e oculto"}
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

                <TabsContent value="media" className="mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Imagem do produto</FormLabel>
                        <FormControl>
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div
                              className={cn(
                                "w-full h-64 flex flex-col items-center justify-center rounded-lg border-2 border-dashed",
                                "hover:border-primary/50 transition-colors cursor-pointer",
                                imagePreview
                                  ? "border-primary"
                                  : "border-muted-foreground/25"
                              )}
                              onClick={() =>
                                document.getElementById("image-input")?.click()
                              }
                            >
                              {imagePreview ? (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={imagePreview}
                                    alt="Preview"
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center">
                                  <ImagePlus className="w-10 h-10 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Clique para adicionar uma imagem
                                  </p>
                                </div>
                              )}
                              <input
                                id="image-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  onChange(e.target.files);
                                  handleImageChange(e);
                                }}
                                {...field}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Imagem principal do produto. Tamanho máximo de 5MB.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="pricing" className="mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço base</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5">R$</span>
                            <Input
                              type="number"
                              step="1"
                              disabled={loading}
                              placeholder="0.00"
                              {...field}
                              className="pl-8"
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Preço principal do produto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="orderbumps" className="mt-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="orderBumps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Produtos Complementares (Order Bumps)
                        </FormLabel>
                        <OrderBumpSelect
                          availableProducts={availableProducts.filter(
                            (p) => p.id !== initialData?.id
                          )}
                          value={field.value}
                          onChange={(newValue) => {
                            field.onChange(newValue);
                          }}
                        />
                        <FormDescription>
                          Selecione os produtos que serão oferecidos como
                          complemento e defina seus descontos
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex flex-col gap-4">
                {loading && <Progress value={uploadProgress} className="h-1" />}

                <div className="flex justify-end gap-4">
                  <Button
                    disabled={loading}
                    variant="outline"
                    onClick={() => router.back()}
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
