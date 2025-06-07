// app/(checkout)/checkout/_components/sidebar-banner.tsx
"use client";

import { useState } from "react";
import Image from "next/image";

interface SidebarBannerProps {
  imageUrl?: string;
  alt?: string;
  enabled?: boolean;
  className?: string;
}

export function SidebarBanner({
  imageUrl,
  alt = "Banner lateral",
  enabled = true,
  className = "",
}: SidebarBannerProps) {
  const [loaded, setLoaded] = useState(false);

  // Se não está habilitado ou não tem imagem, não renderiza
  if (!enabled || !imageUrl) {
    return null;
  }

  return (
    <div className={`hidden lg:block w-full ${className}`}>
      <div
        className={`relative w-full overflow-hidden rounded-lg shadow-lg transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={{
          maxWidth: "320px", // Limita largura máxima
          maxHeight: "1150px", // Limita altura máxima
        }}
      >
        <Image
          src={imageUrl}
          alt={alt}
          width={280} // Reduzido de 350 para 280
          height={400} // Reduzido de 500 para 400
          className="w-full h-auto object-cover" // Adicionado object-cover
          sizes="280px" // Atualizado o tamanho
          onLoad={() => setLoaded(true)}
          priority={false}
        />

        {/* Loading placeholder */}
        {!loaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
        )}
      </div>
    </div>
  );
}
