import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Local browser automation uses IPv4 loopback; keep the allowlist narrow.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
