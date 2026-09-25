export const GO_TO_MARKET_PACKAGING = {
  freeParticipantGuideline: 30,
  freeUseIsAvailable: true,
  guidelineIsHardLimit: false,
  checkoutIsAvailable: false,
  publishedPricesAreAvailable: false,
  documentAnalysis: {
    internalCostUnit: {
      label: "interne Analyse-Einheit",
      unitSizeChars: 60_000,
      purpose: "provider_cost_control",
      publicPricingMetric: false,
    },
    commercialCredit: {
      label: "Voxy-Credit",
      purpose: "commercial_value_metering",
      coupledOneToOneToProviderCost: false,
      reusableKnowledgeStillChargeable: true,
      topicExtensionStillChargeable: true,
    },
    singleUnitIncludedInEntryFlow: true,
    largeDocumentApprovalFromInternalUnits: 2,
    pricingModel: "included_quota_plus_topup",
    publicTokenPricing: false,
    publicPerPagePricing: false,
    publicPerCharacterPricing: false,
    checkoutIsAvailable: false,
    publishedTopUpPriceIsAvailable: false,
  },
} as const;

export const GO_TO_MARKET_TEMPLATE_IDS = [
  "member-priorities",
  "project-ideas",
  "option-comparison",
  "opinion-check",
  "event-planning",
] as const;

export type GoToMarketTemplateId = (typeof GO_TO_MARKET_TEMPLATE_IDS)[number];

export type GoToMarketTemplate = {
  id: GoToMarketTemplateId;
  title: { de: string; en: string };
  description: { de: string; en: string };
  question: { de: string; en: string };
  options: {
    de: readonly [string, string, string];
    en: readonly [string, string, string];
  };
};

export const GO_TO_MARKET_TEMPLATES: readonly GoToMarketTemplate[] = [
  {
    id: "member-priorities",
    title: { de: "Prioritäten gemeinsam klären", en: "Set priorities together" },
    description: {
      de: "Gemeinsam herausfinden, was als Nächstes wichtig ist.",
      en: "Decide together what matters next.",
    },
    question: {
      de: "Welches Thema sollten wir als Nächstes angehen?",
      en: "Which topic should we tackle next?",
    },
    options: {
      de: ["Menschen erreichen", "Angebot verbessern", "Zusammenarbeit stärken"],
      en: ["Reach more people", "Improve the offer", "Strengthen collaboration"],
    },
  },
  {
    id: "project-ideas",
    title: { de: "Projektideen sammeln", en: "Collect project ideas" },
    description: {
      de: "Ideen sichtbar machen und gemeinsam priorisieren.",
      en: "Make ideas visible and set priorities together.",
    },
    question: {
      de: "Welche Projektidee sollten wir zuerst weiterverfolgen?",
      en: "Which project idea should we pursue first?",
    },
    options: {
      de: ["Lokale Aktion", "Informationsformat", "Gemeinsames Projekt"],
      en: ["Local action", "Information format", "Joint project"],
    },
  },
  {
    id: "option-comparison",
    title: { de: "Optionen vergleichen", en: "Compare options" },
    description: {
      de: "Mehrere Wege verständlich zur Auswahl stellen.",
      en: "Present several paths in a clear choice.",
    },
    question: {
      de: "Welche Option passt am besten zu unserem gemeinsamen Ziel?",
      en: "Which option best supports our shared goal?",
    },
    options: {
      de: ["Option A", "Option B", "Weitere Option prüfen"],
      en: ["Option A", "Option B", "Explore another option"],
    },
  },
  {
    id: "opinion-check",
    title: { de: "Stimmungsbild einholen", en: "Check the mood" },
    description: {
      de: "Positionen erkennen, bevor eine Entscheidung fällt.",
      en: "Understand positions before a decision is made.",
    },
    question: {
      de: "Wie stehen die Beteiligten zu diesem Vorschlag?",
      en: "How do participants feel about this proposal?",
    },
    options: {
      de: ["Dafür", "Noch offen", "Dagegen"],
      en: ["In favour", "Still open", "Against"],
    },
  },
  {
    id: "event-planning",
    title: { de: "Termin oder Veranstaltung", en: "Date or event" },
    description: {
      de: "Ein gemeinsames Vorhaben konkret vorbereiten.",
      en: "Prepare a shared activity together.",
    },
    question: {
      de: "Welcher Vorschlag eignet sich am besten für die nächste Veranstaltung?",
      en: "Which proposal works best for the next event?",
    },
    options: {
      de: ["Workshop", "Offenes Treffen", "Aktionstag"],
      en: ["Workshop", "Open meeting", "Action day"],
    },
  },
] as const;

export function getGoToMarketTemplate(
  templateId: string | null | undefined,
): GoToMarketTemplate | null {
  if (!templateId) return null;
  return GO_TO_MARKET_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function buildFreeBallotStartHref(
  templateId?: GoToMarketTemplateId,
  source = "homepage",
): string {
  const search = new URLSearchParams({ gtm: "1", source });
  if (templateId) search.set("template", templateId);
  return `/runden/new?${search.toString()}`;
}