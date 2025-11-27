import type { EngagementLevel } from "@features/user/engagement";
import type { ProfilePackage } from "./types";

const LEVEL_ORDER: EngagementLevel[] = [
  "interessiert",
  "engagiert",
  "begeistert",
  "brennend",
  "inspirierend",
  "leuchtend",
];

function levelAtLeast(level: EngagementLevel, required: EngagementLevel): boolean {
  return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(required);
}

export function canEditTopTopics(level: EngagementLevel): boolean {
  return levelAtLeast(level, "engagiert");
}

export function canPinHighlight(level: EngagementLevel, pkg: ProfilePackage): boolean {
  return levelAtLeast(level, "begeistert") && pkg !== "basic";
}

export function canUseProfileStyles(level: EngagementLevel, pkg: ProfilePackage): boolean {
  return levelAtLeast(level, "begeistert") && pkg !== "basic";
}

export function canShowProfileStats(level: EngagementLevel): boolean {
  return levelAtLeast(level, "engagiert");
}
