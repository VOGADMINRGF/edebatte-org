import type { AccessTier } from "./types";

export type LimitsConfig = {
  contributionsPerMonth: number;
  streamsPerMonth: number;
  campaignsPerMonth: number;
};

export const LIMITS: Record<AccessTier, LimitsConfig> = {
  public: { contributionsPerMonth: 0, streamsPerMonth: 0, campaignsPerMonth: 0 },
  citizenBasic: { contributionsPerMonth: 2, streamsPerMonth: 0, campaignsPerMonth: 0 },
  citizenPremium: { contributionsPerMonth: 10, streamsPerMonth: 1, campaignsPerMonth: 0 },
  citizenPro: { contributionsPerMonth: 20, streamsPerMonth: 2, campaignsPerMonth: 1 },
  citizenUltra: { contributionsPerMonth: 50, streamsPerMonth: 4, campaignsPerMonth: 2 },
  institutionBasic: { contributionsPerMonth: 0, streamsPerMonth: 0, campaignsPerMonth: 0 },
  institutionPremium: { contributionsPerMonth: 0, streamsPerMonth: 0, campaignsPerMonth: 4 },
  staff: { contributionsPerMonth: 100, streamsPerMonth: 10, campaignsPerMonth: 10 },
};
