import type { AccessTier } from "@features/pricing/types";
import type { ProfilePackage } from "./types";

export function getProfilePackageForAccessTier(tier: AccessTier): ProfilePackage {
  switch (tier) {
    case "citizenPro":
    case "citizenUltra":
      return "premium";
    case "citizenPremium":
    case "institutionPremium":
      return "pro";
    case "public":
    case "citizenBasic":
    case "institutionBasic":
    case "staff":
    default:
      return "basic";
  }
}
