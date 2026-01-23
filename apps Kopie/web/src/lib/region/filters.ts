import { normalizeRegionCode } from "@core/regions/types";

const GLOBAL_KEYS = new Set(["all", "global", "world", "international", "intl"]);

export type RegionSelector = {
  regionKey: string | null;
  isGlobal: boolean;
  isValid: boolean;
};

export function parseRegionSelector(input?: string | null): RegionSelector {
  const raw = (input ?? "").trim();
  if (!raw) return { regionKey: null, isGlobal: false, isValid: false };
  if (GLOBAL_KEYS.has(raw.toLowerCase())) {
    return { regionKey: "global", isGlobal: true, isValid: true };
  }
  const normalized = normalizeRegionCode(raw);
  if (!normalized) return { regionKey: null, isGlobal: false, isValid: false };
  return {
    regionKey: buildRegionKey(normalized.countryCode, normalized.subRegionCode, normalized.municipalityCode),
    isGlobal: false,
    isValid: true,
  };
}

export function buildRegionKey(countryCode: string, subRegion?: string | null, municipality?: string | null): string {
  const parts = [countryCode];
  if (subRegion) parts.push(subRegion);
  if (municipality) parts.push(municipality);
  return parts.join(":");
}

export function buildRegionPattern(regionKey: string): RegExp {
  return new RegExp(`^${escapeRegExp(regionKey)}(:|$)`, "i");
}

export function filterFeedRefsByRegion<T extends { regionCode?: string | null }>(
  feedRefs: T[],
  regionCode?: string | null,
): { regionKey: string | null; feedRefs: T[]; isGlobal: boolean; isValid: boolean } {
  const selector = parseRegionSelector(regionCode ?? null);
  if (!selector.isValid) return { regionKey: null, feedRefs: [], isGlobal: false, isValid: false };
  if (selector.isGlobal) {
    return { regionKey: selector.regionKey, feedRefs, isGlobal: true, isValid: true };
  }
  const pattern = buildRegionPattern(selector.regionKey as string);
  const filtered = feedRefs.filter((ref) => !!ref.regionCode && pattern.test(String(ref.regionCode)));
  return { regionKey: selector.regionKey, feedRefs: filtered, isGlobal: false, isValid: true };
}

export function buildRegionMatchClauses(regionKey: string): Record<string, unknown>[] {
  const normalized = normalizeRegionCode(regionKey);
  if (!normalized) return [];
  const clauses: Record<string, unknown>[] = [];
  const objectMatch: Record<string, unknown> = {
    "regionCode.countryCode": normalized.countryCode,
  };
  if (normalized.subRegionCode) {
    objectMatch["regionCode.subRegionCode"] = normalized.subRegionCode;
  }
  if (normalized.municipalityCode) {
    objectMatch["regionCode.municipalityCode"] = normalized.municipalityCode;
  }
  clauses.push(objectMatch);
  clauses.push({ regionCode: buildRegionPattern(regionKey) });
  return clauses;
}

export function buildRegionFallbackChain(input?: string | null): string[] {
  const selector = parseRegionSelector(input ?? null);
  if (!selector.isValid) return [];
  if (selector.isGlobal) return ["global"];
  const normalized = normalizeRegionCode(input ?? "");
  if (!normalized) return [];

  const chain: string[] = [];
  if (normalized.municipalityCode) {
    chain.push(buildRegionKey(normalized.countryCode, normalized.subRegionCode, normalized.municipalityCode));
  }
  if (normalized.subRegionCode) {
    chain.push(buildRegionKey(normalized.countryCode, normalized.subRegionCode, null));
  }
  chain.push(buildRegionKey(normalized.countryCode, null, null));
  chain.push("global");

  return Array.from(new Set(chain));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
