import type {
  MarketingAsset,
  MarketingBrandProfile,
  MarketingCampaign,
  MarketingDistributionRecord,
  MarketingEvidenceRef,
  MarketingOpportunity,
  MarketingRegistry,
} from "./contracts";
import { MarketingRegistrySchema } from "./contracts";
import {
  resolveCanonicalMarketingBrandProfile,
  type MarketingPublicBrand,
} from "@/features/marketing/multibrand/brandRoutingContract";

const CREATED_AT = "2026-07-26T16:20:00+02:00";
const UPDATED_AT = "2026-08-24T10:24:00+02:00";

function repositoryEvidence(ref: string, note: string): MarketingEvidenceRef {
  return {
    type: "repository_file",
    ref,
    status: "verified",
    verifiedAt: UPDATED_AT,
    note,
  };
}

function decisionEvidence(ref: string, note: string): MarketingEvidenceRef {
  return {
    type: "decision_contract",
    ref,
    status: "verified",
    verifiedAt: UPDATED_AT,
    note,
  };
}

const opportunities: MarketingOpportunity[] = [
  {
    id: "MOP-EDB-01",
    title: "eDebatte Produktversprechen erklären",
    summary:
      "Das nachvollziehbare Zusammenspiel aus Quellen, Positionen, offenen Fragen und Beteiligungswegen als Kernnutzen von eDebatte erklären.",
    sourceType: "feature",
    sourceRef: "docs/marketing/campaigns/campaign-plan-2026.md#kampagne-cam-edb-01--warum-edebatte",
    marketability: "proof_required",
    status: "accepted",
    audienceKeys: ["citizens", "editorial-teams", "initiatives"],
    evidence: [
      repositoryEvidence(
        "docs/marketing/campaigns/campaign-plan-2026.md",
        "Kanonischer Kampagnenplan mit Produktversprechen und Pflichtbelegen.",
      ),
      repositoryEvidence(
        "docs/marketing/brand/edebatte-marketing-language.md",
        "Verbindliche Sprach- und Claim-Grenzen.",
      ),
    ],
    routeStatus: "verified",
    productProofStatus: "partial",
    ctaStatus: "verified",
    blockerKeys: ["real-product-screens-required"],
    campaignIds: ["CAM-EDB-01"],
    assetIds: ["MAS-EDB-ONEPAGER-01", "MAS-EDB-PITCHDECK-01"],
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "MOP-CONTENT-02",
    title: "Debattenstand als wiederkehrendes Format",
    summary:
      "Einen regelmäßig geprüften Debattenstand als verständliches Content- und Einstiegformat etablieren.",
    sourceType: "content_development",
    sourceRef: "docs/marketing/campaigns/campaign-plan-2026.md#kampagne-cam-content-02--debattenstand-der-woche",
    marketability: "review_ready",
    status: "accepted",
    audienceKeys: ["public", "community"],
    evidence: [
      repositoryEvidence(
        "docs/marketing/campaigns/campaign-plan-2026.md",
        "Format, Nicht-Ziele und Review-Grenzen sind dokumentiert.",
      ),
    ],
    routeStatus: "verified",
    productProofStatus: "verified",
    ctaStatus: "verified",
    blockerKeys: [],
    campaignIds: ["CAM-CONTENT-02"],
    assetIds: ["MAS-CONTENT-CAROUSEL-01"],
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "MOP-VOXY-03",
    title: "Voxy als Guide und Einordner",
    summary:
      "Voxy erklärt einzelne Produktlogiken und Debattenstände, ohne eine eigene Fakten- oder Produktwahrheit zu erzeugen.",
    sourceType: "content_development",
    sourceRef: "docs/marketing/social/content-and-video-system.md",
    marketability: "review_ready",
    status: "accepted",
    audienceKeys: ["public", "social-audiences"],
    evidence: [
      repositoryEvidence(
        "apps/web/public/brand/voxy/manifest.json",
        "Kanonische Voxy-Assets und Varianten.",
      ),
      repositoryEvidence(
        "docs/marketing/social/content-and-video-system.md",
        "Formate, Storyboards und Review-Grenzen.",
      ),
    ],
    routeStatus: "verified",
    productProofStatus: "verified",
    ctaStatus: "verified",
    blockerKeys: [],
    campaignIds: ["CAM-VOXY-03"],
    assetIds: ["MAS-VOXY-SCRIPT-01"],
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "MOP-LANG-05",
    title: "Eine Debatte in mehreren Sprachen",
    summary:
      "Original-, Lese-, Bedien- und Ausgabesprachen getrennt und nachvollziehbar als Produkt- und Kampagnennutzen erklären.",
    sourceType: "feature",
    sourceRef: "docs/E150/MARKETING-REGIONAL-CIVIC-OPPORTUNITY-AGENT-01_DECISIONS_2026-07-26.md",
    marketability: "proof_required",
    status: "qualified",
    audienceKeys: ["multilingual-users", "international-communities"],
    evidence: [
      decisionEvidence(
        "docs/E150/MARKETING-REGIONAL-CIVIC-OPPORTUNITY-AGENT-01_DECISIONS_2026-07-26.md",
        "Zielvertrag für regionale und mehrsprachige Agentenlogik.",
      ),
    ],
    routeStatus: "concept",
    productProofStatus: "partial",
    ctaStatus: "needs_routing_decision",
    blockerKeys: ["runtime-proof-required", "translation-review-required"],
    campaignIds: ["CAM-LANG-05"],
    assetIds: [],
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "MOP-REGIONAL-AGENT-01",
    title: "Regionale Themen- und Kampagnenchancen erkennen",
    summary:
      "Admin-gesteuerte regionale Recherche, Beteiligungseignung und Marketingempfehlungen als kontrollierten Operator-Workflow aufbauen.",
    sourceType: "feature",
    sourceRef: "docs/marketing/agent-playbooks/regional-civic-campaign-operator.md",
    marketability: "concept_only",
    status: "qualified",
    audienceKeys: ["operators", "municipalities", "initiatives"],
    evidence: [
      decisionEvidence(
        "docs/E150/MARKETING-REGIONAL-CIVIC-OPPORTUNITY-AGENT-01_DECISIONS_2026-07-26.md",
        "Decision-Contract; Runtime und externe Suche sind noch nicht umgesetzt.",
      ),
    ],
    routeStatus: "concept",
    productProofStatus: "missing",
    ctaStatus: "missing",
    blockerKeys: ["registry-readmodel-required", "source-provider-decision-required"],
    campaignIds: [],
    assetIds: [],
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "MOP-WHITELABEL-13",
    title: "Kontrollierte White-Label-Kommunikation",
    summary:
      "Freigegebene Kommunikations- und Kampagnenformate im eigenen oder gemeinsamen Markenauftritt ermöglichen, ohne Quellen-, Review- oder Governance-Wahrheit zu verändern.",
    sourceType: "partner",
    sourceRef: "docs/marketing/white-label/brand-profile-contract.md",
    marketability: "concept_only",
    status: "qualified",
    audienceKeys: ["municipalities", "associations", "organizations"],
    evidence: [
      repositoryEvidence(
        "docs/marketing/white-label/brand-profile-contract.md",
        "Verbindliche Brand- und Governance-Grenzen.",
      ),
    ],
    routeStatus: "concept",
    productProofStatus: "missing",
    ctaStatus: "needs_routing_decision",
    blockerKeys: ["offer-decision-required", "legal-review-required"],
    campaignIds: ["CAM-WHITE-LABEL-13"],
    assetIds: [],
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "MOP-V4G-14",
    title: "Vote4Gov Global Governance Lab",
    summary:
      "Demokratische und administrative Strukturen international vergleichbar machen und Alternativmodelle als klar gekennzeichnete Hypothesen diskutierbar aufbereiten.",
    sourceType: "content_development",
    sourceRef: "docs/E150/MARKETING-MULTIBRAND-CONTROL-PLANE-01_2026-08-24.md",
    marketability: "concept_only",
    status: "qualified",
    audienceKeys: ["public", "civic-tech", "research"],
    evidence: [
      decisionEvidence(
        "docs/E150/MARKETING-MULTIBRAND-CONTROL-PLANE-01_2026-08-24.md",
        "Drei-Marken- und Governance-Lab-Zielbild; reale Kampagnenassets bleiben review-pflichtig.",
      ),
    ],
    routeStatus: "concept",
    productProofStatus: "partial",
    ctaStatus: "verified",
    blockerKeys: ["vote4gov-brand-approval-required"],
    campaignIds: ["CAM-V4G-14"],
    assetIds: [],
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: UPDATED_AT,
    updatedAt: UPDATED_AT,
  },
];

const campaigns: MarketingCampaign[] = [
  campaign("CAM-EDB-01", "warum-edebatte", "Warum eDebatte?", "Bürger, Redaktionen und Initiativen verstehen Problem, Nutzen und Grenzen von eDebatte.", "planned", "product_proof_required", ["MOP-EDB-01"], ["citizens", "editorial-teams", "initiatives"], "eDebatte entdecken", "https://www.edebatte.org/", "verified", ["MAS-EDB-ONEPAGER-01", "MAS-EDB-PITCHDECK-01"], ["real-product-screens-required"]),
  campaign("CAM-CONTENT-02", "debattenstand-der-woche", "Debattenstand der Woche", "Wiederkehrender, manuell geprüfter Überblick zu Quellen, Positionen und offenen Fragen.", "planned", "ready", ["MOP-CONTENT-02"], ["public", "community"], "Debattenstand ansehen", "https://www.edebatte.org/", "verified", ["MAS-CONTENT-CAROUSEL-01"], []),
  campaign("CAM-VOXY-03", "voxy-erklaert", "Voxy erklärt", "Voxy erklärt einzelne Themen und Produktlogiken in kurzen, review-first Formaten.", "planned", "ready", ["MOP-VOXY-03"], ["public", "social-audiences"], "Thema mit Voxy verstehen", "https://www.edebatte.org/", "verified", ["MAS-VOXY-SCRIPT-01"], []),
  campaign("CAM-SOURCE-04", "quellen-statt-schlagzeilen", "Quellen statt Schlagzeilen", "Quellenlage, Gegenpositionen und offene Fragen nachvollziehbar machen.", "idea", "product_proof_required", [], ["citizens", "media", "science"], "Quellenlage prüfen", null, "needs_routing_decision", [], ["real-source-surface-required"]),
  campaign("CAM-LANG-05", "eine-debatte-mehrere-sprachen", "Eine Debatte, mehrere Sprachen", "Sprachbrücke mit Originalerhalt für internationale und mehrsprachige Nutzer erklären.", "blocked", "runtime_proof_required", ["MOP-LANG-05"], ["multilingual-users", "international-communities"], "In eigener Sprache mitlesen", null, "needs_routing_decision", [], ["runtime-proof-required", "translation-review-required"]),
  campaign("CAM-MEDIA-06", "medienpartner-werden", "Medienpartner werden", "Redaktionen, Podcasts und Fachmedien über Partnerkategorien und Einflussgrenzen informieren.", "qualified", "offer_decision_required", [], ["media", "editorial-teams"], "Partnerschaft prüfen", null, "needs_routing_decision", ["MAS-PARTNER-KIT-01"], ["offer-decision-required", "routing-decision-required"]),
  campaign("CAM-SCIENCE-07", "wissenschaftspartner-werden", "Wissenschaftspartner werden", "Evidenz, Expertise und Transparenz ohne inhaltliche Sonderrechte verbinden.", "qualified", "offer_decision_required", [], ["science", "research-institutes"], "Kooperation besprechen", null, "needs_routing_decision", [], ["offer-decision-required", "routing-decision-required"]),
  campaign("CAM-TECH-08", "technologiepartner-werden", "Technologiepartner werden", "Technische Unterstützung und offene Infrastruktur ohne Einflussrechte erklären.", "qualified", "offer_decision_required", [], ["technology-partners", "open-source-partners"], "Technologiepartnerschaft prüfen", null, "needs_routing_decision", [], ["offer-decision-required", "routing-decision-required"]),
  campaign("CAM-MUNI-09", "beteiligung-nachvollziehbar-organisieren", "Beteiligung nachvollziehbar organisieren", "Kommunen und Verwaltungen strukturierte Beteiligung, Dossiers und Review zeigen.", "blocked", "product_proof_required", [], ["municipalities", "public-administration"], "Anwendungsfall besprechen", null, "needs_routing_decision", [], ["product-proof-required", "routing-decision-required"]),
  campaign("CAM-COMMUNITY-10", "anliegen-anschlussfaehig-machen", "Macht euer Anliegen anschlussfähig", "Initiativen, Vereine und NGOs beim Strukturieren eines Anliegens unterstützen.", "idea", "product_proof_required", [], ["initiatives", "associations", "ngos"], "Anliegen vorbereiten", null, "needs_routing_decision", [], ["product-proof-required"]),
  campaign("CAM-VOG-11", "voiceopengov-mitgliedschaft-verstehen", "VoiceOpenGov-Mitgliedschaft verstehen", "Persönliche Mitgliedschaft, Mitwirkung und Verantwortung innerhalb der bestätigten Grenzen erklären.", "qualified", "offer_decision_required", [], ["individual-members", "mission-supporters"], "Membership-Modell kennenlernen", "https://voiceopengov.org/", "verified", ["MAS-VOG-MEMBERSHIP-01"], ["offer-decision-required", "legal-review-required"], "voiceopengov"),
  campaign("CAM-VOG-PARTNER-12", "partner-fuer-transparente-debatten", "Partner für transparente Debatten", "Partnerkategorien, Beiträge und klare Einflussgrenzen erläutern.", "qualified", "offer_decision_required", [], ["organizations", "partners"], "Partnerkategorien kennenlernen", "https://voiceopengov.org/", "verified", ["MAS-PARTNER-KIT-01"], ["offer-decision-required", "legal-review-required"], "voiceopengov"),
  campaign("CAM-WHITE-LABEL-13", "beteiligung-im-eigenen-auftritt", "Beteiligung im eigenen Auftritt", "Kontrollierte Co-Branding- und White-Label-Ausgaben als späteren Anwendungsfall erklären.", "idea", "offer_decision_required", ["MOP-WHITELABEL-13"], ["municipalities", "associations", "organizations"], "White-Label-Anwendungsfall prüfen", null, "needs_routing_decision", [], ["offer-decision-required", "legal-review-required", "tenant-model-required"]),
  campaign("CAM-V4G-14", "vote4gov-governance-lab", "Vote4Gov · Global Governance Lab", "Internationale Governance-Strukturen vergleichen, Alternativmodelle prüfen und Hypothesen transparent von Evidenz trennen.", "qualified", "governance_decision_required", ["MOP-V4G-14"], ["public", "civic-tech", "research"], "Systemvergleich ansehen", "https://vote4gov.eu/", "verified", [], ["vote4gov-brand-approval-required"], "vote4gov"),
];

function campaign(
  id: string,
  key: string,
  title: string,
  description: string,
  status: MarketingCampaign["status"],
  readiness: MarketingCampaign["readiness"],
  opportunityIds: string[],
  audienceKeys: string[],
  ctaLabel: string,
  ctaUrl: string | null,
  ctaStatus: MarketingCampaign["primaryCta"]["status"],
  assetIds: string[],
  blockerKeys: string[],
  brand: MarketingPublicBrand = "edebatte",
): MarketingCampaign {
  return {
    id,
    key,
    title,
    description,
    status,
    readiness,
    opportunityIds,
    brandProfileId: resolveCanonicalMarketingBrandProfile(brand).brandProfileId,
    audienceKeys,
    primaryCta: { label: ctaLabel, url: ctaUrl, status: ctaStatus },
    assetIds,
    blockerKeys,
    reviewRequired: true,
    autoPublishEligible: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

const assets: MarketingAsset[] = [
  asset("MAS-EDB-ONEPAGER-01", "CAM-EDB-01", "onepager", "Warum eDebatte? · Onepager", "draft", "docs/marketing/templates/onepager-template.md"),
  asset("MAS-EDB-PITCHDECK-01", "CAM-EDB-01", "pitchdeck", "Warum eDebatte? · Pitchdeck", "draft", "docs/marketing/templates/pitchdeck-template.md"),
  asset("MAS-CONTENT-CAROUSEL-01", "CAM-CONTENT-02", "carousel", "Debattenstand der Woche · Carousel", "review_ready", "docs/marketing/social/content-and-video-system.md"),
  asset("MAS-VOXY-SCRIPT-01", "CAM-VOXY-03", "video_script", "Voxy erklärt · Video-Storyboard", "review_ready", "docs/marketing/social/content-and-video-system.md"),
  asset("MAS-PARTNER-KIT-01", "CAM-VOG-PARTNER-12", "partner_kit", "VoiceOpenGov · Partner-Kit", "draft", "docs/marketing/voiceopengov/membership-partner-marketing.md"),
  asset("MAS-VOG-MEMBERSHIP-01", "CAM-VOG-11", "landing_copy", "VoiceOpenGov · Membership Copy", "draft", "docs/marketing/voiceopengov/membership-partner-marketing.md"),
];

function asset(
  id: string,
  campaignId: string,
  assetType: MarketingAsset["assetType"],
  title: string,
  status: MarketingAsset["status"],
  sourcePath: string,
): MarketingAsset {
  const ownerCampaign = campaigns.find((candidate) => candidate.id === campaignId);
  if (!ownerCampaign) throw new Error(`marketing_asset_campaign_missing:${campaignId}`);

  return {
    id,
    campaignId,
    brandProfileId: ownerCampaign.brandProfileId,
    assetType,
    title,
    status,
    locale: "de-DE",
    originalLocale: "de-DE",
    translationStatus: "original",
    version: 1,
    sourcePath,
    exportPath: null,
    publicPath: null,
    evidence: [repositoryEvidence(sourcePath, "Versionierte Arbeitsquelle im Repository.")],
    reviewRequired: true,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  };
}

const brandProfiles: MarketingBrandProfile[] = [
  {
    id: "brand-edebatte-light",
    key: "edebatte-light",
    mode: "edebatte",
    displayName: "eDebatte Light",
    status: "review_ready",
    version: 1,
    locales: ["de-DE", "en-GB"],
    logoStatus: "approved",
    tokenStatus: "complete",
    legalTargetStatus: "missing",
    voxyMode: "canonical",
    sourcePath: "docs/marketing/white-label/profiles/edebatte-light.brand-profile.json",
    updatedAt: "2026-07-26T16:20:00+02:00",
  },
  {
    id: "brand-edebatte-dark",
    key: "edebatte-dark",
    mode: "edebatte",
    displayName: "eDebatte Dark",
    status: "review_ready",
    version: 1,
    locales: ["de-DE", "en-GB"],
    logoStatus: "approved",
    tokenStatus: "complete",
    legalTargetStatus: "missing",
    voxyMode: "canonical",
    sourcePath: "docs/marketing/white-label/profiles/edebatte-dark.brand-profile.json",
    updatedAt: "2026-07-26T16:20:00+02:00",
  },
  {
    id: "brand-voiceopengov",
    key: "voiceopengov",
    mode: "voiceopengov",
    displayName: "VoiceOpenGov",
    status: "draft",
    version: 1,
    locales: ["de-DE", "en"],
    logoStatus: "partial",
    tokenStatus: "partial",
    legalTargetStatus: "missing",
    voxyMode: "contextual",
    sourcePath: "docs/marketing/white-label/profiles/voiceopengov.brand-profile.json",
    updatedAt: UPDATED_AT,
  },
  {
    id: "brand-vote4gov",
    key: "vote4gov",
    mode: "vote4gov",
    displayName: "Vote4Gov",
    status: "draft",
    version: 1,
    locales: ["de-DE", "en"],
    logoStatus: "partial",
    tokenStatus: "partial",
    legalTargetStatus: "missing",
    voxyMode: "vote4gov_context",
    sourcePath: "docs/marketing/white-label/profiles/vote4gov.brand-profile.json",
    updatedAt: UPDATED_AT,
  },
];

const distributionRecords: MarketingDistributionRecord[] = [];

const REGISTRY_SOURCE_PATHS = [
  "docs/marketing/campaigns/campaign-plan-2026.md",
  "docs/marketing/admin/marketing-control-plane.md",
  "docs/marketing/admin/multibrand-operator-model.md",
  "docs/marketing/brand/three-brand-content-boundary.md",
  "docs/marketing/schemas/marketing-control-plane.schema.json",
  "docs/marketing/white-label/profiles/edebatte-light.brand-profile.json",
  "docs/marketing/white-label/profiles/edebatte-dark.brand-profile.json",
  "docs/marketing/white-label/profiles/voiceopengov.brand-profile.json",
  "docs/marketing/white-label/profiles/vote4gov.brand-profile.json",
  "docs/E150/MARKETING-CONTROL-PLANE-01_DECISIONS_2026-07-26.md",
  "docs/E150/MARKETING-CAMPAIGN-ANALYTICS-01_DECISIONS_2026-07-26.md",
  "docs/E150/MARKETING-REGIONAL-CIVIC-OPPORTUNITY-AGENT-01_DECISIONS_2026-07-26.md",
  "docs/E150/MARKETING-MULTIBRAND-CONTROL-PLANE-01_2026-08-24.md",
] as const;

export function getMarketingRegistry(): MarketingRegistry {
  return MarketingRegistrySchema.parse({
    schemaVersion: "1.0.0",
    mode: "read_only",
    generatedAt: UPDATED_AT,
    sources: [...REGISTRY_SOURCE_PATHS],
    opportunities,
    campaigns,
    assets,
    brandProfiles,
    distributionRecords,
  });
}
