// core/regions/types.ts
export interface RegionCode {
  countryCode: string;
  subRegionCode?: string | null;
  municipalityCode?: string | null;
  geoId?: string | number | null;
}

export type RegionKey = string;

export function normalizeRegionCode(
  input: RegionCode | string | null | undefined,
): RegionCode | null {
  if (!input) return null;

  if (typeof input === "string") {
    const [country = "", subRegion = "", municipality = ""] = input.split(":");
    const countryCode = country.trim();
    if (!countryCode) return null;
    return {
      countryCode: countryCode.toUpperCase(),
      subRegionCode: subRegion ? subRegion.trim() : undefined,
      municipalityCode: municipality ? municipality.trim() : undefined,
    };
  }

  const country = input.countryCode?.trim();
  if (!country) return null;

  return {
    countryCode: country.toUpperCase(),
    subRegionCode: input.subRegionCode?.trim() || undefined,
    municipalityCode: input.municipalityCode?.trim() || undefined,
    geoId: input.geoId ?? undefined,
  };
}

export function buildRegionKey(code: RegionCode): RegionKey {
  const normalized = normalizeRegionCode(code);
  if (!normalized) return "";
  const parts = [
    normalized.countryCode,
    normalized.subRegionCode ?? "",
    normalized.municipalityCode ?? "",
  ];
  return parts.map((part) => part || "").join(":");
}

export function parseRegionKey(key: RegionKey): RegionCode | null {
  if (!key) return null;
  const [country, subRegion, municipality] = key.split(":");
  if (!country) return null;
  return {
    countryCode: country,
    subRegionCode: subRegion || undefined,
    municipalityCode: municipality || undefined,
  };
}
