import { z } from "zod";
import {
  Bcp47LocaleSchema,
  OrganizationJurisdictionSchema,
  type OrganizationJurisdiction,
} from "../organization/registryContract";
import type { RegionPublicationVisibilityState } from "./publicationRiskLadder";
import type {
  RegionIntelligenceClusterHint,
  RegionIntelligenceReviewSuggestion,
  RegionIntelligenceSourceAdapterId,
  RegionIntelligenceSuggestionHint,
} from "./intelligence";

export const ORGANIZATION_SOURCE_CONNECTION_TYPES = [
  "website_url",
  "rss_feed",
  "atom_feed",
  "document_url",
  "press_page",
  "meeting_calendar",
  "social_profile_reference",
  "manual_snapshot",
] as const;

const LEGACY_REGION_SOURCE_CONNECTION_TYPES = [
  "manual_source",
  "curated_pilot_source",
  "official_feed",
  "municipal_news",
] as const;

export const REGION_SOURCE_CONNECTION_TYPES = [
  ...ORGANIZATION_SOURCE_CONNECTION_TYPES,
  ...LEGACY_REGION_SOURCE_CONNECTION_TYPES,
] as const;

export const REGION_SOURCE_SNAPSHOT_SEED_KINDS = [
  "configured_region_source",
  "example_seed",
] as const;

export const SOURCE_CONNECTION_STATUSES = [
  "draft",
  "submitted",
  "testing",
  "test_failed",
  "active_review_required",
  "active_limited",
  "paused",
  "revoked",
  "archived",
] as const;

export const SOURCE_CONNECTION_SCOPES = [
  "organization",
  "organization_region",
  "operator_review",
] as const;

export const SOURCE_CONNECTION_TEST_RESULT_STATUSES = [
  "not_run",
  "passed",
  "failed",
  "manual_only",
] as const;

export const SOURCE_SNAPSHOT_REVIEW_STATES = [
  "unreviewed",
  "triaged",
  "attached_to_topic",
  "attached_to_dossier",
  "rejected",
  "archived",
] as const;

export const SOURCE_CONNECTION_AUDIT_EVENT_TYPES = [
  "draft_saved",
  "submitted",
  "testing_started",
  "test_failed",
  "activated_review_required",
  "activated_limited",
  "paused",
  "revoked",
  "archived",
  "snapshot_created",
] as const;

export type SourceConnectionType =
  (typeof ORGANIZATION_SOURCE_CONNECTION_TYPES)[number];
export type RegionSourceConnectionType =
  (typeof REGION_SOURCE_CONNECTION_TYPES)[number];
export type RegionSourceSnapshotSeedKind =
  (typeof REGION_SOURCE_SNAPSHOT_SEED_KINDS)[number];
export type SourceConnectionStatus =
  (typeof SOURCE_CONNECTION_STATUSES)[number];
export type SourceConnectionScope =
  (typeof SOURCE_CONNECTION_SCOPES)[number];
export type SourceConnectionTestResultStatus =
  (typeof SOURCE_CONNECTION_TEST_RESULT_STATUSES)[number];
export type SourceSnapshotReviewState =
  (typeof SOURCE_SNAPSHOT_REVIEW_STATES)[number];
export type SourceConnectionAuditEventType =
  (typeof SOURCE_CONNECTION_AUDIT_EVENT_TYPES)[number];

export type RegionSourceConnectionSampleItem = {
  title: string;
  summary: string;
  url: string | null;
  detectedTopics: string[];
};

export type RegionSourceSnapshotTemplate = {
  id: string;
  label: string;
  mode: "template_only" | "template_plus_explicit_url";
  seedKind: RegionSourceSnapshotSeedKind;
  seedKindLabel: string;
  configuredUrl: string | null;
  isExampleSeed: boolean;
  reviewHint: string;
  noLiveCrawlerClaim: true;
  noScraping: true;
  noDeepSearchAutoCosts: true;
  noAutoPublish: true;
  noPublicOfficial: true;
};

export type SourceConnectionAuditEvent = {
  id: string;
  connectionId: string;
  organizationId: string | null;
  regionId: string;
  actorUserId: string | null;
  eventType: SourceConnectionAuditEventType;
  status: SourceConnectionStatus;
  note: string | null;
  createdAt: string;
  noAutoPublish: true;
  noPublicOfficial: true;
};

export type SourceConnectionTestResult = {
  status: SourceConnectionTestResultStatus;
  checkedAt: string | null;
  summary: string;
  noDeepSearchAutoCosts: true;
  noAutoResearch: true;
};

/**
 * Organization-level source identity. `regionId` is nullable by design so
 * national, supranational and global sources do not need a fabricated local
 * region. Regional runtime consumers use the narrower RegionSourceConnection.
 */
export type OrganizationSourceConnection = {
  id: string;
  regionId: string | null;
  jurisdiction?: OrganizationJurisdiction | null;
  locale?: string | null;
  organizationId?: string | null;
  label: string;
  sourceType: RegionSourceConnectionType;
  status?: SourceConnectionStatus;
  scope?: SourceConnectionScope;
  adapterId: RegionIntelligenceSourceAdapterId;
  url: string | null;
  notes: string | null;
  enabled: boolean;
  sampleItems: RegionSourceConnectionSampleItem[];
  sourceSnapshotTemplate: RegionSourceSnapshotTemplate | null;
  latestTestResult?: SourceConnectionTestResult | null;
  latestSnapshotId?: string | null;
  latestSnapshotAt?: string | null;
  entitlementRequiredScope?: "source_connection";
  operatorReviewRequired?: boolean;
  productionTruth?: boolean;
  auditEvents?: SourceConnectionAuditEvent[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  reviewRequired: true;
  noLiveCrawlerClaim: true;
  noScraping: true;
  noDeepSearchAutoCosts: true;
  noAutoPublish?: true;
  noPublicOfficial?: true;
  noAutoModerationRights?: true;
};

export type RegionSourceConnection = OrganizationSourceConnection & {
  regionId: string;
};

export type RegionSourcePossibleClaim = {
  text: string;
  confidence: number;
  basisLabel: "Titel" | "Zusammenfassung" | "Seitenauszug";
  excerpt: string | null;
  reviewRequired: true;
};

export type RegionSourceEvidenceReference = {
  label: string;
  url: string | null;
  excerpt: string | null;
};

export type RegionSourceSnapshotTemplateResult = RegionSourceSnapshotTemplate & {
  claimCandidates: RegionSourcePossibleClaim[];
  topicCandidates: RegionIntelligenceClusterHint[];
  evidenceHints: RegionSourceEvidenceReference[];
  openQuestions: string[];
};

export type RegionSourceAffectedScope = {
  regionName: string | null;
  detectedPlaces: string[];
  ortsteilHints: string[];
  fachbereichHints: string[];
};

export type RegionSourceReviewTaskSummary = {
  claimCount: number;
  topicClusterCount: number;
  dossierSuggestionCount: number;
  anlassraumSuggestionCount: number;
  openQuestionCount: number;
  evidenceCount: number;
  label: string;
};

export type SourceSnapshot = {
  id: string;
  connectionId: string;
  regionId: string;
  organizationId?: string | null;
  connectionLabel: string;
  sourceType: RegionSourceConnectionType;
  adapterId: RegionIntelligenceSourceAdapterId;
  resultMode: "dry_run";
  title: string;
  summary: string;
  configuredUrl: string | null;
  detectedTopics: string[];
  visibilityState: "internal_review";
  visibilityLabel: string;
  reviewStatus: "needs_review";
  reviewState?: SourceSnapshotReviewState;
  confidence: number;
  sourceSnapshotStatus: "fetched" | "manual_only" | "fetch_failed";
  testResult?: SourceConnectionTestResult;
  sourceSnapshotTitle: string | null;
  sourceSnapshotSummary: string | null;
  sourceSnapshotExcerpt: string | null;
  sourceSnapshotTemplate: RegionSourceSnapshotTemplateResult | null;
  possibleClaims: RegionSourcePossibleClaim[];
  topicClusters: RegionIntelligenceClusterHint[];
  dossierSuggestions: RegionIntelligenceSuggestionHint[];
  anlassraumSuggestions: RegionIntelligenceSuggestionHint[];
  evidenceReferences: RegionSourceEvidenceReference[];
  openQuestions: string[];
  affectedScope: RegionSourceAffectedScope;
  reviewSuggestions: RegionIntelligenceReviewSuggestion[];
  reviewTaskSummary: RegionSourceReviewTaskSummary;
  createdAt: string;
  updatedAt: string;
  testedBy: string | null;
  productionTruth?: boolean;
  reviewRequired: true;
  noAutoPublish: true;
  noPublicOfficial: true;
};

export type RegionSourceTestResult = SourceSnapshot;

const SampleItemSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    url: z.string().trim().url().nullable().optional(),
    detectedTopics: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

function addExplicitUrlIssue(
  value: { sourceType: RegionSourceConnectionType; url?: string | null },
  ctx: z.RefinementCtx,
) {
  if (
    requiresExplicitUrl(value.sourceType) &&
    !String(value.url ?? "").trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["url"],
      message: "explicit_url_required",
    });
  }
}

export const OrganizationSourceConnectionUpsertSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    organizationId: z.string().trim().min(1),
    regionId: z.string().trim().min(1).nullable().optional(),
    jurisdiction: OrganizationJurisdictionSchema.nullable().optional(),
    locale: Bcp47LocaleSchema.nullable().optional(),
    label: z.string().trim().min(1),
    sourceType: z.enum(ORGANIZATION_SOURCE_CONNECTION_TYPES),
    url: z.string().trim().url().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    enabled: z.boolean().optional(),
    snapshotSeedKind: z.enum(REGION_SOURCE_SNAPSHOT_SEED_KINDS).optional(),
    snapshotTemplateLabel: z.string().trim().min(1).optional(),
    sampleItems: z.array(SampleItemSchema).max(5).optional(),
  })
  .superRefine((value, ctx) => {
    addExplicitUrlIssue(value, ctx);
    if (!String(value.regionId ?? "").trim() && !value.jurisdiction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jurisdiction"],
        message: "jurisdiction_required_without_region",
      });
    }
  });

/**
 * Existing regional operator/runtime contract. It intentionally keeps a
 * mandatory regionId while OrganizationSourceConnectionUpsertSchema covers
 * organization sources outside a local/regional runtime.
 */
export const RegionSourceConnectionUpsertSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    regionId: z.string().trim().min(1),
    label: z.string().trim().min(1),
    sourceType: z.enum(REGION_SOURCE_CONNECTION_TYPES),
    url: z.string().trim().url().nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    enabled: z.boolean().optional(),
    snapshotSeedKind: z.enum(REGION_SOURCE_SNAPSHOT_SEED_KINDS).optional(),
    snapshotTemplateLabel: z.string().trim().min(1).optional(),
    sampleItems: z.array(SampleItemSchema).max(5).optional(),
  })
  .superRefine((value, ctx) => {
    addExplicitUrlIssue(value, ctx);
  });

export const RegionSourceConnectionDryRunSchema = z
  .object({
    note: z.string().trim().min(1).optional(),
  })
  .strict();

export function requiresExplicitUrl(value: RegionSourceConnectionType) {
  return value !== "manual_snapshot" && value !== "manual_source" && value !== "curated_pilot_source";
}

export function regionSourceConnectionTypeLabel(value: RegionSourceConnectionType) {
  switch (value) {
    case "website_url":
      return "Website-URL";
    case "rss_feed":
      return "RSS-Feed";
    case "atom_feed":
      return "Atom-Feed";
    case "document_url":
      return "Dokument-URL";
    case "press_page":
      return "Presse- oder News-Seite";
    case "meeting_calendar":
      return "Sitzungs- oder Terminkalender";
    case "social_profile_reference":
      return "Social-Profil-Referenz";
    case "manual_snapshot":
      return "Manueller Snapshot";
    case "manual_source":
      return "Manuelle Quelle";
    case "curated_pilot_source":
      return "Kuratierte Pilotquelle";
    case "official_feed":
      return "Official Feed";
    case "municipal_news":
      return "Kommunale Nachrichten";
    default:
      return value;
  }
}

export function regionSourceConnectionAdapterId(
  value: RegionSourceConnectionType,
): RegionIntelligenceSourceAdapterId {
  switch (value) {
    case "manual_snapshot":
    case "manual_source":
      return "manual_review_queue";
    case "curated_pilot_source":
      return "curated_starting_point";
    case "website_url":
    case "rss_feed":
    case "atom_feed":
    case "document_url":
    case "press_page":
    case "meeting_calendar":
    case "social_profile_reference":
    case "official_feed":
    case "municipal_news":
    default:
      return "productive_regional_source";
  }
}

export function regionSourceSnapshotSeedKindLabel(
  value: RegionSourceSnapshotSeedKind,
) {
  switch (value) {
    case "example_seed":
      return "Beispiel-Seed";
    case "configured_region_source":
    default:
      return "Regionales Snapshot-Template";
  }
}

export function buildRegionSourceSnapshotTemplateSeed(input: {
  sourceType: RegionSourceConnectionType;
  url: string | null;
  title: string;
  summary: string;
  detectedTopics?: string[];
  seedKind?: RegionSourceSnapshotSeedKind;
  templateLabel?: string | null;
}) {
  const seedKind = input.seedKind ?? "configured_region_source";
  const mode =
    input.sourceType === "curated_pilot_source" || input.sourceType === "manual_snapshot"
      ? "template_only"
      : "template_plus_explicit_url";
  return {
    sampleItems: [
      {
        title: String(input.title ?? "").trim(),
        summary: String(input.summary ?? "").trim(),
        url: String(input.url ?? "").trim() || null,
        detectedTopics: (input.detectedTopics ?? [])
          .map((topic) => String(topic).trim())
          .filter(Boolean),
      },
    ],
    snapshotSeedKind: seedKind,
    snapshotTemplateLabel:
      String(input.templateLabel ?? "").trim() ||
      (seedKind === "example_seed" ? "Beispiel-Snapshot" : "Regionales Snapshot-Template"),
    snapshotMode: mode,
  };
}

export function regionSourceConnectionCategoryLabel(
  value: RegionSourceConnectionType,
) {
  switch (regionSourceConnectionAdapterId(value)) {
    case "manual_review_queue":
      return "manuell";
    case "curated_starting_point":
      return "kuratiert";
    case "productive_regional_source":
    default:
      return "produktiv";
  }
}

export function sourceConnectionStatusLabel(value: SourceConnectionStatus) {
  switch (value) {
    case "draft":
      return "Entwurf";
    case "submitted":
      return "Quelle beantragt";
    case "testing":
      return "Quelle wird getestet";
    case "test_failed":
      return "Test fehlgeschlagen";
    case "active_review_required":
      return "Quelle aktiv, aber reviewpflichtig";
    case "active_limited":
      return "Quelle aktiv, aber eingeschränkt";
    case "paused":
      return "Quelle pausiert";
    case "revoked":
      return "Quelle gesperrt";
    case "archived":
      return "Quelle archiviert";
    default:
      return value;
  }
}

export function sourceConnectionScopeLabel(value: SourceConnectionScope) {
  switch (value) {
    case "organization":
      return "Nur Organisation";
    case "organization_region":
      return "Organisation und Region";
    case "operator_review":
      return "Betreiberprüfung";
    default:
      return value;
  }
}

export function sourceConnectionTestResultLabel(
  value: SourceConnectionTestResultStatus,
) {
  switch (value) {
    case "passed":
      return "Test erfolgreich";
    case "failed":
      return "Test fehlgeschlagen";
    case "manual_only":
      return "Nur manueller Snapshot";
    case "not_run":
    default:
      return "Noch nicht getestet";
  }
}

export function regionSourceResultVisibilityLabel(
  visibilityState: RegionPublicationVisibilityState,
) {
  switch (visibilityState) {
    case "internal_review":
      return "reviewpflichtig";
    case "public_unverified":
      return "sichtbar, aber nicht geprüft";
    case "public_reviewed":
      return "geprüft";
    case "public_official":
      return "amtlich freigegeben";
    case "blocked":
      return "gesperrt";
    case "archived":
      return "archiviert";
    case "private_draft":
    default:
      return "intern";
  }
}
