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
    label: "eDebatte Free",
    description: "Kostenfreier Einstieg für Beteiligung und eigene Anliegen.",
    includedPerMonth: included(3, 0),
    earnRules: DEFAULT_EARN_RULES,
  },
  citizenPremium: {
    id: "citizenPremium",
    label: "eDebatte Plus",
    description: "Mehr Beiträge, Prüf- und Analysefunktionen für regelmäßige Nutzung.",
    monthlyFeeCents: 799,
    includedPerMonth: included(12, 3),
    earnRules: DEFAULT_EARN_RULES,
  },
  citizenPro: {
    id: "citizenPro",
    label: "eDebatte Pro",
    description: "Vertiefte Analyse, Recherche und Ausarbeitung mit erweitertem Kontingent.",
    monthlyFeeCents: 1999,
    includedPerMonth: included(30, 8),
    earnRules: DEFAULT_EARN_RULES,
  },
  citizenUltra: {
    id: "citizenUltra",
    label: "Citizen Ultra",
    description: "Power-User mit maximalem Zugang und Priority-Support.",
    monthlyFeeCents: 4900,
    includedPerMonth: included(80, 20),
    earnRules: DEFAULT_EARN_RULES,
    notes: "Nicht Teil des aktuellen öffentlichen Self-Service-Pricings.",
  },
  institutionBasic: {
    id: "institutionBasic",
    label: "Institution Basic",
    description: "Kommunen / NGOs mit begrenzten Seats.",
    monthlyFeeCents: 7000,
    includedPerMonth: included(20, 10),
    earnRules: DEFAULT_EARN_RULES,
    notes: "Institutionelle Konditionen werden individuell vereinbart.",
  },
  institutionPremium: {
    id: "institutionPremium",
    label: "Institution Premium",
    description: "Große Verwaltungen, Medienhäuser, Verbände.",
    monthlyFeeCents: 18000,
    includedPerMonth: included(60, 30),
    earnRules: DEFAULT_EARN_RULES,
    notes: "Institutionelle Konditionen werden individuell vereinbart.",
  },
  staff: {
    id: "staff",
    label: "Team / Moderation",
    description: "Interne Rollen mit unbegrenztem Zugriff.",
    includedPerMonth: included(9999, 9999),
  },
};

export type { AccessTier, AccessTierConfig, ContributionLevel, EarnRule } from "./types";
