// packages/config/admin-config.ts
// Central runtime config with env fallbacks

export interface PricingConfig {
  membershipMonthlyEUR: number;      // e.g., 5
  postImmediateEUR: number;          // pay-to-post bypass price
  swipeToPostThresholds: number[];   // e.g., [100, 500, 1000] → allowed posts [1,3,7]
}

export interface PipelineLimits {
  newsfeedMaxPerRun: number;         // throttle fetch volume per run
  factcheckMaxPerItemTokens: number; // token/compute budget per item
  enableAutoPost: boolean;           // whether to auto-create drafts for votes
}

export interface RegionPilot {
  defaultRegionKey: string;          // "DE:BE:11000000" (Berlin)
}

export interface AdminConfig {
  pricing: PricingConfig;
  limits: PipelineLimits;
  region: RegionPilot;
}

export const adminConfig: AdminConfig = {
  pricing: {
    membershipMonthlyEUR: Number(process.env.VOG_PRICE_MEMBERSHIP ?? 5),
    postImmediateEUR: Number(process.env.VOG_PRICE_POST_IMMEDIATE ?? 1.99),
    swipeToPostThresholds: (process.env.VOG_SWIPE_THRESHOLDS ?? "100,500,1000")
      .split(",").map(x => Number(x.trim())).filter(Boolean),
  },
  limits: {
    newsfeedMaxPerRun: Number(process.env.VOG_NEWSFEED_MAX_PER_RUN ?? 50),
    factcheckMaxPerItemTokens: Number(process.env.VOG_FACTCHECK_TOKENS ?? 4096),
    enableAutoPost: String(process.env.VOG_PIPELINE_AUTODRAFT ?? "true") === "true",
  },
  region: {
    defaultRegionKey: String(process.env.VOG_DEFAULT_REGION ?? "DE:BE:11000000"),
  },
};
