/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desabilitar source maps em produção (prevenir exposição de código)
  productionBrowserSourceMaps: false,
  // 🖼️ CONFIGURAÇÕES DE IMAGENS EXISTENTES
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.pagar.me",
        pathname: "/core/v5/**",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
        pathname: "**",
      },
    ],
  },

  // ⚡ CONFIGURAÇÕES DE PERFORMANCE
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedForwardedHosts: [
        "checkout.tradershouse.com.br",
        "pagarme-platform.vercel.app",
        "localhost:3000",
      ],
      allowedOrigins: [
        "https://checkout.tradershouse.com.br",
        "https://pagarme-platform.vercel.app",
        "http://localhost:3000",
      ],
    },
  },

  // 🔒 HEADERS DE SEGURANÇA
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Headers básicos de segurança
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          // X-XSS-Protection removido: header legado, deprecated em browsers modernos
          // CSP já cobre essa proteção adequadamente
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          // Força HTTPS
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Content Security Policy (ajustada para pixels e integrações)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: 'unsafe-inline' necessário para pixels injetados via DOM (Facebook, Google)
              // 'unsafe-eval' necessário em dev (Next.js Fast Refresh), removido em produção
              `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : ""} connect.facebook.net *.googletagmanager.com *.google-analytics.com snap.licdn.com analytics.tiktok.com`,
              // Estilos: 'unsafe-inline' necessário para inline styles dinâmicos (temas, charts, preview)
              "style-src 'self' 'unsafe-inline'",
              // Imagens: pixels + produto + Pagar.me + Vercel Blob
              "img-src 'self' data: blob: *.facebook.com *.google.com *.googletagmanager.com *.google-analytics.com api.pagar.me *.public.blob.vercel-storage.com",
              "font-src 'self' data:",
              // Conexões: APIs de pixels + Pagar.me + Vercel Blob (sem wildcards https:/wss:)
              "connect-src 'self' api.pagar.me *.public.blob.vercel-storage.com *.facebook.com *.google-analytics.com *.analytics.google.com *.googletagmanager.com analytics.tiktok.com",
              // iFrames dos pixels (Facebook, Google)
              "frame-src 'self' *.facebook.com *.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
            ].join("; "),
          },
          // Política de permissões
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
