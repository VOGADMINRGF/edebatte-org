// Lokal verwaltete Admin-Config (keine Abhängigkeit von packages/)

export interface PricingConfig {
  membershipMonthlyEUR: number;
  postImmediateEUR: number;
  swipeToPostThresholds: number[];
}

export interface PipelineLimits {
  newsfeedMaxPerRun: number;
  factcheckMaxPerItemTokens: number;
  enableAutoPost: boolean;
}

export interface RegionPilot {
  defaultRegionKey: string;
}

export interface AdminConfig {
  pricing: PricingConfig;
  limits: PipelineLimits;
  region: RegionPilot;
}

const numberFrom = (val: string | undefined, fallback: number) => {
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const boolFrom = (val: string | undefined, fallback: boolean) => {
  if (val === undefined) return fallback;
  return val === "true" || val === "1";
};

const arrayFrom = (val: string | undefined, fallback: number[]) => {
  if (!val) return fallback;
  const arr = val
    .split(",")
    .map((chunk) => Number(chunk.trim()))
    .filter((x) => Number.isFinite(x) && x > 0);
  return arr.length ? arr : fallback;
};

export const adminConfig: AdminConfig = {
  pricing: {
    membershipMonthlyEUR: numberFrom(
      process.env.NEXT_PUBLIC_VOG_PRICE_MEMBERSHIP ?? process.env.VOG_PRICE_MEMBERSHIP,
      5,
    ),
    postImmediateEUR: numberFrom(
      process.env.NEXT_PUBLIC_VOG_PRICE_POST_IMMEDIATE ?? process.env.VOG_PRICE_POST_IMMEDIATE,
      1.99,
    ),
    swipeToPostThresholds: arrayFrom(
      process.env.NEXT_PUBLIC_VOG_SWIPE_THRESHOLDS ?? process.env.VOG_SWIPE_THRESHOLDS,
      [100, 500, 1000],
    ),
  },
  limits: {
    newsfeedMaxPerRun: numberFrom(
      process.env.NEXT_PUBLIC_VOG_NEWSFEED_MAX_PER_RUN ?? process.env.VOG_NEWSFEED_MAX_PER_RUN,
      50,
    ),
    factcheckMaxPerItemTokens: numberFrom(
      process.env.NEXT_PUBLIC_VOG_FACTCHECK_TOKENS ?? process.env.VOG_FACTCHECK_TOKENS,
      4096,
    ),
    enableAutoPost: boolFrom(
      process.env.NEXT_PUBLIC_VOG_PIPELINE_AUTODRAFT ?? process.env.VOG_PIPELINE_AUTODRAFT,
      true,
    ),
  },
  region: {
    defaultRegionKey:
      process.env.NEXT_PUBLIC_VOG_DEFAULT_REGION ??
      process.env.VOG_DEFAULT_REGION ??
      "DE:BE:11000000",
  },
};

export default adminConfig;
