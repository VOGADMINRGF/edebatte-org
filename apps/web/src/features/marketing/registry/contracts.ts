import { z } from "zod";

export const MARKETING_MARKETABILITY_VALUES = [
  "not_marketable",
  "concept_only",
  "preview_only",
  "proof_required",
  "review_ready",
  "publicly_marketable",
  "retired",
] as const;

export const MARKETING_CAMPAIGN_STATUS_VALUES = [
  "idea",
  "qualified",
  "planned",
  "in_production",
  "review_ready",
  "approved",
  "scheduled",
  "active",
  "paused",
  "blocked",
  "completed",
  "retired",
  "cancelled",
] as const;

export const MARKETING_ASSET_STATUS_VALUES = [
  "draft",
  "review_ready",
  "approved",
  "published",
  "retired",
] as const;

export const MARKETING_READINESS_VALUES = [
  "ready",
  "product_proof_required",
  "governance_decision_required",
  "offer_decision_required",
  "routing_decision_required",
  "legal_review_required",
  "translation_review_required",
  "runtime_proof_required",
] as const;

const idSchema = z.string().trim().min(1).max(120);
const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoDateSchema = z.string().datetime({ offset: true });

export const MarketingEvidenceRefSchema = z
  .object({
    type: z.enum([
      "repository_file",
      "pull_request",
      "commit",
      "route",
      "test",
      "production_smoke",
      "dossier",
      "themenradar_item",
      "participation_campaign",
      "decision_contract",
      "manual_evidence",
    ]),
    ref: z.string().trim().min(1).max(500),
    status: z.enum(["unverified", "verified", "stale", "rejected"]),
    verifiedAt: isoDateSchema.nullable(),
    note: z.string().trim().max(1000).nullable(),
  })
  .strict();

export const MarketingOpportunitySchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(4000),
    sourceType: z.enum([
      "feature",
      "product_release",
      "themenradar",
      "dossier",
      "content_development",
      "participation_campaign",
      "partner",
      "membership",
      "manual",
    ]),
    sourceRef: z.string().trim().min(1).max(500).nullable(),
    marketability: z.enum(MARKETING_MARKETABILITY_VALUES),
    status: z.enum(["new", "qualified", "accepted", "deferred", "rejected", "retired"]),
    audienceKeys: z.array(keySchema).min(1),
    evidence: z.array(MarketingEvidenceRefSchema).min(1),
    routeStatus: z.enum(["missing", "concept", "verified", "retired"]),
    productProofStatus: z.enum(["missing", "partial", "verified", "stale"]),
    ctaStatus: z.enum(["missing", "needs_routing_decision", "verified", "retired"]),
    blockerKeys: z.array(keySchema),
    campaignIds: z.array(idSchema),
    assetIds: z.array(idSchema),
    reviewRequired: z.literal(true),
    autoPublishEligible: z.literal(false),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .strict();

export const MarketingCampaignSchema = z
  .object({
    id: idSchema,
    key: keySchema,
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(4000),
    status: z.enum(MARKETING_CAMPAIGN_STATUS_VALUES),
    readiness: z.enum(MARKETING_READINESS_VALUES),
    opportunityIds: z.array(idSchema),
    brandProfileId: idSchema,
    audienceKeys: z.array(keySchema).min(1),
    primaryCta: z
      .object({
        label: z.string().trim().min(1).max(120),
        url: z.string().url().nullable(),
        status: z.enum(["needs_routing_decision", "verified", "retired"]),
      })
      .strict(),
    assetIds: z.array(idSchema),
    blockerKeys: z.array(keySchema),
    reviewRequired: z.literal(true),
    autoPublishEligible: z.literal(false),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .strict();

export const MarketingAssetSchema = z
  .object({
    id: idSchema,
    campaignId: idSchema,
    brandProfileId: idSchema,
    assetType: z.enum([
      "onepager",
      "pitchdeck",
      "landing_copy",
      "carousel",
      "social_image",
      "story",
      "reel_cover",
      "video_script",
      "video_master",
      "video_variant",
      "press_copy",
      "partner_kit",
      "newsletter",
      "report",
      "other",
    ]),
    title: z.string().trim().min(1).max(180),
    status: z.enum(MARKETING_ASSET_STATUS_VALUES),
    locale: z.string().trim().min(2).max(35),
    originalLocale: z.string().trim().min(2).max(35),
    translationStatus: z.enum(["original", "machine_draft", "human_reviewed", "approved"]),
    version: z.number().int().min(1),
    sourcePath: z.string().trim().min(1).max(500),
    exportPath: z.string().trim().min(1).max(500).nullable(),
    publicPath: z.string().trim().min(1).max(500).nullable(),
    evidence: z.array(MarketingEvidenceRefSchema).min(1),
    reviewRequired: z.literal(true),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
  })
  .strict();

export const MarketingBrandProfileSchema = z
  .object({
    id: idSchema,
    key: keySchema,
    mode: z.enum(["edebatte", "voiceopengov", "vote4gov", "co_branded", "white_label"]),
    displayName: z.string().trim().min(1).max(180),
    status: z.enum(["draft", "review_ready", "approved", "retired"]),
    version: z.number().int().min(1),
    locales: z.array(z.string().trim().min(2).max(35)).min(1),
    logoStatus: z.enum(["missing", "partial", "approved"]),
    tokenStatus: z.enum(["missing", "partial", "complete"]),
    legalTargetStatus: z.enum(["missing", "partial", "complete"]),
    voxyMode: z.enum(["canonical", "contextual", "vote4gov_context", "hidden"]),
    sourcePath: z.string().trim().min(1).max(500),
    updatedAt: isoDateSchema,
  })
  .strict();

export const MarketingDistributionRecordSchema = z
  .object({
    id: idSchema,
    campaignId: idSchema,
    assetId: idSchema,
    channel: keySchema,
    status: z.enum(["planned", "scheduled", "published", "failed", "withdrawn"]),
    publicUrl: z.string().url().nullable(),
    reviewed: z.literal(true),
    autoPublished: z.literal(false),
    publishedAt: isoDateSchema.nullable(),
    updatedAt: isoDateSchema,
  })
  .strict();

export const MarketingRegistrySchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    mode: z.literal("read_only"),
    generatedAt: isoDateSchema,
    sources: z.array(z.string().trim().min(1).max(500)).min(1),
    opportunities: z.array(MarketingOpportunitySchema),
    campaigns: z.array(MarketingCampaignSchema),
    assets: z.array(MarketingAssetSchema),
    brandProfiles: z.array(MarketingBrandProfileSchema),
    distributionRecords: z.array(MarketingDistributionRecordSchema),
  })
  .strict();

export type MarketingEvidenceRef = z.infer<typeof MarketingEvidenceRefSchema>;
export type MarketingOpportunity = z.infer<typeof MarketingOpportunitySchema>;
export type MarketingCampaign = z.infer<typeof MarketingCampaignSchema>;
export type MarketingAsset = z.infer<typeof MarketingAssetSchema>;
export type MarketingBrandProfile = z.infer<typeof MarketingBrandProfileSchema>;
export type MarketingDistributionRecord = z.infer<typeof MarketingDistributionRecordSchema>;
export type MarketingRegistry = z.infer<typeof MarketingRegistrySchema>;
