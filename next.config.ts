import type { NextConfig } from "next";
import { buildLandingCsp } from "./lib/security/csp";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Images are pre-generated at upload time (sharp); no on-the-fly optimizer.
  images: { unoptimized: true },
  // Landing is static/ISR, so no nonce: static CSP below. /admin gets a per-request nonce CSP from proxy.ts.
  // (experimental.sri was tried: it adds no integrity attributes under Turbopack, so it is not enabled.)
  async headers() {
    return [
      {
        source: "/((?!admin).*)",
        headers: [{ key: "Content-Security-Policy", value: buildLandingCsp(process.env.NODE_ENV === "development") }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
