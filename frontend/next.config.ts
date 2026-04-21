import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.2"],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../"),
  },
};

export default nextConfig;
