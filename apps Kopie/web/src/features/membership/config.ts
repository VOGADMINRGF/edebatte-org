import type { MembershipPlan, MembershipProduct } from "./types";

export const MEMBERSHIP_PRESETS: Record<MembershipProduct, number[]> = {
  VOG_PRIVATE: [5.63, 10, 25, 50],
  EDBTT_ORG: [15, 30, 60, 120],
};

export const MEMBERSHIP_PLANS: Record<MembershipProduct, MembershipPlan> = {
  VOG_PRIVATE: {
    product: "VOG_PRIVATE",
    label: "eDebatte Privat",
    description: "1 % von (Haushaltsnetto – Miete), mindestens 5,63 € pro Person.",
    presets: MEMBERSHIP_PRESETS.VOG_PRIVATE,
    minPerPerson: 5.63,
  },
  EDBTT_ORG: {
    product: "EDBTT_ORG",
    label: "eDbtt Teams & Organisationen",
    description: "Transparenz- & Moderationspakete für Teams (Preis pro Zugang).",
    presets: MEMBERSHIP_PRESETS.EDBTT_ORG,
    minPerPerson: 10,
  },
};
