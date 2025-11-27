import type { AccessTier } from "./types";

export type AccessTierConfig = {
  id: AccessTier;
  label: string;
  kind: "public" | "citizen" | "institution" | "staff";
  description: string;
};

export const ACCESS_TIERS: AccessTierConfig[] = [
  {
    id: "public",
    label: "Öffentlich",
    kind: "public",
    description: "Lesender Zugriff ohne Account.",
  },
  {
    id: "citizenBasic",
    label: "Citizen Basic",
    kind: "citizen",
    description: "Registrierte Basis-Nutzer:innen.",
  },
  {
    id: "citizenPremium",
    label: "Citizen Premium",
    kind: "citizen",
    description: "Engagierte Citizen mit erweiterten Rechten.",
  },
  {
    id: "citizenPro",
    label: "Citizen Pro",
    kind: "citizen",
    description: "Pro-Nutzer:innen mit Hosting-Funktionen.",
  },
  {
    id: "citizenUltra",
    label: "Citizen Ultra",
    kind: "citizen",
    description: "Umfangreiche Rechte für intensive Nutzung.",
  },
  {
    id: "institutionBasic",
    label: "Institution Basic",
    kind: "institution",
    description: "Organisationen mit Lesezugriff.",
  },
  {
    id: "institutionPremium",
    label: "Institution Premium",
    kind: "institution",
    description: "Organisationen mit erweiterten Dashboards.",
  },
  {
    id: "staff",
    label: "Staff",
    kind: "staff",
    description: "Interne Team-Rollen.",
  },
];

export const ACCESS_TIER_IDS = ACCESS_TIERS.map((tier) => tier.id);
