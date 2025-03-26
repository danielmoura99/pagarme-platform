// app/(dashboard)/checkout-settings/_components/banner-settings-wrapper.tsx
"use client";

import { BannerSettings } from "./banner-settings";

type VerticalAlignment = "top" | "center" | "bottom";

// Definir o tipo para corresponder ao que o BannerSettings espera
type BannerFormValues = {
  maxHeight: number;
  enabled: boolean;
  verticalAlignment: VerticalAlignment;
  imageUrl?: string;
};

interface BannerSettingsWrapperProps {
  initialValues: {
    imageUrl: string;
    maxHeight: number;
    verticalAlignment: VerticalAlignment;
    enabled: boolean;
  };
}

export function BannerSettingsWrapper({
  initialValues,
}: BannerSettingsWrapperProps) {
  // Atualizar a assinatura da função para corresponder ao esperado
  const handleSave = async (values: BannerFormValues): Promise<void> => {
    try {
      console.log("Iniciando salvamento dos dados:", values);

      // Criar uma promessa com timeout
      const timeoutPromise = new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout ao salvar")), 10000); // 10 segundos
      });

      // Correr a promessa de salvamento contra o timeout
      const savePromise = fetch("/api/checkout-settings/banner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: values.imageUrl,
          maxHeight: values.maxHeight,
          verticalAlignment: values.verticalAlignment,
          enabled: values.enabled,
        }),
      });

      // Usar Promise.race para ver qual termina primeiro
      const response = await Promise.race([savePromise, timeoutPromise]);
      console.log("Resposta recebida:", response.status);

      if (!response.ok) {
        throw new Error(`Falha ao salvar configurações: ${response.status}`);
      }

      const data = await response.json();
      console.log("Dados salvos com sucesso:", data);

      // Não retornamos nada (void)
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      throw error; // Propagar o erro para ser tratado pelo componente pai
    }
  };

  return <BannerSettings initialValues={initialValues} onSave={handleSave} />;
}
