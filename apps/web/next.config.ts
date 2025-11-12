// apps/web/next.config.ts
import path from "path";
import type { NextConfig } from "next";

const config = {
  experimental: {
    externalDir: true,
    typedRoutes: true,
  },

  webpack: (cfg) => {
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      "@features": path.join(__dirname, "../../features"),
      "@core": path.join(__dirname, "../../core"),
      "@packages": path.join(__dirname, "../../packages"),
    };
    return cfg;
  },

  // Dev-Origin für HMR/Fast Refresh (Next 15)
  allowedDevOrigins:
    process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [
      "http://localhost:3000",
      "http://192.168.178.22:3000",
    ],

  // 🔒 WICHTIG: Keine Redirects mehr – so bleibt /contributions/analyze erreichbar.
  async redirects() {
    return [
      // Beispiel – AUSGESCHALTET:
      // { source: "/", destination: "/contributions/new", permanent: false },
      // KEIN redirect von /contributions/analyze nach /contributions/new!
    ];
  },
} satisfies NextConfig & { allowedDevOrigins?: string[] };

export default config;
