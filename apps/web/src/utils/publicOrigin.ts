// apps/web/src/utils/publicOrigin.ts
import { BRAND } from "@/lib/brand";

export function publicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.PUBLIC_BASE_URL ||
    BRAND.baseUrl ||
    "http://localhost:3000"
  );
}
export function publicHost(): string {
  try {
    return new URL(publicOrigin()).host;
  } catch {
    return "app.local";
  }
}
