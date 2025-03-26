// app/(checkout)/_components/checkout-banner.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface CheckoutBannerProps {
  imageUrl: string;
  alt?: string;
  maxHeight?: number;
  verticalAlignment?: "top" | "center" | "bottom";
  enabled?: boolean;
}

export function CheckoutBanner({
  imageUrl,
  alt = "Banner promocional",
  maxHeight = 350, // Altura máxima do banner em px (ajustável)
  verticalAlignment = "center",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enabled = true,
}: CheckoutBannerProps) {
  const [loaded, setLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [containerWidth, setContainerWidth] = useState(0);

  // Recalcula a largura do container quando a página carrega ou redimensiona
  useEffect(() => {
    const updateWidth = () => {
      // Usamos o mesmo contêiner que o checkout (max-w-4xl)
      const maxWidth = Math.min(window.innerWidth - 32, 896); // 896px é equivalente a max-w-4xl
      setContainerWidth(maxWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Determinar a classe de posicionamento com base no alinhamento vertical
  const objectPositionClass = {
    top: "object-top",
    center: "object-center",
    bottom: "object-bottom",
  }[verticalAlignment];

  return (
    <div
      className={`w-full overflow-hidden relative rounded-t-xl shadow-sm transition-opacity duration-300 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
      style={{
        height: maxHeight,
        maxHeight: "min(40vh, 600px)",
      }}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={alt}
          fill={true}
          priority={true}
          quality={90}
          className={`object-cover ${objectPositionClass}`}
          sizes={`(max-width: 768px) 100vw, 896px`}
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Gradiente para suavizar a transição com o checkout */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
    </div>
  );
}
