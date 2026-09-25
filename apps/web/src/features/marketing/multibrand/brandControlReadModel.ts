import { getMarketingRegistry } from "@/features/marketing/registry/data";
import type {
  MarketingAsset,
  MarketingBrandProfile,
  MarketingCampaign,
  MarketingDistributionRecord,
  MarketingRegistry,
} from "@/features/marketing/registry/contracts";
import {
  CANONICAL_MARKETING_BRAND_PROFILES,
  type MarketingPublicBrand,
} from "./brandRoutingContract";

export type MarketingBrandControlRow = {
  brand: MarketingPublicBrand;
  profile: MarketingBrandProfile | null;
  campaigns: MarketingCampaign[];
  assets: MarketingAsset[];
  distributionRecords: MarketingDistributionRecord[];
  blockers: string[];
  reviewReadyAssets: number;
  approvedAssets: number;
};

export type MarketingBrandControlReadModel = {
  rows: MarketingBrandControlRow[];
  totalCampaigns: number;
  totalAssets: number;
  totalDistributionRecords: number;
};

const BRAND_ORDER: MarketingPublicBrand[] = ["edebatte", "voiceopengov", "vote4gov"];

export function buildMarketingBrandControlReadModel(
  registry: MarketingRegistry = getMarketingRegistry(),
): MarketingBrandControlReadModel {
  const rows = BRAND_ORDER.map((brand): MarketingBrandControlRow => {
    const profileId = CANONICAL_MARKETING_BRAND_PROFILES[brand].brandProfileId;
    const profile = registry.brandProfiles.find((candidate) => candidate.id === profileId) ?? null;
    const campaigns = registry.campaigns.filter((campaign) => campaign.brandProfileId === profileId);
    const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
    const assets = registry.assets.filter((asset) => campaignIds.has(asset.campaignId));
    const assetIds = new Set(assets.map((asset) => asset.id));
    const distributionRecords = registry.distributionRecords.filter((record) =>
      assetIds.has(record.assetId),
    );
    const blockers = [...new Set(campaigns.flatMap((campaign) => campaign.blockerKeys))].sort();

    return {
      brand,
      profile,
      campaigns: [...campaigns].sort((a, b) => a.title.localeCompare(b.title)),
      assets: [...assets].sort((a, b) => a.title.localeCompare(b.title)),
      distributionRecords,
      blockers,
      reviewReadyAssets: assets.filter((asset) => asset.status === "review_ready").length,
      approvedAssets: assets.filter((asset) => asset.status === "approved").length,
    };
  });

  return {
    rows,
    totalCampaigns: rows.reduce((sum, row) => sum + row.campaigns.length, 0),
    totalAssets: rows.reduce((sum, row) => sum + row.assets.length, 0),
    totalDistributionRecords: rows.reduce((sum, row) => sum + row.distributionRecords.length, 0),
  };
}

export function selectMarketingBrandControlRow(
  model: MarketingBrandControlReadModel,
  brand: MarketingPublicBrand,
) {
  return model.rows.find((row) => row.brand === brand) ?? null;
}
