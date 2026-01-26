export type BillingInterval = "month" | "year";

export type VOGMembershipPlan = {
  id: "vog-membership";
  label: string;
  description: string;
  suggestedPerPersonPerMonth: number;
};

export type EDebattePlanId = "edb-basis" | "edb-start" | "edb-pro";

export type EDebattePlan = {
  id: EDebattePlanId;
  label: string;
  description: string;
  listPrice: {
    amount: number;
    interval: BillingInterval;
  };
  /**
   * Hilfsflag für UI/Anzeige – z. B. Badge „kostenfrei“,
   * Rabattberechnung ignoriert freie Pakete automatisch.
   */
  isFree?: boolean;
};

export const VOG_MEMBERSHIP_PLAN: VOGMembershipPlan = {
  id: "vog-membership",
  label: "eDebatte-Mitgliedschaft",
  description:
    "Trägt den Aufbau und Betrieb der weltweiten Entscheidungsstruktur – unabhängig von Stiftungen, Großvermögen oder staatlichen Förderprogrammen.",
  suggestedPerPersonPerMonth: 5.63,
};

export const EDEBATTE_PLANS: EDebattePlan[] = [
  {
    id: "edb-basis",
    label: "eDebatte Basis",
    description:
    "Kostenfreier Einstieg: Inhalte ansehen, swipen, Community kennenlernen. 1 eigener Beitrag je 100 Swipes, passive Teilnahme an Streams – ohne laufende Gebühren (ggf. mit gelegentlicher Werbung).",
    listPrice: { amount: 0, interval: "month" },
    isFree: true,
  },
  {
    id: "edb-start",
    label: "eDebatte Start",
    description:
    "Für alle, die eDebatte regelmäßig nutzen und sich in vielen Themen aktiv einbringen wollen – mit Abstimmungen, Diskussionen und Streams.",
    listPrice: { amount: 9.9, interval: "month" },
  },
  {
    id: "edb-pro",
    label: "eDebatte Pro",
    description:
    "Für Vielnutzer:innen, Initiativen und Organisationen: erweiterte Kontingente, nahezu unbegrenzter Zugang zu Formaten und bevorzugter Zugang zu neuen Funktionen und Beta-Features.",



    listPrice: { amount: 29, interval: "month" },
  },
];
