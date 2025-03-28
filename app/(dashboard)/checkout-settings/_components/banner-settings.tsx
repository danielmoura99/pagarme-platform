// app/(dashboard)/checkout-settings/_components/banner-settings.tsx
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
import { ImagePlus, X } from "lucide-react";
//import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

// Tipos de alinhamento vertical
const VerticalAlignmentEnum = ["top", "center", "bottom"] as const;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type VerticalAlignment = (typeof VerticalAlignmentEnum)[number];

// Definição do schema para validação do formulário
const bannerFormSchema = z.object({
  imageUrl: z.string().url("URL de imagem inválida").optional(),
  maxHeight: z.number().min(150).max(600),
  enabled: z.boolean().default(true),
  verticalAlignment: z.enum(VerticalAlignmentEnum).default("center"),
});

type BannerFormValues = z.infer<typeof bannerFormSchema>;

// Valores iniciais
const defaultValues: BannerFormValues = {
  imageUrl: "",
  maxHeight: 350,
  enabled: true,
  verticalAlignment: "center",
};

interface BannerSettingsProps {
  initialValues?: Partial<BannerFormValues>;
  onSave?: (values: BannerFormValues) => Promise<void>;
}

export function BannerSettings({ initialValues, onSave }: BannerSettingsProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialValues?.imageUrl || null
  );
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Inicializar o formulário com valores padrão ou iniciais
  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
  });

  // Upload para o Vercel Blob Storage
  const uploadToVercelBlob = async (file: File) => {
    setLoading(true);
    setUploadProgress(0);

    try {
      // Simular progresso durante o upload
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 95));
      }, 100);

      // Preparar o upload
      const formData = new FormData();
      formData.append("file", file);

      // Enviar diretamente para nosso endpoint
      const response = await fetch("/api/upload-url", {
        method: "POST",
        body: formData,
      });

      // Parar a simulação de progresso
      clearInterval(interval);

      if (!response.ok) {
        throw new Error(`Upload falhou com status: ${response.status}`);
      }

      const result = await response.json();
      setUploadProgress(100);

      // Atualizar o formulário com a URL permanente do blob
      form.setValue("imageUrl", result.blobUrl);
      setPreviewUrl(result.blobUrl);

      toast({
        title: "Upload concluído",
        description: "Sua imagem foi enviada com sucesso.",
      });
    } catch (error) {
      console.error("Erro no upload:", error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Lidar com o upload de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar tipo e tamanho
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, WebP).",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
      });
      return;
    }

    // Mostrar preview antes de upload
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Iniciar upload para o Vercel Blob Storage
    uploadToVercelBlob(file);
  };

  // Remover imagem
  const handleRemoveImage = () => {
    if (previewUrl && !previewUrl.startsWith("http")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    form.setValue("imageUrl", "");
  };

  // Enviar formulário
  const onSubmit = async (data: BannerFormValues) => {
    try {
      setLoading(true);

      // Chamar o callback de salvamento
      if (onSave) {
        await onSave(data);
      }

      // Importante: resetar o estado de carregamento
      setLoading(false);

      toast({
        title: "Configurações salvas",
        description:
          "As configurações do banner foram atualizadas com sucesso.",
      });
    } catch (error) {
      // Importante: resetar o estado de carregamento mesmo em caso de erro
      setLoading(false);

      console.error("Erro ao salvar configurações:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Banner</CardTitle>
        <CardDescription>
          Personalize o banner exibido na página de checkout
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Ativar/Desativar Banner */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Exibir Banner</FormLabel>
                    <FormDescription>
                      Ative ou desative a exibição do banner no checkout
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

            {form.watch("enabled") && (
              <>
                {/* Upload de Imagem */}
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-sm font-medium">Imagem do Banner</h3>
                    <p className="text-xs text-muted-foreground">
                      Tamanho recomendado: 1920x600px (máximo 5MB)
                    </p>
                  </div>

                  {/* Preview da imagem */}
                  <div className="relative">
                    {previewUrl ? (
                      <div className="relative w-full h-56 rounded-lg overflow-hidden border">
                        <Image
                          src={previewUrl}
                          alt="Preview do banner"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 600px"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={handleRemoveImage}
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label
                        htmlFor="banner-upload"
                        className="flex flex-col items-center justify-center w-full h-56 rounded-lg border-2 border-dashed 
                        border-muted-foreground/25 bg-muted/10 cursor-pointer hover:bg-muted/20 transition"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-2">
                          <ImagePlus className="h-10 w-10 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Clique para fazer upload de uma imagem
                          </p>
                          <p className="text-xs text-muted-foreground/75">
                            SVG, PNG, JPG ou WebP (max. 5MB)
                          </p>
                        </div>
                        <Input
                          id="banner-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={loading}
                        />
                      </label>
                    )}
                  </div>

                  {/* Barra de progresso de upload */}
                  {loading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Enviando...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1" />
                    </div>
                  )}

                  {/* Campo de URL da imagem */}
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL da imagem</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://exemplo.com/banner.jpg"
                          />
                        </FormControl>
                        <FormDescription>
                          URL da imagem do banner (preenchido automaticamente
                          após o upload)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Altura máxima */}
                  <FormField
                    control={form.control}
                    name="maxHeight"
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
                          Defina a altura máxima do banner (entre 150 e 600
                          pixels)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Alinhamento vertical */}
                  <FormField
                    control={form.control}
                    name="verticalAlignment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alinhamento Vertical</FormLabel>
                        <div className="flex gap-4">
                          <div
                            className={`flex flex-col items-center gap-1 cursor-pointer border rounded-md px-4 py-2 ${
                              field.value === "top"
                                ? "border-primary bg-primary/10"
                                : "border-input"
                            }`}
                            onClick={() => field.onChange("top")}
                          >
                            <div className="h-12 w-16 bg-muted rounded-md flex flex-col">
                              <div className="h-4 bg-foreground/20 rounded-t-md"></div>
                              <div className="flex-1"></div>
                            </div>
                            <span className="text-xs">Topo</span>
                          </div>
                          <div
                            className={`flex flex-col items-center gap-1 cursor-pointer border rounded-md px-4 py-2 ${
                              field.value === "center"
                                ? "border-primary bg-primary/10"
                                : "border-input"
                            }`}
                            onClick={() => field.onChange("center")}
                          >
                            <div className="h-12 w-16 bg-muted rounded-md flex flex-col">
                              <div className="flex-1"></div>
                              <div className="h-4 bg-foreground/20"></div>
                              <div className="flex-1"></div>
                            </div>
                            <span className="text-xs">Centro</span>
                          </div>
                          <div
                            className={`flex flex-col items-center gap-1 cursor-pointer border rounded-md px-4 py-2 ${
                              field.value === "bottom"
                                ? "border-primary bg-primary/10"
                                : "border-input"
                            }`}
                            onClick={() => field.onChange("bottom")}
                          >
                            <div className="h-12 w-16 bg-muted rounded-md flex flex-col">
                              <div className="flex-1"></div>
                              <div className="h-4 bg-foreground/20 rounded-b-md"></div>
                            </div>
                            <span className="text-xs">Base</span>
                          </div>
                        </div>
                        <FormDescription>
                          Como a imagem deve ser posicionada verticalmente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-4 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => form.reset()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  "Salvar configurações"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
