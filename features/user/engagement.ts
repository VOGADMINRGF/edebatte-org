// features/user/engagement.ts
import {
  SWIPES_PER_CONTRIBUTION_CREDIT,
  XP_PER_SWIPE,
} from "../../config/credits";
import { ENGAGEMENT_THRESHOLDS } from "../../config/engagement";

export type EngagementLevel =
  | "interessiert"
  | "engagiert"
  | "begeistert"
  | "brennend"
  | "inspirierend"
  | "leuchtend";

export function getEngagementLevel(xp: number): EngagementLevel {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const match = ENGAGEMENT_THRESHOLDS.find((entry) => safeXp >= entry.minXp);
  return match?.level ?? "interessiert";
}

export function swipesUntilNextCredit(totalSwipes: number): number {
  const safeTotal = Number.isFinite(totalSwipes) ? Math.max(0, Math.floor(totalSwipes)) : 0;
  const remainder = safeTotal % SWIPES_PER_CONTRIBUTION_CREDIT;
  if (remainder === 0) {
    return SWIPES_PER_CONTRIBUTION_CREDIT;
  }
  return SWIPES_PER_CONTRIBUTION_CREDIT - remainder;
}
