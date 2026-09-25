import { z } from "zod";

export const CANONICAL_ORGANIZATION_TYPES = [
  "political_party",
  "parliamentary_group",
  "parliamentary_caucus",
  "civic_initiative",
  "association",
  "ngo",
  "trade_union",
  "professional_association",
  "foundation",
  "public_administration",
  "ministry",
  "agency",
  "municipality",
  "public_body",
  "research_institution",
  "company",
  "media_publisher",
  "media_outlet",
  "public_broadcaster",
  "other",
] as const;

export type CanonicalOrganizationType =
  (typeof CANONICAL_ORGANIZATION_TYPES)[number];

/**
 * Persisted vocabulary that predates the canonical organization registry.
 * These values remain readable/writable for compatibility, but are never
 * silently treated as a more specific canonical identity when that would be
 * ambiguous (for example `media` or generic `organization`).
 */
export const LEGACY_ORGANIZATION_TYPES = [
  "party",
  "media",
  "initiative",
  "government",
  "organization",
  "district",
  "district_office",
  "city_administration",
  "county_administration",
  "school",
  "custom",
] as const;

export type LegacyOrganizationType =
  (typeof LEGACY_ORGANIZATION_TYPES)[number];

export const ORGANIZATION_STORAGE_TYPES = [
  ...CANONICAL_ORGANIZATION_TYPES,
  ...LEGACY_ORGANIZATION_TYPES,
] as const;

export type OrganizationStorageType =
  (typeof ORGANIZATION_STORAGE_TYPES)[number];

const CANONICAL_TYPE_SET = new Set<string>(CANONICAL_ORGANIZATION_TYPES);
const LEGACY_TYPE_MAP: Partial<
  Record<LegacyOrganizationType, CanonicalOrganizationType>
> = {
  party: "political_party",
  initiative: "civic_initiative",
  government: "public_administration",
  district_office: "public_administration",
  city_administration: "public_administration",
  county_administration: "public_administration",
  custom: "other",
};

export type OrganizationTypeResolution =
  | {
      status: "canonical";
      inputType: string;
      canonicalType: CanonicalOrganizationType;
      reviewRequired: false;
    }
  | {
      status: "mapped_legacy";
      inputType: string;
      canonicalType: CanonicalOrganizationType;
      reviewRequired: false;
    }
  | {
      status: "review_required";
      inputType: string;
      canonicalType: null;
      reviewRequired: true;
    };

export function resolveOrganizationType(
  input: string,
): OrganizationTypeResolution {
  const value = String(input ?? "").trim();
  if (CANONICAL_TYPE_SET.has(value)) {
    return {
      status: "canonical",
      inputType: value,
      canonicalType: value as CanonicalOrganizationType,
      reviewRequired: false,
    };
  }

  const mapped = LEGACY_TYPE_MAP[value as LegacyOrganizationType];
  if (mapped) {
    return {
      status: "mapped_legacy",
      inputType: value,
      canonicalType: mapped,
      reviewRequired: false,
    };
  }

  return {
    status: "review_required",
    inputType: value,
    canonicalType: null,
    reviewRequired: true,
  };
}

export const ORGANIZATION_RELATION_TYPES = [
  "parent_of",
  "child_of",
  "affiliated_with",
  "parliamentary_group_of",
  "regional_branch_of",
  "published_by",
  "operated_by",
  "successor_of",
  "predecessor_of",
] as const;

export type OrganizationRelationType =
  (typeof ORGANIZATION_RELATION_TYPES)[number];

export const ORGANIZATION_REGISTRY_REVIEW_STATUSES = [
  "unreviewed",
  "review_required",
  "approved",
  "rejected",
  "archived",
] as const;

export type OrganizationRegistryReviewStatus =
  (typeof ORGANIZATION_REGISTRY_REVIEW_STATUSES)[number];

export const ORGANIZATION_JURISDICTION_LEVELS = [
  "global",
  "supranational",
  "country",
  "state",
  "province",
  "canton",
  "constituent_country",
  "district",
  "county",
  "department",
  "region",
  "municipality",
  "city",
  "neighborhood",
  "custom",
] as const;

export type OrganizationJurisdictionLevel =
  (typeof ORGANIZATION_JURISDICTION_LEVELS)[number];

export function canonicalizeBcp47Locale(value: string): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  try {
    return Intl.getCanonicalLocales(normalized)[0] ?? null;
  } catch {
    return null;
  }
}

export const Bcp47LocaleSchema = z
  .string()
  .trim()
  .min(2)
  .refine((value) => canonicalizeBcp47Locale(value) !== null, {
    message: "invalid_bcp47_locale",
  });

export const OrganizationJurisdictionSchema = z
  .object({
    id: z.string().trim().min(1),
    level: z.enum(ORGANIZATION_JURISDICTION_LEVELS),
    label: z.string().trim().min(1).nullable().optional(),
    countryCode: z.string().trim().min(2).max(3).nullable().optional(),
    officialCode: z.string().trim().min(1).nullable().optional(),
    parentJurisdictionId: z.string().trim().min(1).nullable().optional(),
    provenanceRef: z.string().trim().min(1).nullable().optional(),
    validFrom: z.string().datetime({ offset: true }).nullable().optional(),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.validFrom &&
      value.validUntil &&
      new Date(value.validUntil).getTime() < new Date(value.validFrom).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "valid_until_before_valid_from",
      });
    }
  });

export type OrganizationJurisdiction = z.infer<
  typeof OrganizationJurisdictionSchema
>;

export const OrganizationRelationSchema = z
  .object({
    id: z.string().trim().min(1),
    fromOrganizationId: z.string().trim().min(1),
    toOrganizationId: z.string().trim().min(1),
    relationType: z.enum(ORGANIZATION_RELATION_TYPES),
    provenanceRef: z.string().trim().min(1),
    reviewStatus: z.enum(ORGANIZATION_REGISTRY_REVIEW_STATUSES),
    validFrom: z.string().datetime({ offset: true }).nullable().optional(),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.fromOrganizationId === value.toOrganizationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toOrganizationId"],
        message: "organization_relation_self_reference",
      });
    }
    if (
      value.validFrom &&
      value.validUntil &&
      new Date(value.validUntil).getTime() < new Date(value.validFrom).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "valid_until_before_valid_from",
      });
    }
  });

export type OrganizationRelation = z.infer<typeof OrganizationRelationSchema>;

export const CanonicalOrganizationSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    type: z.enum(CANONICAL_ORGANIZATION_TYPES),
    jurisdictions: z.array(OrganizationJurisdictionSchema).default([]),
    localeTags: z.array(Bcp47LocaleSchema).default([]),
    primaryLocale: Bcp47LocaleSchema.nullable().optional(),
    externalIds: z.record(z.string().trim().min(1), z.string().trim().min(1)).default({}),
    reviewStatus: z.enum(ORGANIZATION_REGISTRY_REVIEW_STATUSES),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.primaryLocale) return;
    const primary = canonicalizeBcp47Locale(value.primaryLocale);
    const locales = new Set(
      value.localeTags
        .map((locale) => canonicalizeBcp47Locale(locale))
        .filter((locale): locale is string => Boolean(locale)),
    );
    if (!primary || !locales.has(primary)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryLocale"],
        message: "primary_locale_not_in_locale_tags",
      });
    }
  });

export type CanonicalOrganization = z.infer<typeof CanonicalOrganizationSchema>;

export const BRAND_ASSET_TYPES = ["logo", "icon", "mark"] as const;
export type BrandAssetType = (typeof BRAND_ASSET_TYPES)[number];

export const BRAND_ASSET_RIGHTS_BASES = [
  "official_provided",
  "licensed",
  "public_domain",
  "official_site_reference",
  "unknown",
] as const;

export type BrandAssetRightsBasis =
  (typeof BRAND_ASSET_RIGHTS_BASES)[number];

export const BRAND_ASSET_REVIEW_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "archived",
] as const;

export type BrandAssetReviewStatus =
  (typeof BRAND_ASSET_REVIEW_STATUSES)[number];

export const BrandAssetSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    assetType: z.enum(BRAND_ASSET_TYPES),
    sourceUrl: z.string().trim().url(),
    officialSource: z.boolean(),
    retrievedAt: z.string().datetime({ offset: true }),
    contentHash: z.string().trim().min(8),
    mimeType: z.string().trim().min(1),
    dimensions: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .nullable()
      .optional(),
    rightsBasis: z.enum(BRAND_ASSET_RIGHTS_BASES),
    rightsNote: z.string().trim().min(1).nullable().optional(),
    rightsJurisdiction: z.string().trim().min(1).nullable().optional(),
    reviewStatus: z.enum(BRAND_ASSET_REVIEW_STATUSES),
    validFrom: z.string().datetime({ offset: true }).nullable().optional(),
    validUntil: z.string().datetime({ offset: true }).nullable().optional(),
    supersededBy: z.string().trim().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.validFrom &&
      value.validUntil &&
      new Date(value.validUntil).getTime() < new Date(value.validFrom).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "valid_until_before_valid_from",
      });
    }
  });

export type BrandAsset = z.infer<typeof BrandAssetSchema>;

export function canUseBrandAssetPublicly(
  asset: BrandAsset,
  at: Date = new Date(),
): boolean {
  if (asset.reviewStatus !== "approved") return false;
  if (asset.rightsBasis === "unknown") return false;
  if (asset.supersededBy) return false;

  const timestamp = at.getTime();
  if (asset.validFrom && timestamp < new Date(asset.validFrom).getTime()) {
    return false;
  }
  if (asset.validUntil && timestamp > new Date(asset.validUntil).getTime()) {
    return false;
  }
  return true;
}

export function brandAssetPresentationMode(
  asset: BrandAsset | null | undefined,
  at: Date = new Date(),
): "brand_asset" | "monogram_text_fallback" {
  return asset && canUseBrandAssetPublicly(asset, at)
    ? "brand_asset"
    : "monogram_text_fallback";
}
