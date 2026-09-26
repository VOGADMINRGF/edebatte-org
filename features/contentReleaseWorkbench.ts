import { coreCol, ObjectId, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { z } from "zod";
import { recordAuditEvent } from "@features/audit/recordAuditEvent";
import {
  getDossierStudioWorkspaceRepo,
  type DossierStudioWorkspaceSource,
} from "@features/dossier/server/studioPersistence";
import { mutateDossierWithRevision } from "@features/dossier/revisions";
import { dossiersCol, dossierSourcesCol, updateDossierCounts } from "@features/dossier/db";
import { seedDossierFromAnalysis } from "@features/dossier/seed";
import {
  isPublicVisibilityState,
  publicationVisibilityLabel,
  type RegionPublicationVisibilityState,
} from "@features/region/publicationRiskLadder";
import { buildQrStudioHref } from "@features/qr";
import type { RegionSourcePossibleClaim, RegionSourceTestResult } from "@features/region/sourceConnections";
import { getRegionSourceTestResultById } from "@features/region/server/sourceConnectionRuntime";
import { createManualAnlassraum } from "@features/anlassraum/service";
import {
  buildPersistedCreateHandoffSuggestedTitle,
  buildPersistedCreateHandoffSummary,
  getPersistedCreateHandoffRecord,
  persistedCreateHandoffStatementId,
  type PersistedCreateHandoffRecord,
} from "@/features/create/persistedHandoffReviewQueue";

export const CONTENT_RELEASE_TARGET_TYPES = ["dossier", "anlassraum", "topic_page"] as const;
export type ContentReleaseTargetType = (typeof CONTENT_RELEASE_TARGET_TYPES)[number];
export const CONTENT_RELEASE_SOURCE_KINDS = ["region_source_result", "create_handoff"] as const;
export type ContentReleaseSourceKind = (typeof CONTENT_RELEASE_SOURCE_KINDS)[number];

export const CONTENT_RELEASE_ACTIONS = [
  "prepare_target",
  "make_visible",
  "prepare_publication",
  "retract_visibility",
  "archive_target",
] as const;
export type ContentReleaseAction = (typeof CONTENT_RELEASE_ACTIONS)[number];
export type ContentPublishAction = ContentReleaseAction;

export const CONTENT_RELEASE_AUDIT_ACTIONS = [
  "prepared",
  "visibility_made_public",
  "publication_prepared",
  "visibility_retracted",
  "archived",
] as const;
export type ContentReleaseAuditAction = (typeof CONTENT_RELEASE_AUDIT_ACTIONS)[number];

const CONTENT_RELEASE_VISIBILITY_STATES = [
  "internal_review",
  "public_unverified",
  "public_reviewed",
  "public_official",
  "archived",
  "blocked",
] as const;

export type ContentReleaseStatusLabel =
  | "Arbeitsstand"
  | "sichtbar, aber nicht geprüft"
  | "geprüft"
  | "amtlich freigegeben"
  | "archiviert"
  | "blockiert";

export const PUBLIC_TOPIC_PAGE_REVIEW_STATUSES = [
  "review_required",
  "reviewed",
  "official_release_only",
] as const;

export type PublicTopicPageReviewStatus =
  (typeof PUBLIC_TOPIC_PAGE_REVIEW_STATUSES)[number];

export type ContentReleaseTopicPageClaimCandidate = {
  text: string;
  excerpt: string | null;
};

export type ContentReleaseTopicPageEvidenceHint = {
  label: string;
  url: string | null;
  excerpt: string | null;
};

export type ContentReleaseTopicPageData = {
  title: string;
  summary: string;
  claimCandidates: ContentReleaseTopicPageClaimCandidate[];
  evidenceHints: ContentReleaseTopicPageEvidenceHint[];
  openQuestions: string[];
  reviewStatus: PublicTopicPageReviewStatus;
};

const ContentReleaseTargetRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    sourceKind: z.enum(CONTENT_RELEASE_SOURCE_KINDS),
    sourceResultId: z.string().trim().min(1),
    sourceReviewItemId: z.string().trim().min(1),
    regionId: z.string().trim().min(1).nullable().optional(),
    organizationId: z.string().trim().min(1).nullable().optional(),
    targetType: z.enum(CONTENT_RELEASE_TARGET_TYPES),
    targetId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    previewHref: z.string().trim().min(1),
    publicHref: z.string().trim().min(1),
    topicPageData: z
      .object({
        title: z.string().trim().min(1),
        summary: z.string().trim().min(1),
        claimCandidates: z.array(
          z
            .object({
              text: z.string().trim().min(1),
              excerpt: z.string().trim().min(1).nullable(),
            })
            .strict(),
        ),
        evidenceHints: z.array(
          z
            .object({
              label: z.string().trim().min(1),
              url: z.string().trim().min(1).nullable(),
              excerpt: z.string().trim().min(1).nullable(),
            })
            .strict(),
        ),
        openQuestions: z.array(z.string().trim().min(1)),
        reviewStatus: z.enum(PUBLIC_TOPIC_PAGE_REVIEW_STATUSES),
      })
      .strict()
      .nullable()
      .optional(),
    visibilityState: z.enum(CONTENT_RELEASE_VISIBILITY_STATES),
    createdByUserId: z.string().trim().min(1),
    createdAt: z.string().datetime({ offset: true }),
    updatedByUserId: z.string().trim().min(1),
    updatedAt: z.string().datetime({ offset: true }),
    reviewRequired: z.literal(true),
    noAutoPublish: z.literal(true),
    noPublicOfficial: z.literal(true),
    noSocialPublishing: z.literal(true),
    noAutomaticOfficialResponse: z.literal(true),
    noAutoFinalization: z.literal(true),
    revokable: z.literal(true),
    archivable: z.literal(true),
  })
  .strict();

export type ContentReleaseTargetRecord = z.infer<typeof ContentReleaseTargetRecordSchema>;

const ContentReleaseAuditEventSchema = z
  .object({
    id: z.string().trim().min(1),
    recordId: z.string().trim().min(1),
    sourceKind: z.enum(CONTENT_RELEASE_SOURCE_KINDS),
    sourceResultId: z.string().trim().min(1),
    targetType: z.enum(CONTENT_RELEASE_TARGET_TYPES),
    action: z.enum(CONTENT_RELEASE_AUDIT_ACTIONS),
    byUserId: z.string().trim().min(1),
    note: z.string().trim().min(1).nullable().optional(),
    at: z.string().datetime({ offset: true }),
  })
  .strict();

export type ContentReleaseAuditEvent = z.infer<typeof ContentReleaseAuditEventSchema>;
export type ContentPublishAuditEvent = ContentReleaseAuditEvent;

export const CONTENT_RELEASE_PERSISTENCE_MODES = [
  "persistent_primary",
  "in_memory_fallback",
] as const;

export type ContentReleasePersistenceMode =
  (typeof CONTENT_RELEASE_PERSISTENCE_MODES)[number];

export type ContentReleasePersistenceState = {
  mode: ContentReleasePersistenceMode;
  label: string;
  summary: string;
  repositoryInterface: "ContentReleaseRepository";
  storeKind: "mongo_collection" | "in_memory";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
};

export type ContentReleaseAuditByRecord = Record<string, ContentReleaseAuditEvent[]>;

export const CONTENT_PUBLISH_STATUSES = [
  "draft",
  "internal_review",
  "public_unverified",
  "public_reviewed",
  "public_official",
  "archived",
  "blocked",
] as const;
export type ContentPublishStatus = (typeof CONTENT_PUBLISH_STATUSES)[number];

export type PublicContentLink = {
  href: string;
  shareHref: string;
  qrHref: string | null;
  visibilityState: Extract<
    RegionPublicationVisibilityState,
    "public_unverified" | "public_reviewed" | "public_official"
  >;
  visibilityLabel: string;
};

export type ContentPublishTarget = {
  targetType: ContentReleaseTargetType;
  targetLabel: string;
  targetId: string | null;
};

export type ContentPublishPreview = {
  target: ContentPublishTarget;
  suggestedTitle: string;
  prepared: boolean;
  previewHref: string | null;
  publishStatus: ContentPublishStatus;
  publishStatusLabel: ContentReleaseStatusLabel;
  visibilityState: RegionPublicationVisibilityState;
  visibilityLabel: string;
  statusHint: string;
  publicLink: PublicContentLink | null;
  auditEvents: ContentPublishAuditEvent[];
  persistence: ContentReleasePersistenceState;
};

export type ContentReleaseWorkbenchTarget = {
  targetType: ContentReleaseTargetType;
  targetLabel: string;
  suggestedTitle: string;
  targetId: string | null;
  prepared: boolean;
  previewHref: string | null;
  publicHref: string | null;
  shareHref: string | null;
  qrHref: string | null;
  publicLink: PublicContentLink | null;
  publishStatus: ContentPublishStatus;
  publishStatusLabel: ContentReleaseStatusLabel;
  visibilityState: RegionPublicationVisibilityState;
  visibilityLabel: string;
  statusLabel: ContentReleaseStatusLabel;
  statusHint: string;
  canPrepare: boolean;
  canMakeVisible: boolean;
  canPreparePublication: boolean;
  canRevokeVisibility: boolean;
  canArchive: boolean;
  canCreateQrLink: boolean;
  auditEvents: ContentPublishAuditEvent[];
};

export type PrepareContentReleaseTargetInput = {
  sourceKind: ContentReleaseSourceKind;
  sourceResultId: string;
  targetType: ContentReleaseTargetType;
  requestedBy: string;
  organizationId?: string | null;
};

export type UpdateContentReleaseTargetInput = {
  sourceKind: ContentReleaseSourceKind;
  sourceResultId: string;
  targetType: ContentReleaseTargetType;
  action: Exclude<ContentReleaseAction, "prepare_target">;
  requestedBy: string;
  note?: string | null;
};

export type ContentReleaseRepository = {
  getTargetRecord(
    sourceKind: ContentReleaseSourceKind,
    sourceResultId: string,
    targetType: ContentReleaseTargetType,
  ): Promise<ContentReleaseTargetRecord | null>;
  listTargetRecordsForSourceResult(
    sourceKind: ContentReleaseSourceKind,
    sourceResultId: string,
  ): Promise<ContentReleaseTargetRecord[]>;
  listTargetRecordsByType(targetType: ContentReleaseTargetType): Promise<ContentReleaseTargetRecord[]>;
  getTargetRecordByTargetId(
    targetType: ContentReleaseTargetType,
    targetId: string,
  ): Promise<ContentReleaseTargetRecord | null>;
  saveTargetRecord(record: ContentReleaseTargetRecord): Promise<void>;
  appendAuditEvent(event: ContentReleaseAuditEvent): Promise<void>;
  listAuditEvents(recordId: string): Promise<ContentReleaseAuditEvent[]>;
  listAuditEventsForRecords(
    recordIds: string[],
    limitPerRecord?: number,
  ): Promise<ContentReleaseAuditByRecord>;
  getPersistenceState(): ContentReleasePersistenceState;
};

export type ContentReleaseWorkbenchRepo = ContentReleaseRepository;

const CONTENT_RELEASE_TARGETS_COLLECTION = "content_release_workbench_targets";
const CONTENT_RELEASE_AUDIT_COLLECTION = "content_release_workbench_audit";

let repoSingleton: ContentReleaseRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function isoNow() {
  return new Date().toISOString();
}

function buildPersistenceState(
  mode: ContentReleasePersistenceMode,
): ContentReleasePersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    label: persistent ? "Persistenter Content-Release-Store" : "In-Memory-Fallback",
    summary: persistent
      ? "Sichtbarkeit, Archivierung, Public Links und Workbench-Aktivität liegen dauerhaft in den Content-Release-Collections und bleiben über Restart/Deployment rekonstruierbar."
      : "Nur Dev-/Test-/Runtime-Fallback: Sichtbarkeits- und Archivzustände leben pro Prozess und dürfen nicht als Produktionswahrheit ausgegeben werden.",
    repositoryInterface: "ContentReleaseRepository",
    storeKind: persistent ? "mongo_collection" : "in_memory",
    productionTruth: persistent,
    restartReconstructable: persistent,
    deploymentReconstructable: persistent,
  };
}

function targetLabel(targetType: ContentReleaseTargetType) {
  if (targetType === "dossier") return "Dossier-Entwurf";
  if (targetType === "anlassraum") return "Anlassraum";
  return "Öffentliche Themenseite";
}

function recordIdFor(
  sourceKind: ContentReleaseSourceKind,
  sourceResultId: string,
  targetType: ContentReleaseTargetType,
) {
  return `content-release-${targetType}-${stableHash(`${sourceKind}:${sourceResultId}:${targetType}`).slice(0, 18)}`;
}

function auditEventIdFor(recordId: string, action: ContentReleaseAuditAction, at: string) {
  return `content-release-audit-${stableHash(`${recordId}:${action}:${at}`).slice(0, 18)}`;
}

function dossierIdForSourceResult(sourceResultId: string) {
  return `source-result-dossier-${stableHash(sourceResultId).slice(0, 16)}`;
}

function statementIdForSourceResult(sourceResultId: string) {
  return `source-result:${sourceResultId}`;
}

function dossierIdForCreateHandoff(handoffId: string) {
  return `create-handoff-dossier-${stableHash(handoffId).slice(0, 16)}`;
}

function anlassraumTopicKey(title: string) {
  const normalized = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "thema";
}

function previewHrefFor(targetType: ContentReleaseTargetType, targetId: string) {
  if (targetType === "dossier") {
    return `/dossier/${encodeURIComponent(targetId)}/studio`;
  }
  if (targetType === "anlassraum") {
    return `/runden?view=active&anlassraumId=${encodeURIComponent(targetId)}`;
  }
  return `/topic/${encodeURIComponent(targetId)}?previewTopicPage=1`;
}

function publicHrefFor(targetType: ContentReleaseTargetType, targetId: string) {
  if (targetType === "dossier") {
    return `/dossier/${encodeURIComponent(targetId)}`;
  }
  if (targetType === "anlassraum") {
    return `/anlassraum?anlassraumId=${encodeURIComponent(targetId)}`;
  }
  return `/topic/${encodeURIComponent(targetId)}`;
}

function qrHrefFor(publicHref: string | null, visibilityState: RegionPublicationVisibilityState) {
  if (!publicHref || !isPublicVisibilityState(visibilityState)) return null;
  return buildQrStudioHref({
    target: publicHref,
    caller: "content_release_workbench",
  });
}

function publicContentLinkFor(
  publicHref: string | null,
  visibilityState: RegionPublicationVisibilityState,
): PublicContentLink | null {
  if (!publicHref || !isPublicVisibilityState(visibilityState)) return null;
  const qrHref = qrHrefFor(publicHref, visibilityState);
  return {
    href: publicHref,
    shareHref: publicHref,
    qrHref,
    visibilityState: visibilityState as PublicContentLink["visibilityState"],
    visibilityLabel: publicationVisibilityLabel(visibilityState),
  };
}

function statusLabelForVisibility(
  visibilityState: RegionPublicationVisibilityState,
): ContentReleaseStatusLabel {
  switch (visibilityState) {
    case "public_unverified":
      return "sichtbar, aber nicht geprüft";
    case "public_reviewed":
      return "geprüft";
    case "public_official":
      return "amtlich freigegeben";
    case "archived":
      return "archiviert";
    case "blocked":
      return "blockiert";
    case "private_draft":
    case "internal_review":
    default:
      return "Arbeitsstand";
  }
}

function publishStatusForTarget(
  record: ContentReleaseTargetRecord | null,
): ContentPublishStatus {
  if (!record) return "draft";
  return record.visibilityState;
}

function statusHintForTarget(input: {
  prepared: boolean;
  visibilityState: RegionPublicationVisibilityState;
}) {
  if (!input.prepared) {
    return "Noch nicht übernommen. Veröffentlichung startet erst mit einer bewussten Übernahme in den bestehenden Dossier- oder Anlassraum-Pfad.";
  }
  switch (input.visibilityState) {
    case "public_unverified":
      return "Sichtbar heißt hier noch nicht geprüft oder amtlich. Review und Widerruf bleiben bewusst möglich.";
    case "public_reviewed":
      return "Der Inhalt ist sichtbar und geprüft, aber weiterhin nicht automatisch amtlich freigegeben.";
    case "public_official":
      return "Amtliche Freigabe läuft ausschließlich über den bestehenden Official-Release-Pfad.";
    case "archived":
      return "Archivierung löscht nicht hart. Der Arbeitsstand bleibt auditierbar und kann nachvollzogen werden.";
    case "blocked":
      return "Dieser Arbeitsstand ist blockiert und nicht als sichtbarer Inhalt freigegeben.";
    case "private_draft":
    case "internal_review":
    default:
      return "Bewusst vorbereiteter Arbeitsstand. Keine automatische Veröffentlichung und kein automatisches public_official.";
  }
}

function canMakeVisibleFromState(
  visibilityState: RegionPublicationVisibilityState,
) {
  return (
    visibilityState !== "public_unverified" &&
    visibilityState !== "public_reviewed" &&
    visibilityState !== "public_official" &&
    visibilityState !== "archived" &&
    visibilityState !== "blocked"
  );
}

function canPreparePublicationFromState(
  visibilityState: RegionPublicationVisibilityState,
) {
  return (
    visibilityState !== "public_reviewed" &&
    visibilityState !== "public_official" &&
    visibilityState !== "archived" &&
    visibilityState !== "blocked"
  );
}

function canRevokeVisibilityFromState(
  visibilityState: RegionPublicationVisibilityState,
) {
  return (
    visibilityState === "public_unverified" ||
    visibilityState === "public_reviewed"
  );
}

function canArchiveFromState(
  visibilityState: RegionPublicationVisibilityState,
) {
  return visibilityState !== "archived" && visibilityState !== "blocked";
}

function safeTrim(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function summaryFromSourceResult(result: RegionSourceTestResult) {
  return (
    String(result.sourceSnapshotSummary ?? "").trim() ||
    String(result.sourceSnapshotExcerpt ?? "").trim() ||
    String(result.summary || "").trim() ||
    "Reviewpflichtiger Arbeitsstand aus expliziter URL-Auswertung."
  );
}

function summaryFromCreateHandoff(record: PersistedCreateHandoffRecord) {
  return buildPersistedCreateHandoffSummary(record);
}

function suggestedTitleForTarget(
  result: RegionSourceTestResult,
  targetType: ContentReleaseTargetType,
) {
  if (targetType === "dossier") {
    return (
      String(result.dossierSuggestions[0]?.title ?? "").trim() ||
      String(result.sourceSnapshotTitle ?? "").trim() ||
      String(result.affectedScope.regionName ?? "").trim() ||
      result.title.replace(/\s+·\s+Dry Run$/u, "").trim()
    );
  }
  if (targetType === "anlassraum") {
    return (
      String(result.anlassraumSuggestions[0]?.title ?? "").trim() ||
      String(result.topicClusters[0]?.label ?? "").trim() ||
      String(result.sourceSnapshotTitle ?? "").trim() ||
      result.title.replace(/\s+·\s+Dry Run$/u, "").trim()
    );
  }
  return (
    String(result.topicClusters[0]?.label ?? "").trim() ||
    String(result.sourceSnapshotTitle ?? "").trim() ||
    String(result.dossierSuggestions[0]?.title ?? "").trim() ||
    result.title.replace(/\s+·\s+Dry Run$/u, "").trim()
  );
}

function suggestedTitleForCreateHandoff(
  record: PersistedCreateHandoffRecord,
  targetType: ContentReleaseTargetType,
) {
  if (targetType === "topic_page") {
    return (
      String(record.topicSeed?.topicLabel ?? "").trim() ||
      String(record.plannerResult?.plannerTopic ?? "").trim() ||
      buildPersistedCreateHandoffSuggestedTitle(record, "dossier")
    );
  }
  return buildPersistedCreateHandoffSuggestedTitle(record, targetType);
}

function topicPageSlugBase(title: string) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "thema";
}

function topicPageSlugFor(sourceId: string, title: string) {
  return `${topicPageSlugBase(title)}-${stableHash(sourceId).slice(0, 6)}`;
}

function topicPageDataFromSourceResult(
  result: RegionSourceTestResult,
): ContentReleaseTopicPageData {
  const title = suggestedTitleForTarget(result, "topic_page");
  return {
    title,
    summary: summaryFromSourceResult(result),
    claimCandidates: result.possibleClaims.map((claim) => ({
      text: claim.text,
      excerpt: safeTrim(claim.excerpt) || null,
    })),
    evidenceHints: result.evidenceReferences.map((reference) => ({
      label: safeTrim(reference.label) || result.connectionLabel,
      url: safeTrim(reference.url) || null,
      excerpt: safeTrim(reference.excerpt) || null,
    })),
    openQuestions: result.openQuestions.map((question) => safeTrim(question)).filter(Boolean),
    reviewStatus: "review_required",
  };
}

function topicPageDataFromCreateHandoff(
  record: PersistedCreateHandoffRecord,
): ContentReleaseTopicPageData {
  const title = suggestedTitleForCreateHandoff(record, "topic_page");
  return {
    title,
    summary: summaryFromCreateHandoff(record),
    claimCandidates: record.claims.map((claim) => ({
      text: claim.text,
      excerpt: null,
    })),
    evidenceHints: record.sourceGrounding.map((reference) => ({
      label: safeTrim(reference.label) || "Quellenhinweis",
      url: reference.status === "link_reference" ? safeTrim(reference.detail) || null : null,
      excerpt:
        reference.status === "source_excerpt" || reference.status === "source_text"
          ? safeTrim(reference.detail) || null
          : null,
    })),
    openQuestions: record.openQuestions
      .map((question) => safeTrim(question.question))
      .filter(Boolean),
    reviewStatus: "review_required",
  };
}

function nextVisibilityStateForAction(
  current: RegionPublicationVisibilityState,
  action: Exclude<ContentReleaseAction, "prepare_target">,
) {
  switch (action) {
    case "make_visible":
      if (current === "public_reviewed") return "public_reviewed" as const;
      if (current === "public_official") return "public_official" as const;
      return "public_unverified" as const;
    case "prepare_publication":
      if (current === "public_official") return "public_official" as const;
      return "public_reviewed" as const;
    case "retract_visibility":
      if (current === "archived" || current === "blocked") return current;
      return "internal_review" as const;
    case "archive_target":
      return "archived" as const;
    default:
      return current;
  }
}

function auditActionForVisibilityAction(
  action: Exclude<ContentReleaseAction, "prepare_target">,
): ContentReleaseAuditAction {
  switch (action) {
    case "make_visible":
      return "visibility_made_public";
    case "prepare_publication":
      return "publication_prepared";
    case "retract_visibility":
      return "visibility_retracted";
    case "archive_target":
      return "archived";
    default:
      return "visibility_retracted";
  }
}

function globalAuditActionForContentRelease(
  action: ContentReleaseAuditAction,
): string | null {
  switch (action) {
    case "visibility_made_public":
      return "content_release.visibility_made_public";
    case "visibility_retracted":
      return "content_release.visibility_revoked";
    case "archived":
      return "content_release.content_archived";
    default:
      return null;
  }
}

async function recordPersistentContentReleaseAudit(params: {
  record: ContentReleaseTargetRecord;
  action: ContentReleaseAuditAction;
  note?: string | null;
  before?: RegionPublicationVisibilityState | null;
  after?: RegionPublicationVisibilityState | null;
}) {
  const globalAction = globalAuditActionForContentRelease(params.action);
  if (!globalAction) return;
  if (!getRepo().getPersistenceState().productionTruth) return;
  await recordAuditEvent({
    scope: params.record.organizationId ? "org" : "admin",
    action: globalAction,
    actorUserId: params.record.updatedByUserId,
    target: {
      type: `content_release_${params.record.targetType}`,
      id: params.record.id,
    },
    before:
      params.before === undefined
        ? undefined
        : { visibilityState: params.before, targetType: params.record.targetType },
    after:
      params.after === undefined
        ? undefined
        : { visibilityState: params.after, targetType: params.record.targetType },
    reason: params.note ?? null,
  });
}

async function buildPublishPreview(params: {
  targetType: ContentReleaseTargetType;
  suggestedTitle: string;
  record: ContentReleaseTargetRecord | null;
  auditEvents?: ContentPublishAuditEvent[];
}) {
  const visibilityState = params.record?.visibilityState ?? "internal_review";
  const publicHref = params.record?.publicHref ?? null;
  const publicLink = publicContentLinkFor(publicHref, visibilityState);
  const auditEvents =
    params.auditEvents ?? (params.record ? await listContentReleaseAuditEvents(params.record.id) : []);
  return {
    target: {
      targetType: params.targetType,
      targetLabel: targetLabel(params.targetType),
      targetId: params.record?.targetId ?? null,
    },
    suggestedTitle: params.suggestedTitle,
    prepared: Boolean(params.record),
    previewHref: params.record?.previewHref ?? null,
    publishStatus: publishStatusForTarget(params.record),
    publishStatusLabel: statusLabelForVisibility(visibilityState),
    visibilityState,
    visibilityLabel: publicationVisibilityLabel(visibilityState),
    statusHint: statusHintForTarget({
      prepared: Boolean(params.record),
      visibilityState,
    }),
    publicLink,
    auditEvents,
    persistence: getContentReleasePersistenceState(),
  } satisfies ContentPublishPreview;
}

function mapPossibleClaims(possibleClaims: RegionSourcePossibleClaim[]) {
  return possibleClaims.map((claim, index) => ({
    id: `source-result-claim-${index + 1}`,
    text: claim.text,
  }));
}

function mapCreateHandoffClaims(record: PersistedCreateHandoffRecord) {
  return record.claims.map((claim, index) => ({
    id: `create-handoff-claim-${index + 1}`,
    text: claim.text,
  }));
}

async function ensureDossierDraftFromSourceResult(input: {
  result: RegionSourceTestResult;
  requestedBy: string;
  organizationId?: string | null;
}) {
  const dossierId = dossierIdForSourceResult(input.result.id);
  const statementId = statementIdForSourceResult(input.result.id);
  const title = suggestedTitleForTarget(input.result, "dossier");
  const now = new Date();
  const dossiers = await dossiersCol();

  await mutateDossierWithRevision({
    dossierId,
    mutate: async (session) => {
      const existing = await dossiers.findOne(
        { $or: [{ dossierId }, { statementId }] } as any,
        { session },
      );
      if (existing) return { result: null, revision: null };

      await dossiers.insertOne(
        {
          dossierId,
          statementId,
          title,
          status: "draft",
          counts: {
            claims: 0,
            sources: 0,
            findings: 0,
            edges: 0,
            openQuestions: 0,
          },
          createdAt: now,
          updatedAt: now,
        } as any,
        { session },
      );
      return {
        result: null,
        revision: {
          entityType: "dossier",
          entityId: dossierId,
          action: "create",
          diffSummary: "Dossier-Entwurf aus Review-Queue-Source-Result erstellt.",
          byRole: "admin",
          byUserId: input.requestedBy,
        },
      };
    },
  });

  await seedDossierFromAnalysis({
    dossierId,
    claims: mapPossibleClaims(input.result.possibleClaims),
    questions: input.result.openQuestions.map((text, index) => ({
      id: `source-result-question-${index + 1}`,
      text,
    })),
    createdByRole: "admin",
  });

  const sources = await dossierSourcesCol();
  for (const [index, reference] of input.result.evidenceReferences.entries()) {
    const url = String(reference.url ?? "").trim();
    if (!url) continue;
    const sourceId = `source-result-source-${stableHash(`${input.result.id}:${url}:${index}`).slice(0, 12)}`;
    const canonicalUrlHash = stableHash(url);
    await mutateDossierWithRevision({
      dossierId,
      mutate: async (session) => {
        const existingSource = await sources.findOne({ dossierId, canonicalUrlHash }, { session });
        if (existingSource) return { result: null, revision: null };

        await sources.insertOne(
          {
            sourceId,
            dossierId,
            canonicalUrlHash,
            url,
            title: reference.label || input.result.connectionLabel,
            publisher: input.result.connectionLabel,
            publishedAt: new Date(input.result.createdAt),
            retrievedAt: now,
            type: input.result.sourceType === "official_feed" ? "official" : "quality_media",
            snippet: String(reference.excerpt ?? "").trim() || undefined,
            tags: input.result.detectedTopics.slice(0, 5),
            language: "de",
            createdAt: now,
            updatedAt: now,
          } as any,
          { session },
        );
        return {
          result: null,
          revision: {
            entityType: "source",
            entityId: sourceId,
            action: "create",
            diffSummary: "Quelle aus expliziter URL-Auswertung übernommen.",
            byRole: "admin",
            byUserId: input.requestedBy,
          },
        };
      },
    });
  }
  await updateDossierCounts(dossierId, "Dossier-Zaehler nach Source-Result-Übernahme aktualisiert.");

  await getDossierStudioWorkspaceRepo().createOrGetDossierStudioWorkspace({
    dossierId,
    regionId: input.result.regionId,
    organizationId: String(input.organizationId ?? "").trim() || null,
    source: "manual_admin" satisfies DossierStudioWorkspaceSource,
    title,
    createdBy: input.requestedBy,
    updatedBy: input.requestedBy,
    provenance: {
      sourceSignalId: input.result.id,
      sourceRegionId: input.result.regionId,
      sourceDraftId: input.result.connectionId,
      notProductionData: false,
      fixture: false,
    },
    seed: {
      status: "draft",
      audienceNotes:
        "eDebatte bereitet aus deinem Link veröffentlichbare Inhalte vor. Du entscheidest, was als Dossier, Anlassraum oder öffentliche Themenseite sichtbar wird.",
      reviewNotes:
        "Reviewpflichtiger Studio-Arbeitsstand aus expliziter URL-Auswertung. Keine automatische Veröffentlichung.",
    },
  });

  return {
    targetId: dossierId,
    title,
    summary: summaryFromSourceResult(input.result),
  };
}

async function ensureAnlassraumFromSourceResult(input: {
  result: RegionSourceTestResult;
  requestedBy: string;
}) {
  const title = suggestedTitleForTarget(input.result, "anlassraum");
  const created = await createManualAnlassraum({
    entityId: new ObjectId(),
    type: "policy",
    title,
    summary: summaryFromSourceResult(input.result),
    topicKey: anlassraumTopicKey(title),
    regionKey: input.result.regionId,
    scope: "regional",
    ownerType: "government",
    ownerId: input.result.regionId,
    createdBy: input.requestedBy,
  });
  return {
    targetId: created.anlassraumId.toHexString(),
    title,
    summary: summaryFromSourceResult(input.result),
  };
}

async function ensureTopicPageFromSourceResult(input: {
  result: RegionSourceTestResult;
}) {
  const topicPageData = topicPageDataFromSourceResult(input.result);
  return {
    targetId: topicPageSlugFor(input.result.id, topicPageData.title),
    title: topicPageData.title,
    summary: topicPageData.summary,
    topicPageData,
  };
}

async function ensureDossierDraftFromCreateHandoff(input: {
  record: PersistedCreateHandoffRecord;
  requestedBy: string;
  organizationId?: string | null;
}) {
  const dossierId = input.record.dossierId ?? dossierIdForCreateHandoff(input.record.id);
  const statementId = persistedCreateHandoffStatementId(input.record.id);
  const title = suggestedTitleForCreateHandoff(input.record, "dossier");
  const now = new Date();
  const dossiers = await dossiersCol();

  await mutateDossierWithRevision({
    dossierId,
    mutate: async (session) => {
      const existing = await dossiers.findOne(
        { $or: [{ dossierId }, { statementId }] } as any,
        { session },
      );
      if (existing) return { result: null, revision: null };

      await dossiers.insertOne(
        {
          dossierId,
          statementId,
          title,
          status: "draft",
          counts: {
            claims: 0,
            sources: 0,
            findings: 0,
            edges: 0,
            openQuestions: 0,
          },
          createdAt: now,
          updatedAt: now,
        } as any,
        { session },
      );
      return {
        result: null,
        revision: {
          entityType: "dossier",
          entityId: dossierId,
          action: "create",
          diffSummary: "Dossier-Entwurf aus persistiertem Create-Handoff erstellt.",
          byRole: "admin",
          byUserId: input.requestedBy,
        },
      };
    },
  });

  await seedDossierFromAnalysis({
    dossierId,
    claims: mapCreateHandoffClaims(input.record),
    questions: input.record.openQuestions.map((question, index) => ({
      id: `create-handoff-question-${index + 1}`,
      text: question.question,
    })),
    createdByRole: "admin",
  });

  const sources = await dossierSourcesCol();
  for (const [index, reference] of input.record.sourceGrounding.entries()) {
    const url = reference.status === "link_reference" ? safeTrim(reference.detail) : "";
    if (!url) continue;
    const sourceId = `create-handoff-source-${stableHash(`${input.record.id}:${url}:${index}`).slice(0, 12)}`;
    const canonicalUrlHash = stableHash(url);
    await mutateDossierWithRevision({
      dossierId,
      mutate: async (session) => {
        const existingSource = await sources.findOne({ dossierId, canonicalUrlHash }, { session });
        if (existingSource) return { result: null, revision: null };

        await sources.insertOne(
          {
            sourceId,
            dossierId,
            canonicalUrlHash,
            url,
            title: reference.label || title,
            publisher: "Create Handoff",
            publishedAt: new Date(input.record.createdAt),
            retrievedAt: now,
            type: "user_generated",
            snippet: safeTrim(reference.detail) || undefined,
            tags: input.record.plannerResult.topicCandidates.slice(0, 5),
            language: "de",
            createdAt: now,
            updatedAt: now,
          } as any,
          { session },
        );
        return {
          result: null,
          revision: {
            entityType: "source",
            entityId: sourceId,
            action: "create",
            diffSummary: "Quellenhinweis aus persistiertem Create-Handoff übernommen.",
            byRole: "admin",
            byUserId: input.requestedBy,
          },
        };
      },
    });
  }
  await updateDossierCounts(dossierId, "Dossier-Zaehler nach Create-Handoff-Übernahme aktualisiert.");

  await getDossierStudioWorkspaceRepo().createOrGetDossierStudioWorkspace({
    dossierId,
    regionId: input.record.regionId,
    organizationId: safeTrim(input.organizationId ?? input.record.organizationId) || null,
    source: "manual_editor" satisfies DossierStudioWorkspaceSource,
    title,
    createdBy: input.requestedBy,
    updatedBy: input.requestedBy,
    provenance: {
      sourceSignalId: input.record.id,
      sourceRegionId: input.record.regionId ?? undefined,
      sourceDraftId: input.record.id,
      notProductionData: false,
      fixture: false,
    },
    seed: {
      status: "draft",
      audienceNotes:
        "Persistenter Create-Handoff wurde als reviewpflichtiger veröffentlichbarer Arbeitsstand vorbereitet.",
      reviewNotes:
        "Reviewpflichtiger Studio-Arbeitsstand aus `/create`. Keine automatische Veröffentlichung, kein automatisches public_official.",
    },
  });

  return {
    targetId: dossierId,
    title,
    summary: summaryFromCreateHandoff(input.record),
  };
}

async function ensureAnlassraumFromCreateHandoff(input: {
  record: PersistedCreateHandoffRecord;
  requestedBy: string;
}) {
  const title = suggestedTitleForCreateHandoff(input.record, "anlassraum");
  const created = await createManualAnlassraum({
    entityId: new ObjectId(),
    type: "policy",
    title,
    summary: summaryFromCreateHandoff(input.record),
    topicKey: anlassraumTopicKey(title),
    regionKey: input.record.regionId,
    scope: input.record.regionId ? "regional" : "global",
    ownerType: input.record.regionId ? "government" : "system",
    ownerId: input.record.regionId ?? input.record.organizationId ?? input.record.createdByUserId,
    createdBy: input.requestedBy,
  });
  return {
    targetId: created.anlassraumId.toHexString(),
    title,
    summary: summaryFromCreateHandoff(input.record),
  };
}

async function ensureTopicPageFromCreateHandoff(input: {
  record: PersistedCreateHandoffRecord;
}) {
  const topicPageData = topicPageDataFromCreateHandoff(input.record);
  return {
    targetId: topicPageSlugFor(input.record.id, topicPageData.title),
    title: topicPageData.title,
    summary: topicPageData.summary,
    topicPageData,
  };
}

async function ensureIndexes() {
  if (indexesReady) return;
  const [targets, audit] = await Promise.all([
    coreCol(CONTENT_RELEASE_TARGETS_COLLECTION),
    coreCol(CONTENT_RELEASE_AUDIT_COLLECTION),
  ]);
  await Promise.all([
    targets.createIndex({ sourceKind: 1, sourceResultId: 1, targetType: 1 }, { unique: true }),
    targets.createIndex({ targetType: 1, targetId: 1 }),
    targets.createIndex({ regionId: 1, updatedAt: -1 }),
    audit.createIndex({ recordId: 1, at: -1 }),
    audit.createIndex({ sourceKind: 1, sourceResultId: 1, at: -1 }),
  ]);
  indexesReady = true;
}

function createMongoRepo(): ContentReleaseWorkbenchRepo {
  return {
    async getTargetRecord(sourceKind, sourceResultId, targetType) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; record: ContentReleaseTargetRecord }>(
        CONTENT_RELEASE_TARGETS_COLLECTION,
      );
      const doc = await col.findOne({
        "record.sourceKind": sourceKind,
        "record.sourceResultId": sourceResultId,
        "record.targetType": targetType,
      });
      return doc?.record ? ContentReleaseTargetRecordSchema.parse(clone(doc.record)) : null;
    },

    async listTargetRecordsForSourceResult(sourceKind, sourceResultId) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; record: ContentReleaseTargetRecord }>(
        CONTENT_RELEASE_TARGETS_COLLECTION,
      );
      const docs = await col.find({
        "record.sourceKind": sourceKind,
        "record.sourceResultId": sourceResultId,
      }).toArray();
      return docs.map((doc) => ContentReleaseTargetRecordSchema.parse(clone(doc.record)));
    },

    async listTargetRecordsByType(targetType) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; record: ContentReleaseTargetRecord }>(
        CONTENT_RELEASE_TARGETS_COLLECTION,
      );
      const docs = await col.find({
        "record.targetType": targetType,
      }).toArray();
      return docs.map((doc) => ContentReleaseTargetRecordSchema.parse(clone(doc.record)));
    },

    async getTargetRecordByTargetId(targetType, targetId) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; record: ContentReleaseTargetRecord }>(
        CONTENT_RELEASE_TARGETS_COLLECTION,
      );
      const doc = await col.findOne({
        "record.targetType": targetType,
        "record.targetId": targetId,
      });
      return doc?.record ? ContentReleaseTargetRecordSchema.parse(clone(doc.record)) : null;
    },

    async saveTargetRecord(record) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; record: ContentReleaseTargetRecord }>(
        CONTENT_RELEASE_TARGETS_COLLECTION,
      );
      await col.updateOne(
        { _id: record.id },
        { $set: { record: clone(record), sourceKind: record.sourceKind, sourceResultId: record.sourceResultId, targetType: record.targetType, regionId: record.regionId, updatedAt: record.updatedAt } as any },
        { upsert: true },
      );
    },

    async appendAuditEvent(event) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; event: ContentReleaseAuditEvent }>(
        CONTENT_RELEASE_AUDIT_COLLECTION,
      );
      await col.insertOne({ _id: event.id, event: clone(event) } as any);
    },

    async listAuditEvents(recordId) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; event: ContentReleaseAuditEvent }>(
        CONTENT_RELEASE_AUDIT_COLLECTION,
      );
      const docs = await col.find({ "event.recordId": recordId }).sort({ "event.at": -1 }).toArray();
      return docs.map((doc) => ContentReleaseAuditEventSchema.parse(clone(doc.event)));
    },
    async listAuditEventsForRecords(recordIds, limitPerRecord = 5) {
      await ensureIndexes();
      const normalizedIds = uniqueNonEmpty(recordIds);
      const grouped: ContentReleaseAuditByRecord = {};
      for (const recordId of normalizedIds) grouped[recordId] = [];
      if (normalizedIds.length === 0) return grouped;
      const col = await coreCol<{ _id: string; event: ContentReleaseAuditEvent }>(
        CONTENT_RELEASE_AUDIT_COLLECTION,
      );
      const docs = await col
        .find({ "event.recordId": { $in: normalizedIds } } as any)
        .sort({ "event.at": -1 })
        .toArray();
      const counts = new Map<string, number>();
      for (const doc of docs) {
        const event = ContentReleaseAuditEventSchema.parse(clone(doc.event));
        const currentCount = counts.get(event.recordId) ?? 0;
        if (currentCount >= limitPerRecord) continue;
        grouped[event.recordId] = [...(grouped[event.recordId] ?? []), event];
        counts.set(event.recordId, currentCount + 1);
      }
      return grouped;
    },
    getPersistenceState() {
      return buildPersistenceState("persistent_primary");
    },
  };
}

export function createInMemoryContentReleaseWorkbenchRepo(seed?: {
  records?: ContentReleaseTargetRecord[];
  auditEvents?: ContentReleaseAuditEvent[];
}): ContentReleaseRepository {
  const records = new Map<string, ContentReleaseTargetRecord>();
  const auditEvents = new Map<string, ContentReleaseAuditEvent>();
  for (const record of seed?.records ?? []) {
    const parsed = ContentReleaseTargetRecordSchema.parse(record);
    records.set(parsed.id, clone(parsed));
  }
  for (const event of seed?.auditEvents ?? []) {
    const parsed = ContentReleaseAuditEventSchema.parse(event);
    auditEvents.set(parsed.id, clone(parsed));
  }
  return {
    async getTargetRecord(sourceKind, sourceResultId, targetType) {
      return (
        Array.from(records.values()).find(
          (record) =>
            record.sourceKind === sourceKind &&
            record.sourceResultId === sourceResultId &&
            record.targetType === targetType,
        ) ?? null
      );
    },
    async listTargetRecordsForSourceResult(sourceKind, sourceResultId) {
      return Array.from(records.values())
        .filter((record) => record.sourceKind === sourceKind && record.sourceResultId === sourceResultId)
        .map((record) => clone(record));
    },
    async listTargetRecordsByType(targetType) {
      return Array.from(records.values())
        .filter((record) => record.targetType === targetType)
        .map((record) => clone(record));
    },
    async getTargetRecordByTargetId(targetType, targetId) {
      return (
        Array.from(records.values()).find(
          (record) => record.targetType === targetType && record.targetId === targetId,
        ) ?? null
      );
    },
    async saveTargetRecord(record) {
      records.set(record.id, clone(record));
    },
    async appendAuditEvent(event) {
      auditEvents.set(event.id, clone(event));
    },
    async listAuditEvents(recordId) {
      return Array.from(auditEvents.values())
        .filter((event) => event.recordId === recordId)
        .map((event) => clone(event))
        .sort((left, right) => String(right.at).localeCompare(String(left.at)));
    },
    async listAuditEventsForRecords(recordIds, limitPerRecord = 5) {
      const normalizedIds = uniqueNonEmpty(recordIds);
      const grouped: ContentReleaseAuditByRecord = {};
      for (const recordId of normalizedIds) {
        grouped[recordId] = Array.from(auditEvents.values())
          .filter((event) => event.recordId === recordId)
          .map((event) => clone(event))
          .sort((left, right) => String(right.at).localeCompare(String(left.at)))
          .slice(0, limitPerRecord);
      }
      return grouped;
    },
    getPersistenceState() {
      return buildPersistenceState("in_memory_fallback");
    },
  };
}

function getRepo() {
  if (shouldUseInMemoryMongoFallback()) {
    if (!repoSingleton) repoSingleton = createInMemoryContentReleaseWorkbenchRepo();
    return repoSingleton;
  }
  if (!repoSingleton) repoSingleton = createMongoRepo();
  return repoSingleton;
}

export function setContentReleaseWorkbenchRepoForTests(
  repo: ContentReleaseRepository | null,
) {
  repoSingleton = repo;
  indexesReady = false;
}

export function getContentReleaseRepository(): ContentReleaseRepository {
  return getRepo();
}

export function getContentReleasePersistenceState() {
  return getRepo().getPersistenceState();
}

function buildRecord(params: {
  sourceKind: ContentReleaseSourceKind;
  sourceResultId: string;
  sourceReviewItemId: string;
  regionId: string | null;
  organizationId: string | null;
  targetType: ContentReleaseTargetType;
  targetId: string;
  title: string;
  summary: string;
  topicPageData?: ContentReleaseTopicPageData | null;
  requestedBy: string;
}) {
  const now = isoNow();
  const publicHref = publicHrefFor(params.targetType, params.targetId);
  return ContentReleaseTargetRecordSchema.parse({
    id: recordIdFor(params.sourceKind, params.sourceResultId, params.targetType),
    sourceKind: params.sourceKind,
    sourceResultId: params.sourceResultId,
    sourceReviewItemId: params.sourceReviewItemId,
    regionId: params.regionId,
    organizationId: params.organizationId,
    targetType: params.targetType,
    targetId: params.targetId,
    title: params.title,
    summary: params.summary,
    previewHref: previewHrefFor(params.targetType, params.targetId),
    publicHref,
    topicPageData: params.topicPageData ?? null,
    visibilityState: "internal_review",
    createdByUserId: params.requestedBy,
    createdAt: now,
    updatedByUserId: params.requestedBy,
    updatedAt: now,
    reviewRequired: true,
    noAutoPublish: true,
    noPublicOfficial: true,
    noSocialPublishing: true,
    noAutomaticOfficialResponse: true,
    noAutoFinalization: true,
    revokable: true,
    archivable: true,
  });
}

export async function prepareContentReleaseTargetFromSourceResult(
  input: PrepareContentReleaseTargetInput,
) {
  const existing = await getRepo().getTargetRecord(
    input.sourceKind,
    input.sourceResultId,
    input.targetType,
  );
  if (existing) return existing;

  if (input.sourceKind === "region_source_result") {
    const result = await getRegionSourceTestResultById(input.sourceResultId);
    if (!result) throw new Error("source_result_not_found");

    const prepared =
      input.targetType === "dossier"
        ? await ensureDossierDraftFromSourceResult({
            result,
            requestedBy: input.requestedBy,
            organizationId: input.organizationId,
          })
        : input.targetType === "anlassraum"
          ? await ensureAnlassraumFromSourceResult({
              result,
              requestedBy: input.requestedBy,
            })
          : await ensureTopicPageFromSourceResult({
              result,
            });

    const topicPageData =
      input.targetType === "topic_page"
        ? (prepared as Awaited<ReturnType<typeof ensureTopicPageFromSourceResult>>).topicPageData
        : null;
    const record = buildRecord({
      sourceKind: input.sourceKind,
      sourceResultId: result.id,
      sourceReviewItemId: `region_source_result:${result.id}`,
      regionId: result.regionId,
      organizationId: input.organizationId ?? result.organizationId ?? null,
      targetType: input.targetType,
      targetId: prepared.targetId,
      title: prepared.title,
      summary: prepared.summary,
      topicPageData,
      requestedBy: input.requestedBy,
    });
    await getRepo().saveTargetRecord(record);
    await getRepo().appendAuditEvent({
      id: auditEventIdFor(record.id, "prepared", record.updatedAt),
      recordId: record.id,
      sourceKind: record.sourceKind,
      sourceResultId: record.sourceResultId,
      targetType: record.targetType,
      action: "prepared",
      byUserId: input.requestedBy,
      note: "Target bewusst aus Review-Queue vorbereitet.",
      at: record.updatedAt,
    });
    return record;
  }

  const handoff = await getPersistedCreateHandoffRecord(input.sourceResultId);
  if (!handoff) throw new Error("create_handoff_not_found");
  const prepared =
    input.targetType === "dossier"
      ? await ensureDossierDraftFromCreateHandoff({
          record: handoff,
          requestedBy: input.requestedBy,
          organizationId: input.organizationId,
        })
      : input.targetType === "anlassraum"
        ? await ensureAnlassraumFromCreateHandoff({
            record: handoff,
            requestedBy: input.requestedBy,
          })
        : await ensureTopicPageFromCreateHandoff({
            record: handoff,
          });
  const topicPageData =
    input.targetType === "topic_page"
      ? (prepared as Awaited<ReturnType<typeof ensureTopicPageFromCreateHandoff>>).topicPageData
      : null;
  const record = buildRecord({
    sourceKind: input.sourceKind,
    sourceResultId: handoff.id,
    sourceReviewItemId: `create_handoff:${handoff.id}`,
    regionId: handoff.regionId,
    organizationId: input.organizationId ?? handoff.organizationId ?? null,
    targetType: input.targetType,
    targetId: prepared.targetId,
    title: prepared.title,
    summary: prepared.summary,
    topicPageData,
    requestedBy: input.requestedBy,
  });
  await getRepo().saveTargetRecord(record);
  await getRepo().appendAuditEvent({
    id: auditEventIdFor(record.id, "prepared", record.updatedAt),
    recordId: record.id,
    sourceKind: record.sourceKind,
    sourceResultId: record.sourceResultId,
    targetType: record.targetType,
    action: "prepared",
    byUserId: input.requestedBy,
    note: "Target bewusst aus Review-Queue vorbereitet.",
    at: record.updatedAt,
  });
  return record;
}

export async function updateContentReleaseTargetFromSourceResult(
  input: UpdateContentReleaseTargetInput,
) {
  const existing = await getRepo().getTargetRecord(
    input.sourceKind,
    input.sourceResultId,
    input.targetType,
  );
  if (!existing) throw new Error("content_release_target_not_prepared");
  const nextVisibilityState = nextVisibilityStateForAction(existing.visibilityState, input.action);
  if (nextVisibilityState === "public_official") {
    throw new Error("public_official_requires_official_release");
  }
  const updatedAt = isoNow();
  const next = ContentReleaseTargetRecordSchema.parse({
    ...existing,
    visibilityState: nextVisibilityState,
    updatedByUserId: input.requestedBy,
    updatedAt,
  });
  await getRepo().saveTargetRecord(next);
  const auditAction = auditActionForVisibilityAction(input.action);
  await getRepo().appendAuditEvent({
    id: auditEventIdFor(next.id, auditAction, updatedAt),
    recordId: next.id,
    sourceKind: next.sourceKind,
    sourceResultId: next.sourceResultId,
    targetType: next.targetType,
    action: auditAction,
    byUserId: input.requestedBy,
    note: input.note ?? null,
    at: updatedAt,
  });
  await recordPersistentContentReleaseAudit({
    record: next,
    action: auditAction,
    note: input.note ?? null,
    before: existing.visibilityState,
    after: next.visibilityState,
  });
  return next;
}

export async function listContentReleaseTargetsForSourceResult(
  sourceKind: ContentReleaseSourceKind,
  sourceResultId: string,
) {
  return getRepo().listTargetRecordsForSourceResult(sourceKind, sourceResultId);
}

export async function listContentReleaseTargetsByType(
  targetType: ContentReleaseTargetType,
) {
  return getRepo().listTargetRecordsByType(targetType);
}

export async function listContentReleaseAuditEvents(recordId: string) {
  return getRepo().listAuditEvents(recordId);
}

export async function listContentReleaseAuditEventsForRecords(
  recordIds: string[],
  limitPerRecord = 5,
) {
  return getRepo().listAuditEventsForRecords(recordIds, limitPerRecord);
}

export async function getContentReleaseTargetRecord(
  sourceKind: ContentReleaseSourceKind,
  sourceResultId: string,
  targetType: ContentReleaseTargetType,
) {
  return getRepo().getTargetRecord(sourceKind, sourceResultId, targetType);
}

export async function getContentReleaseTargetRecordByTargetId(
  targetType: ContentReleaseTargetType,
  targetId: string,
) {
  return getRepo().getTargetRecordByTargetId(targetType, targetId);
}

export async function buildContentReleaseWorkbenchTargets(params: {
  sourceKind: ContentReleaseSourceKind;
  result: RegionSourceTestResult;
  canPrepare: boolean;
  canPreparePublication: boolean;
}) {
  const existingRecords = await listContentReleaseTargetsForSourceResult(
    params.sourceKind,
    params.result.id,
  );
  const auditByRecord = await listContentReleaseAuditEventsForRecords(
    existingRecords.map((record) => record.id),
  );
  const recordByType = new Map(existingRecords.map((record) => [record.targetType, record]));
  return Promise.all(CONTENT_RELEASE_TARGET_TYPES.map(async (targetType): Promise<ContentReleaseWorkbenchTarget> => {
    const record = recordByType.get(targetType) ?? null;
    const preview = await buildPublishPreview({
      targetType,
      suggestedTitle: record?.title ?? suggestedTitleForTarget(params.result, targetType),
      record,
      auditEvents: record ? auditByRecord[record.id] ?? [] : [],
    });
    const publicHref = preview.publicLink?.href ?? null;
    const shareHref = preview.publicLink?.shareHref ?? null;
    const qrHref = preview.publicLink?.qrHref ?? null;
    return {
      targetType,
      targetLabel: targetLabel(targetType),
      suggestedTitle: preview.suggestedTitle,
      targetId: record?.targetId ?? null,
      prepared: Boolean(record),
      previewHref: preview.previewHref,
      publicHref,
      shareHref,
      qrHref,
      publicLink: preview.publicLink,
      publishStatus: preview.publishStatus,
      publishStatusLabel: preview.publishStatusLabel,
      visibilityState: preview.visibilityState,
      visibilityLabel: preview.visibilityLabel,
      statusLabel: preview.publishStatusLabel,
      statusHint: preview.statusHint,
      canPrepare: !record && params.canPrepare,
      canMakeVisible: Boolean(record) && params.canPrepare && canMakeVisibleFromState(preview.visibilityState),
      canPreparePublication:
        Boolean(record) &&
        params.canPreparePublication &&
        canPreparePublicationFromState(preview.visibilityState),
      canRevokeVisibility:
        Boolean(record) &&
        params.canPreparePublication &&
        canRevokeVisibilityFromState(preview.visibilityState),
      canArchive:
        Boolean(record) &&
        params.canPreparePublication &&
        canArchiveFromState(preview.visibilityState),
      canCreateQrLink: Boolean(qrHref),
      auditEvents: preview.auditEvents,
    };
  }));
}

export async function buildContentReleaseWorkbenchTargetsForCreateHandoff(params: {
  sourceKind: ContentReleaseSourceKind;
  record: PersistedCreateHandoffRecord;
  canPrepare: boolean;
  canPreparePublication: boolean;
}) {
  const existingRecords = await listContentReleaseTargetsForSourceResult(
    params.sourceKind,
    params.record.id,
  );
  const auditByRecord = await listContentReleaseAuditEventsForRecords(
    existingRecords.map((record) => record.id),
  );
  const recordByType = new Map(existingRecords.map((record) => [record.targetType, record]));
  return Promise.all(CONTENT_RELEASE_TARGET_TYPES.map(async (targetType): Promise<ContentReleaseWorkbenchTarget> => {
    const existing = recordByType.get(targetType) ?? null;
    const preview = await buildPublishPreview({
      targetType,
      suggestedTitle: existing?.title ?? suggestedTitleForCreateHandoff(params.record, targetType),
      record: existing,
      auditEvents: existing ? auditByRecord[existing.id] ?? [] : [],
    });
    const publicHref = preview.publicLink?.href ?? null;
    const shareHref = preview.publicLink?.shareHref ?? null;
    const qrHref = preview.publicLink?.qrHref ?? null;
    return {
      targetType,
      targetLabel: targetLabel(targetType),
      suggestedTitle: preview.suggestedTitle,
      targetId: existing?.targetId ?? null,
      prepared: Boolean(existing),
      previewHref: preview.previewHref,
      publicHref,
      shareHref,
      qrHref,
      publicLink: preview.publicLink,
      publishStatus: preview.publishStatus,
      publishStatusLabel: preview.publishStatusLabel,
      visibilityState: preview.visibilityState,
      visibilityLabel: preview.visibilityLabel,
      statusLabel: preview.publishStatusLabel,
      statusHint: preview.statusHint,
      canPrepare: !existing && params.canPrepare,
      canMakeVisible:
        Boolean(existing) &&
        params.canPrepare &&
        canMakeVisibleFromState(preview.visibilityState),
      canPreparePublication:
        Boolean(existing) &&
        params.canPreparePublication &&
        canPreparePublicationFromState(preview.visibilityState),
      canRevokeVisibility:
        Boolean(existing) &&
        params.canPreparePublication &&
        canRevokeVisibilityFromState(preview.visibilityState),
      canArchive:
        Boolean(existing) &&
        params.canPreparePublication &&
        canArchiveFromState(preview.visibilityState),
      canCreateQrLink: Boolean(qrHref),
      auditEvents: preview.auditEvents,
    };
  }));
}

export async function preparePublishPreview(
  input: PrepareContentReleaseTargetInput,
): Promise<ContentPublishPreview> {
  const record = await prepareContentReleaseTargetFromSourceResult(input);
  return buildPublishPreview({
    targetType: record.targetType,
    suggestedTitle: record.title,
    record,
  });
}

export async function makeContentVisible(
  input: Omit<UpdateContentReleaseTargetInput, "action">,
) {
  return updateContentReleaseTargetFromSourceResult({
    ...input,
    action: "make_visible",
  });
}

export async function archiveVisibleContent(
  input: Omit<UpdateContentReleaseTargetInput, "action">,
) {
  return updateContentReleaseTargetFromSourceResult({
    ...input,
    action: "archive_target",
  });
}

export async function revokeVisibility(
  input: Omit<UpdateContentReleaseTargetInput, "action">,
) {
  return updateContentReleaseTargetFromSourceResult({
    ...input,
    action: "retract_visibility",
  });
}

export async function getPublicContentLink(input: {
  sourceKind: ContentReleaseSourceKind;
  sourceResultId: string;
  targetType: ContentReleaseTargetType;
}) {
  const record = await getContentReleaseTargetRecord(
    input.sourceKind,
    input.sourceResultId,
    input.targetType,
  );
  if (!record) return null;
  return publicContentLinkFor(record.publicHref, record.visibilityState);
}

export async function prepareTopicPagePreview(
  input: Omit<PrepareContentReleaseTargetInput, "targetType">,
) {
  return preparePublishPreview({
    ...input,
    targetType: "topic_page",
  });
}

export async function makeTopicPageVisible(
  input: Omit<UpdateContentReleaseTargetInput, "targetType" | "action">,
) {
  return makeContentVisible({
    ...input,
    targetType: "topic_page",
  });
}

export async function archiveTopicPage(
  input: Omit<UpdateContentReleaseTargetInput, "targetType" | "action">,
) {
  return archiveVisibleContent({
    ...input,
    targetType: "topic_page",
  });
}

export async function revokeTopicPageVisibility(
  input: Omit<UpdateContentReleaseTargetInput, "targetType" | "action">,
) {
  return revokeVisibility({
    ...input,
    targetType: "topic_page",
  });
}

export async function getTopicPagePublicLink(input: {
  sourceKind: ContentReleaseSourceKind;
  sourceResultId: string;
}) {
  return getPublicContentLink({
    ...input,
    targetType: "topic_page",
  });
}