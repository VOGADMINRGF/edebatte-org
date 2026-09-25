import type {
  SocialDistributionPost,
  SocialDistributionRepo,
} from "@features/outputEngine/socialDistributionRuntime";
import type { MarketingContentOperation } from "@/features/marketing/contentOperations/contracts";
import { getMarketingRegistry } from "@/features/marketing/registry/data";
import { buildMarketingSocialDistributionPreparation } from "./socialDistributionPreparation";

export type PersistMarketingSocialDistributionInput = {
  content: MarketingContentOperation;
  organizationId: string;
  actorUserId: string;
  repo: SocialDistributionRepo;
};

export type PersistMarketingSocialDistributionResult =
  | {
      ok: false;
      reason: "distribution_not_ready";
      blockers: string[];
    }
  | {
      ok: true;
      post: SocialDistributionPost;
      unsupportedChannels: string[];
    };

export async function persistMarketingSocialDistribution(
  input: PersistMarketingSocialDistributionInput,
): Promise<PersistMarketingSocialDistributionResult> {
  const preparation = buildMarketingSocialDistributionPreparation(input.content);
  if (preparation.status !== "distribution_prepare" || !preparation.backlinkUrl) {
    return {
      ok: false,
      reason: "distribution_not_ready",
      blockers:
        preparation.blockers.length > 0
          ? preparation.blockers
          : ["brand_safe_verified_cta_required"],
    };
  }

  const campaign = getMarketingRegistry().campaigns.find(
    (candidate) => candidate.id === preparation.campaignId,
  );
  if (!campaign) {
    return {
      ok: false,
      reason: "distribution_not_ready",
      blockers: ["campaign_missing"],
    };
  }

  const channels = preparation.supportedTargets.map((target) => target.queueChannel);
  const channelTexts = Object.fromEntries(
    preparation.supportedTargets.map((target) => [target.queueChannel, target.text]),
  );
  const channelNotes = Object.fromEntries(
    preparation.supportedTargets.map((target) => [
      target.queueChannel,
      `brand:${preparation.brand};campaign:${campaign.id};content:${input.content.id}`,
    ]),
  );

  const post = await input.repo.createOrReplaceDraft({
    organizationId: input.organizationId,
    sourceContextType: "marketing_campaign",
    sourceContextId: campaign.id,
    publicBrand: preparation.brand,
    marketingCampaignId: campaign.id,
    marketingContentId: input.content.id,
    sourceVisibilityState: "internal_review",
    title: input.content.title,
    channels,
    scheduleMode: "manual",
    channelTexts,
    channelNotes,
    sourceSummary: `${campaign.title}. ${campaign.description}`,
    backlinkHref: preparation.backlinkUrl,
    reviewRequired: true,
    createdByUserId: input.actorUserId,
    note: `alpha2_marketing_distribution_prepare:${input.content.id}`,
    initialStatus: "needs_review",
  });

  return {
    ok: true,
    post,
    unsupportedChannels: preparation.unsupportedChannels,
  };
}
