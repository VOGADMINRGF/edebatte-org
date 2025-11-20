import type { AccessTier, AccessTierConfig, ContributionLevel, EarnRule } from "./types";

export const DEFAULT_EARN_RULES: EarnRule[] = [
  { level: "level1", swipesPerCredit: 100 },
  { level: "level2", swipesPerCredit: 500 },
];

const included = (level1: number, level2 = 0): Partial<Record<ContributionLevel, number>> => ({
  level1,
  ...(level2 ? { level2 } : {}),
});

export const ACCESS_TIER_CONFIG: Record<AccessTier, AccessTierConfig> = {
  public: {
    id: "public",
    label: "Citizen (free)",
    description: "Lesen & Swipen frei. Ein Test-Beitrag pro Monat möglich.",
    includedPerMonth: included(1),
    earnRules: DEFAULT_EARN_RULES,
  },
  citizenBasic: {
    id: "citizenBasic",
    label: "Citizen Basic",
    description: "Regelmäßig mitdiskutieren, aber ohne Kostenpflicht.",
    includedPerMonth: included(3, 0),
    earnRules: DEFAULT_EARN_RULES,
  },
  citizenPremium: {
    id: "citizenPremium",
    label: "Citizen Premium",
    description: "Mehr Beiträge + Detail-Reports.",
    monthlyFeeCents: 900,
    includedPerMonth: included(12, 3),
    earnRules: DEFAULT_EARN_RULES,
    notes: "Auch Fördermitglieder erhalten diese Features automatisch.",
  },
  institutionBasic: {
    id: "institutionBasic",
    label: "Institution Basic",
    description: "Kommunen / NGOs mit begrenzten Seats.",
    monthlyFeeCents: 7000,
    includedPerMonth: included(20, 10),
    earnRules: DEFAULT_EARN_RULES,
    notes: "Preisbeispiel: ca. 0,90 € pro Einwohner:in/Jahr (min. 2.500 €/Jahr).",
  },
  institutionPremium: {
    id: "institutionPremium",
    label: "Institution Premium",
    description: "Große Verwaltungen, Medienhäuser, Verbände.",
    monthlyFeeCents: 18000,
    includedPerMonth: included(60, 30),
    earnRules: DEFAULT_EARN_RULES,
    notes: "White-Label, API-Zugänge, eigene Moderationsteams.",
  },
  staff: {
    id: "staff",
    label: "Team / Moderation",
    description: "Interne Rollen mit unbegrenztem Zugriff.",
    includedPerMonth: included(9999, 9999),
  },
};
