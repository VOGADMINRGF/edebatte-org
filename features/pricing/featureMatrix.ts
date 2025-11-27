import type { AccessTier } from "./types";

export type FeatureFlags = {
  canSwipe: boolean;
  canVote: boolean;
  canChatPublic: boolean;
  canCreateStream: boolean;
  canHostStream: boolean;
  canCreateCampaign: boolean;
  reportScope: "none" | "public" | "extended";
};

const citizenDefaults: FeatureFlags = {
  canSwipe: true,
  canVote: true,
  canChatPublic: true,
  canCreateStream: false,
  canHostStream: false,
  canCreateCampaign: false,
  reportScope: "public",
};

export const FEATURE_MATRIX: Record<AccessTier, FeatureFlags> = {
  public: {
    canSwipe: false,
    canVote: false,
    canChatPublic: false,
    canCreateStream: false,
    canHostStream: false,
    canCreateCampaign: false,
    reportScope: "none",
  },
  citizenBasic: citizenDefaults,
  citizenPremium: { ...citizenDefaults, canCreateStream: true },
  citizenPro: { ...citizenDefaults, canCreateStream: true, canHostStream: true },
  citizenUltra: { ...citizenDefaults, canCreateStream: true, canHostStream: true, canCreateCampaign: true },
  institutionBasic: {
    canSwipe: false,
    canVote: false,
    canChatPublic: false,
    canCreateStream: false,
    canHostStream: false,
    canCreateCampaign: false,
    reportScope: "extended",
  },
  institutionPremium: {
    canSwipe: false,
    canVote: false,
    canChatPublic: false,
    canCreateStream: false,
    canHostStream: false,
    canCreateCampaign: true,
    reportScope: "extended",
  },
  staff: {
    canSwipe: true,
    canVote: true,
    canChatPublic: true,
    canCreateStream: true,
    canHostStream: true,
    canCreateCampaign: true,
    reportScope: "extended",
  },
};
