import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.102"],
  output: "export",
  turbopack: {
    root: path.resolve("."),
  },
};

export default nextConfig;
