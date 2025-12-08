import type { RegionInfo } from "./types";

function slugify(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || undefined;
}

/**
 * Best-effort RegionInfo aus bekannten Feldern.
 * TODO: AGS / Wahlkreise über Shapefiles (BKG/Bundeswahlleiter) nachrüsten.
 */
export async function resolveRegionInfo(args: {
  lat: number;
  lon: number;
  countryCode?: string;
  postalCode?: string;
  city?: string;
}): Promise<RegionInfo | null> {
  if (!Number.isFinite(args.lat) || !Number.isFinite(args.lon)) {
    return null;
  }
  const country = (args.countryCode || "").toUpperCase() || "DE";
  const municipalityKey =
    args.postalCode && args.city
      ? [country.toLowerCase(), args.postalCode, slugify(args.city)]
          .filter(Boolean)
          .join(":")
      : undefined;

  return {
    countryCode: country,
    postalCode: args.postalCode,
    city: args.city,
    municipalityName: args.city,
    municipalityKey,
    lat: args.lat,
    lon: args.lon,
  };
}
