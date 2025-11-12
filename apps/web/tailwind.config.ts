// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../features/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // exakt: Türkis -> Blau
        brand: { from: "#00E6D1", to: "#2196F3" },
      },
      borderRadius: { "2xl": "1rem" },
      boxShadow: {
        card: "0 8px 28px rgba(33,150,243,.15)",
      },
    },
  },
  plugins: [],
};

export default config;
