// app/(dashboard)/checkout-settings/_components/banners-settings-wrapper.tsx
"use client";

import { useEffect, useState } from "react";
import { BannersSettings } from "./banners-settings";
import { Skeleton } from "@/components/ui/skeleton";

interface BannerSettingsData {
  // Banner principal (header)
  headerEnabled: boolean;
  headerBackgroundImage?: string;
  headerMobileImage?: string;
  headerMaxHeight: number;
  headerVerticalAlign: "top" | "center" | "bottom";

  // Banner lateral (sidebar)
  sidebarBannerEnabled: boolean;
  sidebarBannerImage?: string;
}

export function BannersSettingsWrapper() {
  const [settings, setSettings] = useState<BannerSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/checkout-settings/banners");
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        } else {
          // Se não existir configuração, usar valores padrão
          setSettings({
            headerEnabled: false,
            headerBackgroundImage: "",
            headerMobileImage: "",
            headerMaxHeight: 350,
            headerVerticalAlign: "center",
            sidebarBannerEnabled: false,
            sidebarBannerImage: "",
          });
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        // Usar valores padrão em caso de erro
        setSettings({
          headerEnabled: false,
          headerBackgroundImage: "",
          headerMobileImage: "",
          headerMaxHeight: 350,
          headerVerticalAlign: "center",
          sidebarBannerEnabled: false,
          sidebarBannerImage: "",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (values: BannerSettingsData): Promise<void> => {
    try {
      console.log("🔄 Iniciando salvamento das configurações:", values);

      const payload = {
        // Garantir que sempre enviamos strings (mesmo que vazias)
        headerEnabled: values.headerEnabled,
        headerBackgroundImage: values.headerBackgroundImage || "",
        headerMobileImage: values.headerMobileImage || "",
        headerMaxHeight: values.headerMaxHeight,
        headerVerticalAlign: values.headerVerticalAlign,
        sidebarBannerEnabled: values.sidebarBannerEnabled,
        sidebarBannerImage: values.sidebarBannerImage || "",
      };

      console.log("📤 Payload sendo enviado:", payload);

      const response = await fetch("/api/checkout-settings/banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 Status da resposta:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro na resposta:", errorText);
        throw new Error(`Falha ao salvar: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ Configurações salvas com sucesso:", data);

      // Atualizar o estado local com os dados salvos
      setSettings(data.settings);
    } catch (error) {
      console.error("💥 Erro ao salvar configurações:", error);
      throw error;
    }
  };

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Erro ao carregar configurações</p>
      </div>
    );
  }

  return <BannersSettings initialValues={settings} onSave={handleSave} />;
}
