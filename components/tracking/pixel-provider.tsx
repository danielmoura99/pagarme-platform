// components/tracking/pixel-provider.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PixelManager } from "./pixel-manager";
import { PixelConfig } from "@/lib/tracking/types";

interface PixelProviderProps {
  children: React.ReactNode;
  overrideProductId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventData?: any;
}

export function PixelProvider({
  children,
  overrideProductId,
  eventData,
}: PixelProviderProps) {
  const searchParams = useSearchParams();
  const [pixelConfigs, setPixelConfigs] = useState<PixelConfig[]>([]);

  const productId = overrideProductId || searchParams.get("productId");

  useEffect(() => {
    if (!productId) return;

    const fetchPixelConfigs = async () => {
      try {
        const response = await fetch(`/api/pixels/${productId}`);
        if (response.ok) {
          const configs = await response.json();
          setPixelConfigs(configs);
        }
      } catch (error) {
        console.error("Failed to fetch pixel configs:", error);
      }
    };

    fetchPixelConfigs();
  }, [productId]);

  return (
    <>
      {pixelConfigs.length > 0 && (
        <PixelManager pixels={pixelConfigs} eventData={eventData} />
      )}
      {children}
    </>
  );
}
