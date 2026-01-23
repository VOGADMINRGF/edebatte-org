import { headers } from "next/headers";

export type GeoInfo = {
  country?: string; // ISO-2 (DE, FR, ...)
  region?: string; // e.g. "BW" or "BE" (provider dependent)
  city?: string;
};

function readHeader(h: unknown, key: string): string | undefined {
  if (!h) return undefined;
  const maybeHeaders = h as { get?: (k: string) => string | null } & Record<string, string>;
  if (typeof maybeHeaders.get === "function") {
    return maybeHeaders.get(key) || undefined;
  }
  return maybeHeaders[key] || maybeHeaders[key.toLowerCase()] || undefined;
}

export async function getGeoFromHeaders(): Promise<GeoInfo> {
  const h = await headers();

  // Vercel / Edge (best-effort)
  const vercelCountry = readHeader(h, "x-vercel-ip-country");
  const vercelRegion = readHeader(h, "x-vercel-ip-country-region");
  const vercelCity = readHeader(h, "x-vercel-ip-city");

  // Cloudflare (best-effort)
  const cfCountry = readHeader(h, "cf-ipcountry");
  const cfRegion = readHeader(h, "cf-region");
  const cfCity = readHeader(h, "cf-ipcity");

  const country = vercelCountry || cfCountry || "DE"; // sane default for localhost
  const region = vercelRegion || cfRegion || undefined;
  const city = vercelCity || cfCity || undefined;

  return { country, region, city };
}
