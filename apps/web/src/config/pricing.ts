export type BillingInterval = "month" | "year";

export type VOGMembershipPlan = {
  id: "vog-membership";
  label: string;
  description: string;
  suggestedPerPersonPerMonth: number;
};

export type EDebattePlanId = "edb-start" | "edb-pro";

export type EDebattePlan = {
  id: EDebattePlanId;
  label: string;
  description: string;
  listPrice: {
    amount: number;
    interval: BillingInterval;
  };
};

export type DiscountRule = {
  id: "member-25";
  label: string;
  description: string;
  percent: number;
  appliesTo: Array<"edebatte" | "merch">;
};

export const VOG_MEMBERSHIP_PLAN: VOGMembershipPlan = {
  id: "vog-membership",
  label: "VoiceOpenGov-Mitgliedschaft",
  description:
    "Trägt den Aufbau und Betrieb der weltweiten Entscheidungsstruktur – unabhängig von Stiftungen, Großvermögen oder staatlichen Förderprogrammen.",
  suggestedPerPersonPerMonth: 5.63,
};

export const EDEBATTE_PLANS: EDebattePlan[] = [
  {
    id: "edb-start",
    label: "eDebatte Start",
    description:
      "Für private Nutzung, kleine Initiativen und lokale Themen – ideal, um eDebatte kennenzulernen.",
    listPrice: { amount: 9.9, interval: "month" },
  },
  {
    id: "edb-pro",
    label: "eDebatte Pro",
    description:
      "Für Redaktionen, Organisationen oder kommunale Projekte mit intensiver Nutzung.",
    listPrice: { amount: 29, interval: "month" },
  },
];

export const MEMBER_DISCOUNT: DiscountRule = {
  id: "member-25",
  label: "25 % Mitgliederrabatt",
  description:
    "VoiceOpenGov-Mitglieder erhalten 25 % Nachlass auf eDebatte-Pakete und den zukünftigen Merchandise-Shop.",
  percent: 25,
  appliesTo: ["edebatte", "merch"],
};

export function calcDiscountedPrice(
  listPrice: number,
  discountPercent: number = MEMBER_DISCOUNT.percent,
): number {
  return Math.round(listPrice * (1 - discountPercent / 100) * 100) / 100;
}
