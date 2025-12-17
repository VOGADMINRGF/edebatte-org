import { ACCESS_TIER_CONFIG } from "@/modules/pricing/config";
import type { AccessTier, AccessTierConfig } from "@/modules/pricing/config";

export const B2C_PLAN_ORDER: AccessTier[] = ["citizenBasic", "citizenPremium", "citizenPro"];

export const B2C_PLANS: AccessTierConfig[] = B2C_PLAN_ORDER.map((id) => ACCESS_TIER_CONFIG[id]).filter(
  Boolean,
) as AccessTierConfig[];

export function getPlanConfig(planId: string): AccessTierConfig | null {
  return (ACCESS_TIER_CONFIG as Record<string, AccessTierConfig | undefined>)[planId] ?? null;
}
