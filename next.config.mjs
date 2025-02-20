/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.pagar.me",
        pathname: "/core/v5/**",
      },
    ],
  },
};

export default nextConfig;
