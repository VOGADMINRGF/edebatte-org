import type { EngagementLevel } from "@features/user/engagement";

type Threshold = { minXp: number; level: EngagementLevel };

export const ENGAGEMENT_THRESHOLDS: Threshold[] = [
  { minXp: 50_000, level: "leuchtend" },
  { minXp: 15_000, level: "inspirierend" },
  { minXp: 5_000, level: "brennend" },
  { minXp: 1_500, level: "begeistert" },
  { minXp: 250, level: "engagiert" },
  { minXp: 0, level: "interessiert" },
];
