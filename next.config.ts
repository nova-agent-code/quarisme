import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.102"],
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  turbopack: {
    root: path.resolve("."),
  },
};

export default nextConfig;
