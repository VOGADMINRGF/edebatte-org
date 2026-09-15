export type ProfessionalServiceId =
  | "decision-dossier"
  | "decision-dossier-pilot"
  | "topic-intelligence"
  | "topic-intelligence-pro"
  | "white-label";

export type ProfessionalService = {
  id: ProfessionalServiceId;
  name: { de: string; en: string };
  shortDescription: { de: string; en: string };
  outcome: { de: string; en: string };
  price: {
    amountEur: number;
    billing: "one_time" | "monthly";
    from: boolean;
  };
  bestFor: { de: string; en: string };
  href: string;
  inquiryHref: string;
  featured?: boolean;
};

export const PROFESSIONAL_SERVICE_PACKAGING = {
  currency: "EUR",
  checkoutIsAvailable: false,
  fulfillmentMode: "manual_reviewed_service",
  publishedPilotPricesAreAvailable: true,
  evidenceStandardDependsOnPrice: false,
  factsOrTruthAreNeverPaywalledByQualityTier: true,
  pricingPaysFor: [
    "scope",
    "structured_preparation",
    "monitoring",
    "reporting",
    "team_workflow",
    "delivery_and_support",
  ],
} as const;

export const PROFESSIONAL_SERVICES: readonly ProfessionalService[] = [
  {
    id: "decision-dossier",
    name: { de: "Decision Dossier", en: "Decision Dossier" },
    shortDescription: {
      de: "Ein komplexes politisches oder gesellschaftliches Thema als nachvollziehbare Entscheidungsgrundlage aufbereiten.",
      en: "Turn a complex political or societal topic into a traceable decision brief.",
    },
    outcome: {
      de: "Ausgangslage, relevante Quellen, Positionen, Alternativen, Auswirkungen, Unsicherheiten und Handlungsoptionen in einer strukturierten Aufbereitung.",
      en: "Context, relevant sources, positions, alternatives, impacts, uncertainties and options in one structured briefing.",
    },
    price: { amountEur: 790, billing: "one_time", from: false },
    bestFor: {
      de: "Einzelthemen, Entscheidungen, Briefings und Pilotfälle",
      en: "Single topics, decisions, briefings and pilot cases",
    },
    href: "/leistungen/decision-dossier",
    inquiryHref: "/kontakt?channel=team&source=professional-services&offer=decision-dossier",
  },
  {
    id: "decision-dossier-pilot",
    name: { de: "3-Dossier-Pilot", en: "3-Dossier Pilot" },
    shortDescription: {
      de: "Drei konkrete Themen gemeinsam testen und daraus einen wiederholbaren Arbeitsprozess für deine Organisation ableiten.",
      en: "Test three real topics and turn them into a repeatable workflow for your organisation.",
    },
    outcome: {
      de: "Drei Decision Dossiers, gemeinsamer Review-Termin und ein klarer Vorschlag für den weiteren Einsatz.",
      en: "Three Decision Dossiers, one joint review and a clear recommendation for continued use.",
    },
    price: { amountEur: 1990, billing: "one_time", from: false },
    bestFor: {
      de: "Verbände, Redaktionen, NGOs, Beratungen und Public-Affairs-Teams",
      en: "Associations, newsrooms, NGOs, consultancies and public-affairs teams",
    },
    href: "/leistungen/decision-dossier#pilot",
    inquiryHref: "/kontakt?channel=team&source=professional-services&offer=decision-dossier-pilot",
    featured: true,
  },
  {
    id: "topic-intelligence",
    name: { de: "Topic Intelligence", en: "Topic Intelligence" },
    shortDescription: {
      de: "Ein politisches oder gesellschaftliches Thema fortlaufend beobachten und Veränderungen strukturiert einordnen.",
      en: "Continuously monitor a political or societal topic and structure meaningful changes.",
    },
    outcome: {
      de: "Laufender Themenstand mit neuen Quellen, Positionen, Entwicklungen, Gegenargumenten und offenen Fragen.",
      en: "An evolving topic brief with new sources, positions, developments, counterarguments and open questions.",
    },
    price: { amountEur: 1490, billing: "monthly", from: true },
    bestFor: {
      de: "Ein priorisiertes Thema mit regelmäßigem Informationsbedarf",
      en: "One priority topic requiring regular intelligence",
    },
    href: "/leistungen/topic-intelligence",
    inquiryHref: "/kontakt?channel=team&source=professional-services&offer=topic-intelligence",
  },
  {
    id: "topic-intelligence-pro",
    name: { de: "Topic Intelligence Pro", en: "Topic Intelligence Pro" },
    shortDescription: {
      de: "Mehrere Themen, vertiefte Auswertung und ein professioneller Arbeitsraum für Teams.",
      en: "Multiple topics, deeper analysis and a professional team workflow.",
    },
    outcome: {
      de: "Mehrere priorisierte Themen, regelmäßige Updates, Exporte und abgestimmte Team-Auswertung.",
      en: "Multiple priority topics, recurring updates, exports and coordinated team review.",
    },
    price: { amountEur: 2990, billing: "monthly", from: true },
    bestFor: {
      de: "Organisationen mit wiederkehrendem Research- und Entscheidungsbedarf",
      en: "Organisations with recurring research and decision-support needs",
    },
    href: "/leistungen/topic-intelligence#pro",
    inquiryHref: "/kontakt?channel=team&source=professional-services&offer=topic-intelligence-pro",
  },
  {
    id: "white-label",
    name: { de: "Redaktion / Agentur / White Label", en: "Newsroom / Agency / White Label" },
    shortDescription: {
      de: "eDebatte als strukturierte Analyse- und Beteiligungsleistung in bestehende Arbeitsabläufe integrieren.",
      en: "Integrate eDebatte's structured analysis and participation capability into existing workflows.",
    },
    outcome: {
      de: "Individuell abgestimmter Themenumfang, Workflows, Exporte und Marken-/Partnerintegration.",
      en: "Custom topic scope, workflows, exports and brand/partner integration.",
    },
    price: { amountEur: 4900, billing: "monthly", from: true },
    bestFor: {
      de: "Redaktionen, Agenturen, größere Verbände und professionelle Partner",
      en: "Newsrooms, agencies, larger associations and professional partners",
    },
    href: "/leistungen/organisationen",
    inquiryHref: "/kontakt?channel=team&source=professional-services&offer=white-label",
  },
] as const;

export function formatProfessionalServicePrice(
  service: ProfessionalService,
  locale: "de" | "en" = "de",
): string {
  const amount = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: PROFESSIONAL_SERVICE_PACKAGING.currency,
    maximumFractionDigits: 0,
  }).format(service.price.amountEur);

  const prefix = service.price.from ? (locale === "de" ? "ab " : "from ") : "";
  const suffix = service.price.billing === "monthly" ? (locale === "de" ? " / Monat" : " / month") : "";
  return `${prefix}${amount}${suffix}`;
}
