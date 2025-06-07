// app/(checkout)/checkout/_components/responsive-checkout-banner.tsx
"use client";

import { useState } from "react";
import Image from "next/image";

interface ResponsiveCheckoutBannerProps {
  desktopImageUrl?: string;
  mobileImageUrl?: string;
  alt?: string;
  maxHeight?: number;
  verticalAlignment?: "top" | "center" | "bottom";
  enabled?: boolean;
}

export function ResponsiveCheckoutBanner({
  desktopImageUrl,
  mobileImageUrl,
  alt = "Banner promocional",
  maxHeight = 350,
  verticalAlignment = "center",
  enabled = true,
}: ResponsiveCheckoutBannerProps) {
  const [desktopLoaded, setDesktopLoaded] = useState(false);
  const [mobileLoaded, setMobileLoaded] = useState(false);

  // Se banner não está habilitado ou não tem nenhuma imagem, não renderiza
  if (!enabled || (!desktopImageUrl && !mobileImageUrl)) {
    return null;
  }

  // Se não tiver imagem móvel, usa a desktop como fallback
  const effectiveMobileImage = mobileImageUrl || desktopImageUrl;

  // Determinar a classe de posicionamento com base no alinhamento vertical
  const objectPositionClass = {
    top: "object-top",
    center: "object-center",
    bottom: "object-bottom",
  }[verticalAlignment];

  return (
    <div
      className="w-full overflow-hidden relative shadow-sm"
      style={{
        height: maxHeight,
        maxHeight: "min(40vh, 600px)",
      }}
    >
      {/* Banner Desktop */}
      {desktopImageUrl && (
        <div
          className={`hidden lg:block w-full h-full transition-opacity duration-300 ${
            desktopLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={desktopImageUrl}
            alt={`${alt} (Desktop)`}
            fill={true}
            priority={true}
            quality={90}
            className={`object-cover ${objectPositionClass}`}
            sizes="(min-width: 1024px) 1920px"
            onLoad={() => setDesktopLoaded(true)}
          />
        </div>
      )}

      {/* Banner Mobile */}
      {effectiveMobileImage && (
        <div
          className={`block lg:hidden w-full h-full transition-opacity duration-300 ${
            mobileLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={effectiveMobileImage}
            alt={`${alt} (Mobile)`}
            fill={true}
            priority={true}
            quality={90}
            className={`object-cover ${objectPositionClass}`}
            sizes="(max-width: 1023px) 800px"
            onLoad={() => setMobileLoaded(true)}
          />
        </div>
      )}

      {/* Gradiente removido - comentado para testar
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
      */}

      {/* Loading placeholder para melhor UX */}
      {!desktopLoaded && !mobileLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}
