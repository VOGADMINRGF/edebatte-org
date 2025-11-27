import {
  MAX_STORED_CONTRIBUTION_CREDITS,
  SWIPES_PER_CONTRIBUTION_CREDIT,
  XP_PER_SWIPE,
} from "../../config/credits";
import { getEngagementLevel, swipesUntilNextCredit } from "./engagement";
import type { EngagementLevel } from "./engagement";

export type SwipeCreditState = {
  swipeCountTotal?: number | null;
  xp?: number | null;
  contributionCredits?: number | null;
};

export type SwipeCreditResult = {
  swipeCountTotal: number;
  xp: number;
  earnedCredits: number;
  contributionCredits: number;
  engagementLevel: EngagementLevel;
  nextCreditIn: number;
};

export function applySwipeForCredits(state: SwipeCreditState): SwipeCreditResult {
  const prevSwipes = Number.isFinite(state.swipeCountTotal)
    ? Math.max(0, Math.floor(state.swipeCountTotal || 0))
    : 0;
  const prevXp = Number.isFinite(state.xp) ? Math.max(0, Math.floor(state.xp || 0)) : 0;
  const prevCredits = Number.isFinite(state.contributionCredits)
    ? Math.max(0, Math.floor(state.contributionCredits || 0))
    : 0;

  const swipeCountTotal = prevSwipes + 1;
  const xp = prevXp + XP_PER_SWIPE;

  const prevCompletedCredits = Math.floor(prevSwipes / SWIPES_PER_CONTRIBUTION_CREDIT);
  const nextCompletedCredits = Math.floor(swipeCountTotal / SWIPES_PER_CONTRIBUTION_CREDIT);
  const rawEarnedCredits = Math.max(0, nextCompletedCredits - prevCompletedCredits);

  const cappedTotalCredits = Math.min(
    MAX_STORED_CONTRIBUTION_CREDITS,
    prevCredits + rawEarnedCredits,
  );
  const earnedCredits = Math.max(0, cappedTotalCredits - prevCredits);

  const engagementLevel = getEngagementLevel(xp);
  const nextCreditIn = swipesUntilNextCredit(swipeCountTotal);

  return {
    swipeCountTotal,
    xp,
    earnedCredits,
    contributionCredits: cappedTotalCredits,
    engagementLevel,
    nextCreditIn,
  };
}
