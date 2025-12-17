import { ACCESS_TIER_CONFIG, DEFAULT_EARN_RULES } from "./config";
import type {
  ContributionLevel,
  EarnRule,
  UsageState,
} from "./types";

const ensureState = (state: UsageState): UsageState => ({
  ...state,
  includedUsed: {
    level1: state.includedUsed.level1 ?? 0,
    level2: state.includedUsed.level2 ?? 0,
  },
  credits: {
    level1: state.credits.level1 ?? 0,
    level2: state.credits.level2 ?? 0,
  },
});

export function applySwipesToCredits(
  state: UsageState,
  newSwipes: number,
  rules: EarnRule[] = DEFAULT_EARN_RULES
): UsageState {
  const next = ensureState(state);
  const total = Math.max(0, Math.floor(newSwipes));
  if (total <= 0) return next;

  let remainingSwipes = total;
  const updatedCredits = { ...next.credits };

  rules.forEach((rule) => {
    if (rule.swipesPerCredit <= 0) return;
    const earned = Math.floor(remainingSwipes / rule.swipesPerCredit);
    if (earned > 0) {
      updatedCredits[rule.level] =
        (updatedCredits[rule.level] ?? 0) + earned;
      remainingSwipes -= earned * rule.swipesPerCredit;
    }
  });

  return {
    ...next,
    swipeCountTotal: next.swipeCountTotal + total,
    credits: updatedCredits,
  };
}

export function canPostContribution(
  state: UsageState,
  level: ContributionLevel
): boolean {
  const cfg = ACCESS_TIER_CONFIG[state.tier];
  const limit = cfg.includedPerMonth[level] ?? 0;
  const used = state.includedUsed[level] ?? 0;
  if (used < limit) return true;
  return (state.credits[level] ?? 0) > 0;
}

export function consumeContribution(
  state: UsageState,
  level: ContributionLevel
): UsageState {
  const cfg = ACCESS_TIER_CONFIG[state.tier];
  const limit = cfg.includedPerMonth[level] ?? 0;
  const used = state.includedUsed[level] ?? 0;
  const next = ensureState(state);

  if (used < limit) {
    return {
      ...next,
      includedUsed: {
        ...next.includedUsed,
        [level]: used + 1,
      },
    };
  }

  const credits = next.credits[level] ?? 0;
  if (credits > 0) {
    return {
      ...next,
      credits: {
        ...next.credits,
        [level]: credits - 1,
      },
    };
  }

  return next;
}
