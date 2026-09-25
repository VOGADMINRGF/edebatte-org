import { z } from "zod";

export const MarketingPublicBrandSchema = z.enum([
  "edebatte",
  "voiceopengov",
  "vote4gov",
]);

export type MarketingPublicBrand = z.infer<typeof MarketingPublicBrandSchema>;

export const MarketingBrandProfileRefSchema = z
  .object({
    brand: MarketingPublicBrandSchema,
    brandProfileId: z.string().min(1),
  })
  .strict();

export type MarketingBrandProfileRef = z.infer<typeof MarketingBrandProfileRefSchema>;

export const CANONICAL_MARKETING_BRAND_PROFILES: Record<
  MarketingPublicBrand,
  MarketingBrandProfileRef
> = {
  edebatte: {
    brand: "edebatte",
    brandProfileId: "brand-edebatte-light",
  },
  voiceopengov: {
    brand: "voiceopengov",
    brandProfileId: "brand-voiceopengov",
  },
  vote4gov: {
    brand: "vote4gov",
    brandProfileId: "brand-vote4gov",
  },
};

export function resolveCanonicalMarketingBrandProfile(
  brand: MarketingPublicBrand,
): MarketingBrandProfileRef {
  return MarketingBrandProfileRefSchema.parse(CANONICAL_MARKETING_BRAND_PROFILES[brand]);
}

export function resolveMarketingPublicBrandFromProfileId(
  brandProfileId: string,
): MarketingPublicBrand | null {
  for (const value of Object.values(CANONICAL_MARKETING_BRAND_PROFILES)) {
    if (value.brandProfileId === brandProfileId) return value.brand;
  }
  if (brandProfileId === "brand-edebatte-dark") return "edebatte";
  return null;
}

export function assertMarketingBrandProfileMatch(input: {
  brand: MarketingPublicBrand;
  brandProfileId: string;
}) {
  const expected = resolveCanonicalMarketingBrandProfile(input.brand);
  if (expected.brandProfileId !== input.brandProfileId) {
    throw new Error(
      `marketing_brand_profile_mismatch:${input.brand}:${input.brandProfileId}:${expected.brandProfileId}`,
    );
  }
  return expected;
}

export function inferMarketingBrandFromCampaignKey(key: string): MarketingPublicBrand {
  const normalized = key.trim().toLowerCase();
  if (normalized.startsWith("vote4gov-") || normalized.startsWith("v4g-")) {
    return "vote4gov";
  }
  if (normalized.startsWith("voiceopengov-") || normalized.startsWith("vog-")) {
    return "voiceopengov";
  }
  return "edebatte";
}
