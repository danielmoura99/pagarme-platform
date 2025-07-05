/** @type {import('next').NextConfig} */
const nextConfig = {
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
      allowedForwardedHosts: ["*"],
      allowedOrigins: ["*"],
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
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Força HTTPS
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Content Security Policy (ajustada para suas imagens)
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.app *.vercel-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              // 🖼️ IMPORTANTE: Permitir suas fontes de imagem
              "img-src 'self' data: https: api.pagar.me *.public.blob.vercel-storage.com",
              "font-src 'self' data:",
              // 🔗 IMPORTANTE: Permitir conexões com pagar.me
              "connect-src 'self' *.vercel.app wss: https: api.pagar.me *.public.blob.vercel-storage.com",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
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
