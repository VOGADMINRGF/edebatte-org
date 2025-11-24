export type ContributionLevel = "level1" | "level2";

export type AccessTier =
  |"public"
  | "citizenBasic"
  | "citizenPremium"
  | "citizenPro"
  | "citizenUltra"
  | "institutionBasic"
  | "institutionPremium"
  | "staff";

export type EarnRule = {
  level: ContributionLevel;
  swipesPerCredit: number;
};

export type AccessTierConfig = {
  id: AccessTier;
  label: string;
  description: string;
  monthlyFeeCents?: number;
  includedPerMonth: Partial<Record<ContributionLevel, number>>;
  earnRules?: EarnRule[];
  notes?: string;
};

export type UsageState = {
  tier: AccessTier;
  swipeCountTotal: number;
  includedUsed: Record<ContributionLevel, number>;
  credits: Record<ContributionLevel, number>;
};
