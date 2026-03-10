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
              // Pixels de rastreamento: Facebook, Google Ads, TikTok, Snapchat
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel.app *.vercel-analytics.com connect.facebook.net *.googletagmanager.com *.google-analytics.com *.googlesyndication.com snap.licdn.com analytics.tiktok.com",
              "style-src 'self' 'unsafe-inline'",
              // Imagens dos pixels e do produto
              "img-src 'self' data: https: blob: *.facebook.com *.google.com *.googletagmanager.com *.google-analytics.com api.pagar.me *.public.blob.vercel-storage.com",
              "font-src 'self' data:",
              // Conexões com APIs de pixels + Pagar.me
              "connect-src 'self' *.vercel.app wss: https: api.pagar.me *.public.blob.vercel-storage.com *.facebook.com *.google-analytics.com *.analytics.google.com *.googletagmanager.com analytics.tiktok.com",
              // iFrames dos pixels (Facebook, etc.)
              "frame-src 'self' *.facebook.com *.google.com",
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
