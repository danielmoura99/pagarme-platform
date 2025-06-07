// app/(dashboard)/checkout-settings/_components/banners-settings.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, X, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Schema de validação
const bannersFormSchema = z.object({
  // Banner principal (header)
  headerEnabled: z.boolean().default(false),
  headerBackgroundImage: z.string().optional(),
  headerMobileImage: z.string().optional(),
  headerMaxHeight: z.number().min(150).max(600).default(350),
  headerVerticalAlign: z.enum(["top", "center", "bottom"]).default("center"),

  // Banner lateral (sidebar)
  sidebarBannerEnabled: z.boolean().default(false),
  sidebarBannerImage: z.string().optional(),
});

type BannersFormValues = z.infer<typeof bannersFormSchema>;

interface BannersSettingsProps {
  initialValues: BannersFormValues;
  onSave: (values: BannersFormValues) => Promise<void>;
}

export function BannersSettings({
  initialValues,
  onSave,
}: BannersSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estados para preview das imagens
  const [headerDesktopPreview, setHeaderDesktopPreview] = useState<string>(
    initialValues.headerBackgroundImage || ""
  );
  const [headerMobilePreview, setHeaderMobilePreview] = useState<string>(
    initialValues.headerMobileImage || ""
  );
  const [sidebarPreview, setSidebarPreview] = useState<string>(
    initialValues.sidebarBannerImage || ""
  );

  const form = useForm<BannersFormValues>({
    resolver: zodResolver(bannersFormSchema),
    defaultValues: initialValues,
  });

  // Upload para o Vercel Blob
  const uploadToVercelBlob = async (
    file: File,
    type: "header-desktop" | "header-mobile" | "sidebar"
  ) => {
    setLoading(true);
    setUploadProgress(0);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-url", {
        method: "POST",
        body: formData,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error(`Upload falhou: ${response.status}`);
      }

      const result = await response.json();

      // Atualizar formulário e preview baseado no tipo
      switch (type) {
        case "header-desktop":
          form.setValue("headerBackgroundImage", result.blobUrl);
          setHeaderDesktopPreview(result.blobUrl);
          break;
        case "header-mobile":
          form.setValue("headerMobileImage", result.blobUrl);
          setHeaderMobilePreview(result.blobUrl);
          break;
        case "sidebar":
          form.setValue("sidebarBannerImage", result.blobUrl);
          setSidebarPreview(result.blobUrl);
          break;
      }

      toast({
        title: "Upload concluído",
        description: "Imagem enviada com sucesso!",
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem.",
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Handler para upload de arquivo
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "header-desktop" | "header-mobile" | "sidebar"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo inválido",
        description: "Selecione uma imagem (JPG, PNG, WebP).",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "Tamanho máximo: 5MB.",
      });
      return;
    }

    uploadToVercelBlob(file, type);
  };

  // Remover imagem
  const handleRemoveImage = (
    type: "header-desktop" | "header-mobile" | "sidebar"
  ) => {
    switch (type) {
      case "header-desktop":
        form.setValue("headerBackgroundImage", "");
        setHeaderDesktopPreview("");
        break;
      case "header-mobile":
        form.setValue("headerMobileImage", "");
        setHeaderMobilePreview("");
        break;
      case "sidebar":
        form.setValue("sidebarBannerImage", "");
        setSidebarPreview("");
        break;
    }
  };

  // Componente para upload de imagem
  const ImageUpload = ({
    previewUrl,
    type,
    title,
    description,
    aspectRatio = "aspect-[3/1]",
  }: {
    previewUrl: string;
    type: "header-desktop" | "header-mobile" | "sidebar";
    title: string;
    description: string;
    aspectRatio?: string;
  }) => (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div
        className={`relative w-full ${aspectRatio} rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25`}
      >
        {previewUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={previewUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="400px"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleRemoveImage(type)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/20 transition">
            <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Clique para upload</p>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id={`upload-${type}`}
              onChange={(e) => handleFileChange(e, type)}
              disabled={loading}
            />
            <Button
              type="button"
              variant="ghost"
              className="absolute inset-0"
              onClick={() => document.getElementById(`upload-${type}`)?.click()}
            >
              <span className="sr-only">Upload {title}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Submit do formulário
  const onSubmit = async (data: BannersFormValues) => {
    try {
      setLoading(true);
      await onSave(data);
      toast({
        title: "Configurações salvas",
        description: "Todas as configurações foram atualizadas com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Banners</CardTitle>
        <CardDescription>
          Configure os banners exibidos na página de checkout
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            {/* Barra de progresso durante upload */}
            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Enviando imagem...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Tabs defaultValue="header" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="header">🖼️ Banner Principal</TabsTrigger>
                <TabsTrigger value="sidebar">📱 Banner Lateral</TabsTrigger>
              </TabsList>

              {/* Tab Banner Principal */}
              <TabsContent value="header" className="space-y-6">
                {/* Switch para habilitar banner principal */}
                <FormField
                  control={form.control}
                  name="headerEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Exibir Banner Principal
                        </FormLabel>
                        <FormDescription>
                          Ative para exibir banner no topo da página de checkout
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

                {form.watch("headerEnabled") && (
                  <div className="space-y-6">
                    {/* Upload Desktop */}
                    <ImageUpload
                      previewUrl={headerDesktopPreview}
                      type="header-desktop"
                      title="Imagem Desktop"
                      description="Recomendado: 1920x600px (proporção 16:5)"
                      aspectRatio="aspect-[3/1]"
                    />

                    {/* Campo URL Desktop */}
                    <FormField
                      control={form.control}
                      name="headerBackgroundImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Desktop</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://exemplo.com/banner-desktop.jpg"
                              onChange={(e) => {
                                field.onChange(e);
                                setHeaderDesktopPreview(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Upload Mobile */}
                    <ImageUpload
                      previewUrl={headerMobilePreview}
                      type="header-mobile"
                      title="Imagem Mobile (Opcional)"
                      description="Recomendado: 800x600px (proporção 4:3)"
                      aspectRatio="aspect-[4/3]"
                    />

                    {/* Campo URL Mobile */}
                    <FormField
                      control={form.control}
                      name="headerMobileImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Mobile</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://exemplo.com/banner-mobile.jpg"
                              onChange={(e) => {
                                field.onChange(e);
                                setHeaderMobilePreview(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Se vazio, usará a imagem desktop redimensionada
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Altura máxima */}
                    <FormField
                      control={form.control}
                      name="headerMaxHeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura Máxima: {field.value}px</FormLabel>
                          <FormControl>
                            <Slider
                              min={150}
                              max={600}
                              step={10}
                              value={[field.value]}
                              onValueChange={(values) =>
                                field.onChange(values[0])
                              }
                              disabled={loading}
                            />
                          </FormControl>
                          <FormDescription>
                            Define a altura máxima do banner (150-600px)
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {/* Alinhamento vertical */}
                    <FormField
                      control={form.control}
                      name="headerVerticalAlign"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alinhamento Vertical</FormLabel>
                          <div className="flex gap-4">
                            {[
                              { value: "top" as const, label: "Topo" },
                              { value: "center" as const, label: "Centro" },
                              { value: "bottom" as const, label: "Base" },
                            ].map((option) => (
                              <div
                                key={option.value}
                                className={`flex flex-col items-center gap-1 cursor-pointer border rounded-md px-4 py-2 ${
                                  field.value === option.value
                                    ? "border-primary bg-primary/10"
                                    : "border-input"
                                }`}
                                onClick={() => field.onChange(option.value)}
                              >
                                <div className="h-12 w-16 bg-muted rounded-md flex flex-col">
                                  {option.value === "top" && (
                                    <div className="h-4 bg-foreground/20 rounded-t-md"></div>
                                  )}
                                  {option.value === "center" && (
                                    <>
                                      <div className="flex-1"></div>
                                      <div className="h-4 bg-foreground/20"></div>
                                      <div className="flex-1"></div>
                                    </>
                                  )}
                                  {option.value === "bottom" && (
                                    <>
                                      <div className="flex-1"></div>
                                      <div className="h-4 bg-foreground/20 rounded-b-md"></div>
                                    </>
                                  )}
                                </div>
                                <span className="text-xs">{option.label}</span>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
                            Como a imagem deve ser posicionada verticalmente
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Tab Banner Lateral */}
              <TabsContent value="sidebar" className="space-y-6">
                {/* Switch para habilitar banner lateral */}
                <FormField
                  control={form.control}
                  name="sidebarBannerEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Exibir Banner Lateral
                        </FormLabel>
                        <FormDescription>
                          Banner promocional ao lado do checkout (apenas
                          desktop)
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

                {form.watch("sidebarBannerEnabled") && (
                  <div className="space-y-6">
                    {/* Upload Sidebar */}
                    <ImageUpload
                      previewUrl={sidebarPreview}
                      type="sidebar"
                      title="Imagem do Banner Lateral"
                      description="Recomendado: 420x1440px (proporção 7:24 -vertical)"
                      aspectRatio="aspect-[2/3]"
                    />

                    {/* Campo URL Sidebar */}
                    <FormField
                      control={form.control}
                      name="sidebarBannerImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da Imagem</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://exemplo.com/banner-lateral.jpg"
                              onChange={(e) => {
                                field.onChange(e);
                                setSidebarPreview(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Este banner será exibido apenas no desktop
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Botões de ação */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button
                variant="outline"
                type="button"
                onClick={() => form.reset()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
