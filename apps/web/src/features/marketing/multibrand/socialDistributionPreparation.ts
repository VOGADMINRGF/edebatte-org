import { z } from "zod";
import type { SocialDistributionChannel } from "@features/outputEngine/socialDistribution";
import type { MarketingContentOperation } from "@/features/marketing/contentOperations/contracts";
import type { MarketingCampaign } from "@/features/marketing/registry/contracts";
import { getMarketingRegistry } from "@/features/marketing/registry/data";
import {
  resolveMarketingPublicBrandFromProfileId,
  type MarketingPublicBrand,
} from "./brandRoutingContract";

const MarketingDistributionPreparationStatusSchema = z.enum([
  "blocked",
  "distribution_prepare",
]);

const SupportedTargetSchema = z
  .object({
    marketingChannel: z.string().min(1),
    queueChannel: z.enum([
      "website_update",
      "newsletter_draft",
      "embed_snippet",
      "qr_asset",
      "linkedin_draft",
      "x_draft",
      "mastodon_draft",
      "instagram_asset",
      "press_note",
    ]),
    text: z.string().trim().min(1),
    requiresReview: z.literal(true),
    externalPublishAllowed: z.literal(false),
  })
  .strict();

export const MarketingSocialDistributionPreparationSchema = z
  .object({
    contentId: z.string().min(1),
    campaignId: z.string().min(1),
    brand: z.enum(["edebatte", "voiceopengov", "vote4gov"]),
    brandProfileId: z.string().min(1),
    status: MarketingDistributionPreparationStatusSchema,
    backlinkUrl: z.string().url().nullable(),
    supportedTargets: z.array(SupportedTargetSchema),
    unsupportedChannels: z.array(z.string().min(1)),
    blockers: z.array(z.string().min(1)),
    reviewRequired: z.literal(true),
    autoPublishEligible: z.literal(false),
    syntheticSupportForbidden: z.literal(true),
    sensitivePoliticalMicrotargetingForbidden: z.literal(true),
  })
  .strict();

export type MarketingSocialDistributionPreparation = z.infer<
  typeof MarketingSocialDistributionPreparationSchema
>;

const CHANNEL_MAP: Record<string, SocialDistributionChannel | null> = {
  instagram: "instagram_asset",
  instagram_reels: "instagram_asset",
  instagram_story: "instagram_asset",
  linkedin: "linkedin_draft",
  newsletter: "newsletter_draft",
  press: "press_note",
  facebook: null,
  facebook_story: null,
  tiktok: null,
  youtube_shorts: null,
  youtube: null,
};

const BRAND_HOSTS: Record<MarketingPublicBrand, ReadonlySet<string>> = {
  edebatte: new Set(["edebatte.org", "www.edebatte.org"]),
  voiceopengov: new Set(["voiceopengov.org", "www.voiceopengov.org"]),
  vote4gov: new Set(["vote4gov.eu", "www.vote4gov.eu"]),
};

function resolveCampaign(content: MarketingContentOperation): MarketingCampaign | null {
  return getMarketingRegistry().campaigns.find((campaign) => campaign.id === content.campaignId) ?? null;
}

function resolveBrand(campaign: MarketingCampaign): MarketingPublicBrand | null {
  return resolveMarketingPublicBrandFromProfileId(campaign.brandProfileId);
}

function safeBacklinkForBrand(
  content: MarketingContentOperation,
  brand: MarketingPublicBrand,
): string | null {
  if (content.cta.status !== "verified" || !content.cta.url) return null;
  try {
    const parsed = new URL(content.cta.url);
    return BRAND_HOSTS[brand].has(parsed.hostname.toLowerCase()) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function contentText(content: MarketingContentOperation) {
  return content.captionDraft ?? content.scriptDraft ?? "";
}

export function buildMarketingSocialDistributionPreparation(
  content: MarketingContentOperation,
): MarketingSocialDistributionPreparation {
  const campaign = resolveCampaign(content);
  const blockers: string[] = [];

  if (!campaign) {
    return MarketingSocialDistributionPreparationSchema.parse({
      contentId: content.id,
      campaignId: content.campaignId,
      brand: "edebatte",
      brandProfileId: "unknown",
      status: "blocked",
      backlinkUrl: null,
      supportedTargets: [],
      unsupportedChannels: [...content.channels],
      blockers: ["campaign_missing"],
      reviewRequired: true,
      autoPublishEligible: false,
      syntheticSupportForbidden: true,
      sensitivePoliticalMicrotargetingForbidden: true,
    });
  }

  const brand = resolveBrand(campaign);
  if (!brand) blockers.push("brand_profile_unresolved");

  const resolvedBrand = brand ?? "edebatte";
  const backlinkUrl = brand ? safeBacklinkForBrand(content, brand) : null;
  if (!backlinkUrl) blockers.push("brand_safe_verified_cta_required");

  if (content.status !== "review_ready" && content.status !== "approved") {
    blockers.push("content_not_review_ready");
  }
  if (content.review.required !== true) blockers.push("review_contract_missing");
  if (!contentText(content).trim()) blockers.push("content_text_missing");
  if (content.autoPublishEligible !== false) blockers.push("auto_publish_must_remain_disabled");

  const supportedTargets: Array<z.infer<typeof SupportedTargetSchema>> = [];
  const unsupportedChannels: string[] = [];
  const seenQueueChannels = new Set<SocialDistributionChannel>();

  for (const marketingChannel of content.channels) {
    const queueChannel = CHANNEL_MAP[marketingChannel] ?? null;
    if (!queueChannel) {
      unsupportedChannels.push(marketingChannel);
      continue;
    }
    if (seenQueueChannels.has(queueChannel)) continue;
    seenQueueChannels.add(queueChannel);
    supportedTargets.push({
      marketingChannel,
      queueChannel,
      text: contentText(content),
      requiresReview: true,
      externalPublishAllowed: false,
    });
  }

  if (supportedTargets.length === 0) blockers.push("no_supported_social_queue_channel");

  return MarketingSocialDistributionPreparationSchema.parse({
    contentId: content.id,
    campaignId: content.campaignId,
    brand: resolvedBrand,
    brandProfileId: campaign.brandProfileId,
    status: blockers.length === 0 ? "distribution_prepare" : "blocked",
    backlinkUrl,
    supportedTargets,
    unsupportedChannels,
    blockers,
    reviewRequired: true,
    autoPublishEligible: false,
    syntheticSupportForbidden: true,
    sensitivePoliticalMicrotargetingForbidden: true,
  });
}

export function buildMarketingSocialDistributionBatch(
  contents: readonly MarketingContentOperation[],
) {
  return contents.map(buildMarketingSocialDistributionPreparation);
}
