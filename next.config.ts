import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove 'standalone' for Vercel deployment (only needed for Docker)
  // output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
