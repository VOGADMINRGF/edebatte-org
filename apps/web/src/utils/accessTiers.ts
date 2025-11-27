import { FEATURE_MATRIX } from "@/config/featureMatrix";
import type { AccessTier } from "@/config/accessTiers";
import type { EngagementLevel } from "@features/user/engagement";
import { getEngagementLevel } from "@features/user/engagement";

type AccessAwareUser = {
  accessTier?: string | null;
  engagementXp?: number | null;
  engagementLevel?: EngagementLevel | null;
};

const MIN_CREATE_STREAM_LEVEL: EngagementLevel = "brennend";
const MIN_HOST_STREAM_LEVEL: EngagementLevel = "inspirierend";

function normalizeTier(tier?: string | null): AccessTier {
  const key = (tier || "public") as AccessTier;
  if (Object.prototype.hasOwnProperty.call(FEATURE_MATRIX, key)) {
    return key;
  }
  return "public";
}

function resolveEngagementLevel(user?: AccessAwareUser): EngagementLevel {
  if (!user) return "interessiert";
  if (user.engagementLevel) return user.engagementLevel;
  return getEngagementLevel(user.engagementXp ?? 0);
}

export function canUserSwipe(user?: AccessAwareUser): boolean {
  const tier = normalizeTier(user?.accessTier);
  return FEATURE_MATRIX[tier].canSwipe;
}

export function canUserVote(user?: AccessAwareUser): boolean {
  const tier = normalizeTier(user?.accessTier);
  return FEATURE_MATRIX[tier].canVote;
}

export function canUserChatPublic(user?: AccessAwareUser): boolean {
  const tier = normalizeTier(user?.accessTier);
  return FEATURE_MATRIX[tier].canChatPublic;
}

export function canUserCreateStream(user?: AccessAwareUser): boolean {
  const tier = normalizeTier(user?.accessTier);
  if (!FEATURE_MATRIX[tier].canCreateStream) return false;
  const level = resolveEngagementLevel(user);
  const thresholds: EngagementLevel[] = [
    "interessiert",
    "engagiert",
    "begeistert",
    "brennend",
    "inspirierend",
    "leuchtend",
  ];
  return thresholds.indexOf(level) >= thresholds.indexOf(MIN_CREATE_STREAM_LEVEL);
}

export function canUserHostStream(user?: AccessAwareUser): boolean {
  const tier = normalizeTier(user?.accessTier);
  if (!FEATURE_MATRIX[tier].canHostStream) return false;
  const level = resolveEngagementLevel(user);
  const thresholds: EngagementLevel[] = [
    "interessiert",
    "engagiert",
    "begeistert",
    "brennend",
    "inspirierend",
    "leuchtend",
  ];
  return thresholds.indexOf(level) >= thresholds.indexOf(MIN_HOST_STREAM_LEVEL);
}

export function canUserCreateCampaign(user?: AccessAwareUser): boolean {
  const tier = normalizeTier(user?.accessTier);
  return FEATURE_MATRIX[tier].canCreateCampaign;
}
