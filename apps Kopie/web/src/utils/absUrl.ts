// apps/web/src/utils/absUrl.ts
export function absUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  // Client: window-origin nutzen
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).toString();
  }

  // Server-Fallback (Preview/Prod: VERCEL_URL, lokal: 3000)
  const vercel = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;
  const base =
    process.env.NEXT_PUBLIC_APP_URL || vercel || "http://localhost:3000";
  return new URL(path, base).toString();
}
