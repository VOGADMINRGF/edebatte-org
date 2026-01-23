import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@lib": path.resolve(__dirname, "src/lib"),
      "@config": path.resolve(__dirname, "src/config"),
      "@features": path.resolve(__dirname, "..", "..", "features"),
      "@core": path.resolve(__dirname, "..", "..", "core"),
    },
  },
});
