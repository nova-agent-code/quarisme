import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/quarisme',
  assetPrefix: '/quarisme',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
