import type { VerificationLevel } from "@core/auth/verificationTypes";

export const VERIFICATION_LEVEL_ORDER: Record<VerificationLevel, number> = {
  none: 0,
  email: 1,
  soft: 2,
  strong: 3,
};

export const VERIFICATION_LEVEL_DESCRIPTIONS: Record<VerificationLevel, string> = {
  none: "Nur Lesen/Browsen – keine aktiven Aktionen.",
  email: "E-Mail bestätigt – Level 1 Beiträge & einfache Umfragen.",
  soft: "Identität (OTB/eID) geprüft – Level 2 Beiträge & Evidence-Features.",
  strong: "Komplett legitimiert – alle Abstimmungen & Entscheidungswege offen.",
};

export type VerificationFeature =
  | "contribution_level1"
  | "contribution_level2"
  | "vote_basic"
  | "vote_critical";

export const VERIFICATION_REQUIREMENTS: Record<VerificationFeature, VerificationLevel> = {
  contribution_level1: "email",
  contribution_level2: "soft",
  vote_basic: "email",
  vote_critical: "strong",
};

export function meetsVerificationLevel(
  current: VerificationLevel,
  minimum: VerificationLevel,
): boolean {
  return VERIFICATION_LEVEL_ORDER[current] >= VERIFICATION_LEVEL_ORDER[minimum];
}
