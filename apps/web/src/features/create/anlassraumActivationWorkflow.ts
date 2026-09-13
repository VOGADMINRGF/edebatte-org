import type { AnlassraumStatus } from "@features/anlassraum/types";
import type {
  AnlassraumRuntimeCommunitySignal,
  AnlassraumRuntimeRecord,
  AnlassraumRuntimeSourceStatus,
  AnlassraumRuntimeStatus,
  AnlassraumRuntimeVisibility,
} from "@/features/create/anlassraumRuntime";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionActorContext,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";
import { normalizeWorkflowRecordVersion } from "@/features/create/safety/questionGuardReviewPersistence";

export const ANLASSRAUM_ACTIVATION_STATUSES = [
  "draft",
  "approved_for_activation",
  "activated",
  "approved_for_publication",
  "published",
  "rejected",
  "blocked",
  "archived",
] as const;

export type AnlassraumActivationStatus =
  (typeof ANLASSRAUM_ACTIVATION_STATUSES)[number];

export const ANLASSRAUM_ACTIVATION_BLOCKERS = [
  "anlassraum_missing",
  "anlassraum_not_created",
  "creation_not_audited",
  "activation_not_approved",
  "publication_not_approved",
  "missing_title",
  "missing_trigger",
  "missing_description",
  "source_review_pending",
  "moderation_pending",
  "unresolved_abuse_signal",
  "unresolved_trust_quality_blocker",
  "graph_context_pending",
  "dossier_context_pending",
  "public_copy_missing",
  "public_question_guard_blocked",
  "unsafe_auto_publish",
  "insufficient_audit_context",
] as const;

export type AnlassraumActivationBlocker =
  (typeof ANLASSRAUM_ACTIVATION_BLOCKERS)[number];

export const ANLASSRAUM_PUBLIC_VISIBILITIES = [
  "editorial_workspace",
  "active_internal",
  "ready_for_publication_review",
  "public",
] as const;

export type AnlassraumPublicVisibility =
  (typeof ANLASSRAUM_PUBLIC_VISIBILITIES)[number];

export const ANLASSRAUM_PUBLIC_ACCESS_MODES = [
  "none",
  "internal_only",
  "public_read_only",
] as const;

export type AnlassraumPublicAccessMode =
  (typeof ANLASSRAUM_PUBLIC_ACCESS_MODES)[number];

export type AnlassraumActivationAuditContext = {
  actorUserId: string | null;
  reason: string | null;
  origin:
    | "admin_review"
    | "anlassraum_activation_workflow"
    | "anlassraum_runtime"
    | "dossier_runtime"
    | null;
  approvedAt: string | null;
};

export type AnlassraumActivationGuardrails = {
  createdNotPublic: true;
  approvedForCreationNotPublic: true;
  activeInternalNotPublic: true;
  approvedForActivationNotPublic: true;
  approvedForPublicationNotPublicUntilPublish: true;
  noAutoPublishFromCreation: true;
  noAutoActivationFromCreation: true;
  noPublicVisibilitySideEffect: true;
  noVerifiedFactsByDefault: true;
  noVerifiedSourcesByDefault: true;
  noCommunityHintsAsTruth: true;
  noTrustOrSourceQualityAsVerification: true;
  noGraphEdgeAsProof: true;
  noDossierContextAsProof: true;
  noMajorityAsTruth: true;
  noAutoGraphWrite: true;
  noAutoMerge: true;
  noAutoFactcheck: true;
  noAutoDossierCreation: true;
  noAutoParticipationSpaceCreation: true;
  noDeepSearch: true;
  auditContextRequired: true;
};

export type AnlassraumActivationAuditEntry = {
  id: string;
  sourceHandoffId: string;
  anlassraumId: string | null;
  at: string;
  action:
    | "activation_requested"
    | "activation_approved"
    | "activation_rejected"
    | "activated_internal"
    | "publication_requested"
    | "publication_approved"
    | "publication_rejected"
    | "question_guard_reviewed"
    | "published_public";
  actorUserId: string | null;
  note: string | null;
  blockers: AnlassraumActivationBlocker[];
  status: AnlassraumActivationStatus;
  questionGuardReleaseState?: PublicQuestionGeneralizationResult["releaseState"] | null;
  questionGuardActorExtractionSource?:
    | "entity_registry"
    | "actor_graph"
    | "human_review"
    | null;
  questionGuardEvidenceRefs?: string[];
  questionGuardActorContexts?: PublicQuestionActorContext[];
  questionGuardHumanReviewFinding?:
    | "actor_contexts_supplied"
    | "no_named_actors"
    | null;
};

export type AnlassraumActivationDraft = {
  version: number;
  id: string;
  sourceHandoffId: string;
  sourceReviewItemId: string;
  statementId: string;
  anlassraumId: string | null;
  anlassraumSlug: string | null;
  runtimeStatus: AnlassraumRuntimeStatus;
  runtimeVisibility: AnlassraumRuntimeVisibility;
  roomStatus: AnlassraumStatus | null;
  roomIsPublic: boolean;
  title: string;
  workingTitle: string;
  trigger: string;
  questionGuard: PublicQuestionGeneralizationResult;
  description: string;
  relatedDossierId: string | null;
  recognizedStandpoints: string[];
  argumentLines: string[];
  openQuestions: string[];
  sourceStatus: AnlassraumRuntimeSourceStatus;
  communitySignals: AnlassraumRuntimeCommunitySignal[];
  graphReferences: string[];
  topicReferences: string[];
  moderationPending: boolean;
  unresolvedAbuseSignal: boolean;
  unresolvedTrustQualityBlocker: boolean;
  graphContextPending: boolean;
  dossierContextPending: boolean;
  creationAudited: boolean;
  status: AnlassraumActivationStatus;
  visibility: AnlassraumPublicVisibility;
  publicAccessMode: AnlassraumPublicAccessMode;
  blockers: AnlassraumActivationBlocker[];
  auditContext: AnlassraumActivationAuditContext;
  guardrails: AnlassraumActivationGuardrails;
  createdAt: string;
  updatedAt: string;
};

export type AnlassraumActivationRecord = AnlassraumActivationDraft & {
  auditTrail: AnlassraumActivationAuditEntry[];
  approvedForActivationAt: string | null;
  approvedForActivationBy: string | null;
  approvedForPublicationAt: string | null;
  approvedForPublicationBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
};

type BuildDraftInput = {
  version?: number;
  runtimeRecord: AnlassraumRuntimeRecord;
  createdRoom: {
    id: string | null;
    slug: string | null;
    status: AnlassraumStatus | null;
    isPublic: boolean;
    updatedAt?: string | null;
  } | null;
  creationAudited: boolean;
  questionGuard?: PublicQuestionGeneralizationResult | null;
  status?: AnlassraumActivationStatus;
  visibility?: AnlassraumPublicVisibility;
  publicAccessMode?: AnlassraumPublicAccessMode;
  auditContext?: Partial<AnlassraumActivationAuditContext>;
  approvedForActivationAt?: string | null;
  approvedForActivationBy?: string | null;
  approvedForPublicationAt?: string | null;
  approvedForPublicationBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AnlassraumQuestionGuardReviewInput = {
  actorExtractionSource: "entity_registry" | "actor_graph" | "human_review";
  evidenceRefs: string[];
  actorContexts?: PublicQuestionActorContext[];
  noNamedActorsConfirmed?: boolean;
  reviewedAt?: string | null;
};

type TransitionResult =
  | { ok: true; record: AnlassraumActivationRecord }
  | {
      ok: false;
      error: "blocked";
      message: string;
      blockers: AnlassraumActivationBlocker[];
      record: AnlassraumActivationRecord;
    };

function nowIso() {
  return new Date().toISOString();
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function trimOrNull(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function defaultGuardrails(): AnlassraumActivationGuardrails {
  return {
    createdNotPublic: true,
    approvedForCreationNotPublic: true,
    activeInternalNotPublic: true,
    approvedForActivationNotPublic: true,
    approvedForPublicationNotPublicUntilPublish: true,
    noAutoPublishFromCreation: true,
    noAutoActivationFromCreation: true,
    noPublicVisibilitySideEffect: true,
    noVerifiedFactsByDefault: true,
    noVerifiedSourcesByDefault: true,
    noCommunityHintsAsTruth: true,
    noTrustOrSourceQualityAsVerification: true,
    noGraphEdgeAsProof: true,
    noDossierContextAsProof: true,
    noMajorityAsTruth: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    noAutoFactcheck: true,
    noAutoDossierCreation: true,
    noAutoParticipationSpaceCreation: true,
    noDeepSearch: true,
    auditContextRequired: true,
  };
}

function defaultStatusFromRuntime(
  record: AnlassraumRuntimeRecord,
): AnlassraumActivationStatus {
  if (record.visibility === "published") return "published";
  if (record.visibility === "active_internal") return "activated";
  return "draft";
}

function defaultVisibilityFromStatus(
  status: AnlassraumActivationStatus,
): AnlassraumPublicVisibility {
  if (status === "published") return "public";
  if (status === "approved_for_publication") {
    return "ready_for_publication_review";
  }
  if (status === "activated") return "active_internal";
  return "editorial_workspace";
}

function defaultPublicAccessMode(
  status: AnlassraumActivationStatus,
): AnlassraumPublicAccessMode {
  if (status === "published") return "public_read_only";
  if (status === "activated" || status === "approved_for_publication") {
    return "internal_only";
  }
  return "none";
}

function requiresActivationApproval(status: AnlassraumActivationStatus) {
  return ![
    "approved_for_activation",
    "activated",
    "approved_for_publication",
    "published",
  ].includes(status);
}

function requiresPublicationApproval(status: AnlassraumActivationStatus) {
  return !["approved_for_publication", "published"].includes(status);
}

function hasPublishLeak(record: AnlassraumActivationDraft) {
  return (
    record.status === "published" &&
    (record.visibility !== "public" ||
      record.publicAccessMode !== "public_read_only" ||
      record.roomIsPublic !== true)
  );
}

function buildAuditContext(
  existing: AnlassraumActivationAuditContext,
  next: AnlassraumActivationAuditContext,
) {
  return {
    actorUserId: trimOrNull(next.actorUserId) ?? trimOrNull(existing.actorUserId),
    reason: trimOrNull(next.reason) ?? trimOrNull(existing.reason),
    origin: next.origin ?? existing.origin ?? null,
    approvedAt: trimOrNull(next.approvedAt) ?? trimOrNull(existing.approvedAt),
  } satisfies AnlassraumActivationAuditContext;
}

export function getAnlassraumActivationBlockers(
  record: AnlassraumActivationDraft,
): AnlassraumActivationBlocker[] {
  const blockers = new Set<AnlassraumActivationBlocker>();

  if (!record.anlassraumId) blockers.add("anlassraum_missing");
  if (record.runtimeStatus !== "created" || !record.anlassraumId) {
    blockers.add("anlassraum_not_created");
  }
  if (!record.creationAudited) blockers.add("creation_not_audited");
  if (!hasText(record.title)) blockers.add("missing_title");
  if (!hasText(record.trigger)) blockers.add("missing_trigger");
  if (!hasText(record.description)) blockers.add("missing_description");
  const questionGuard =
    record.questionGuard ??
    evaluatePublicQuestionGeneralization({
      originalInput: record.description,
      candidatePublicQuestion: record.trigger,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "not_available",
        independentFromCandidateProvider: false,
        evidenceRefs: [],
      },
    });
  if (questionGuard.releaseState !== "draft_allowed") {
    blockers.add("public_question_guard_blocked");
  }
  if (
    !hasText(record.title) ||
    !hasText(record.trigger) ||
    !hasText(record.description)
  ) {
    blockers.add("public_copy_missing");
  }
  if (record.sourceStatus === "source_review_pending") {
    blockers.add("source_review_pending");
  }
  if (record.moderationPending) blockers.add("moderation_pending");
  if (record.unresolvedAbuseSignal) blockers.add("unresolved_abuse_signal");
  if (record.unresolvedTrustQualityBlocker) {
    blockers.add("unresolved_trust_quality_blocker");
  }
  if (record.graphContextPending) blockers.add("graph_context_pending");
  if (record.dossierContextPending) blockers.add("dossier_context_pending");
  if (requiresActivationApproval(record.status)) blockers.add("activation_not_approved");
  if (requiresPublicationApproval(record.status)) {
    blockers.add("publication_not_approved");
  }
  if (
    !trimOrNull(record.auditContext.actorUserId) ||
    !trimOrNull(record.auditContext.reason)
  ) {
    blockers.add("insufficient_audit_context");
  }
  if (hasPublishLeak(record)) blockers.add("unsafe_auto_publish");

  return Array.from(blockers);
}

function withBlockers<T extends AnlassraumActivationDraft>(record: T): T {
  return {
    ...record,
    blockers: getAnlassraumActivationBlockers(record),
  };
}

function buildBlockedResult(
  record: AnlassraumActivationRecord,
  message: string,
  ignoredBlockers: AnlassraumActivationBlocker[] = [],
): TransitionResult {
  const blockers = getAnlassraumActivationBlockers(record).filter(
    (blocker) => !ignoredBlockers.includes(blocker),
  );
  if (blockers.length === 0) {
    return {
      ok: true,
      record: {
        ...record,
        blockers: getAnlassraumActivationBlockers(record),
      },
    };
  }
  return {
    ok: false,
    error: "blocked",
    message,
    blockers,
    record: {
      ...record,
      status: "blocked",
      blockers,
    },
  };
}

export function buildAnlassraumActivationDraft(
  input: BuildDraftInput,
): AnlassraumActivationDraft {
  const status = input.status ?? defaultStatusFromRuntime(input.runtimeRecord);
  const visibility = input.visibility ?? defaultVisibilityFromStatus(status);
  const publicAccessMode =
    input.publicAccessMode ?? defaultPublicAccessMode(status);
  const questionGuard =
    input.questionGuard ??
    input.runtimeRecord.questionGuard ??
    evaluatePublicQuestionGeneralization({
      originalInput: input.runtimeRecord.description,
      candidatePublicQuestion: input.runtimeRecord.trigger,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: input.runtimeRecord.graphReferences,
      },
    });

  const draft: AnlassraumActivationDraft = {
    version: normalizeWorkflowRecordVersion(input.version),
    id: `anlassraum-activation:${input.runtimeRecord.sourceHandoffId}`,
    sourceHandoffId: input.runtimeRecord.sourceHandoffId,
    sourceReviewItemId: input.runtimeRecord.sourceReviewItemId,
    statementId: input.runtimeRecord.statementId,
    anlassraumId:
      trimOrNull(input.createdRoom?.id) ??
      trimOrNull(input.runtimeRecord.createdAnlassraumId),
    anlassraumSlug: trimOrNull(input.createdRoom?.slug),
    runtimeStatus: input.runtimeRecord.status,
    runtimeVisibility: input.runtimeRecord.visibility,
    roomStatus: input.createdRoom?.status ?? null,
    roomIsPublic: Boolean(input.createdRoom?.isPublic),
    title: input.runtimeRecord.title,
    workingTitle: input.runtimeRecord.workingTitle,
    trigger: input.runtimeRecord.trigger,
    questionGuard,
    description: input.runtimeRecord.description,
    relatedDossierId: input.runtimeRecord.relatedDossierId,
    recognizedStandpoints: unique(input.runtimeRecord.recognizedStandpoints),
    argumentLines: unique(input.runtimeRecord.argumentLines),
    openQuestions: unique(input.runtimeRecord.openQuestions),
    sourceStatus: input.runtimeRecord.sourceStatus,
    communitySignals: input.runtimeRecord.communitySignals,
    graphReferences: unique(input.runtimeRecord.graphReferences),
    topicReferences: unique(input.runtimeRecord.topicReferences),
    moderationPending: input.runtimeRecord.moderationPending,
    unresolvedAbuseSignal: input.runtimeRecord.unresolvedAbuseSignal,
    unresolvedTrustQualityBlocker:
      input.runtimeRecord.unresolvedTrustQualityBlocker,
    graphContextPending: input.runtimeRecord.graphContextPending,
    dossierContextPending: input.runtimeRecord.dossierContextPending,
    creationAudited: input.creationAudited,
    status,
    visibility,
    publicAccessMode,
    blockers: [],
    auditContext: {
      actorUserId: trimOrNull(input.auditContext?.actorUserId),
      reason: trimOrNull(input.auditContext?.reason),
      origin: input.auditContext?.origin ?? null,
      approvedAt: trimOrNull(input.auditContext?.approvedAt),
    },
    guardrails: defaultGuardrails(),
    createdAt: trimOrNull(input.createdAt) ?? input.runtimeRecord.createdAt,
    updatedAt:
      trimOrNull(input.updatedAt) ??
      trimOrNull(input.createdRoom?.updatedAt) ??
      input.runtimeRecord.updatedAt,
  };

  return withBlockers(draft);
}

export function reviewAnlassraumQuestionGuard(
  record: AnlassraumActivationRecord,
  input: AnlassraumQuestionGuardReviewInput,
): AnlassraumActivationRecord {
  if (
    !["entity_registry", "actor_graph", "human_review"].includes(
      input.actorExtractionSource,
    )
  ) {
    throw new Error("public_question_guard_review_source_invalid");
  }
  const evidenceRefs = unique(input.evidenceRefs);
  if (evidenceRefs.length === 0) {
    throw new Error("public_question_guard_review_evidence_required");
  }
  const actorContexts = input.actorContexts ?? record.questionGuard.actorContexts;
  if (
    input.actorExtractionSource === "human_review" &&
    actorContexts.length === 0 &&
    input.noNamedActorsConfirmed !== true
  ) {
    throw new Error("public_question_guard_actor_finding_required");
  }
  const questionGuard = evaluatePublicQuestionGeneralization({
    originalInput: record.questionGuard.originalInput,
    candidatePublicQuestion: record.trigger,
    actorContexts,
    actorExtraction: {
      status: "complete",
      source: input.actorExtractionSource,
      independentFromCandidateProvider: true,
      evidenceRefs,
      ...(input.actorExtractionSource === "human_review"
        ? {
            humanReviewFinding:
              actorContexts.length > 0
                ? ("actor_contexts_supplied" as const)
                : ("no_named_actors" as const),
          }
        : {}),
    },
    procedure: record.questionGuard.procedure,
    procedureReviewResolution:
      record.questionGuard.outcome ===
        "entity_specific_procedure_review_required" &&
      input.actorExtractionSource === "human_review"
        ? {
            previousOutcome: "entity_specific_procedure_review_required",
            decision: "approved_after_human_review",
          }
        : null,
  });
  return withBlockers({
    ...record,
    status: "draft",
    visibility: "editorial_workspace",
    publicAccessMode: "none",
    roomStatus: "review_required",
    roomIsPublic: false,
    questionGuard,
    approvedForActivationAt: null,
    approvedForActivationBy: null,
    approvedForPublicationAt: null,
    approvedForPublicationBy: null,
    updatedAt: trimOrNull(input.reviewedAt) ?? nowIso(),
  });
}

export function isAnlassraumPubliclyReleased(
  record: AnlassraumActivationRecord,
): boolean {
  return (
    record.status === "published" &&
    record.visibility === "public" &&
    record.publicAccessMode === "public_read_only" &&
    record.roomIsPublic === true &&
    record.questionGuard?.releaseState === "draft_allowed" &&
    Boolean(record.approvedForActivationAt) &&
    Boolean(record.approvedForActivationBy) &&
    Boolean(record.approvedForPublicationAt) &&
    Boolean(record.approvedForPublicationBy) &&
    getAnlassraumActivationBlockers(record).length === 0
  );
}

export function canApproveAnlassraumActivation(
  record: AnlassraumActivationRecord,
): boolean {
  if (["published", "rejected", "archived"].includes(record.status)) return false;
  const blockers = getAnlassraumActivationBlockers(record).filter(
    (blocker) =>
      blocker !== "activation_not_approved" &&
      blocker !== "publication_not_approved" &&
      blocker !== "insufficient_audit_context",
  );
  return blockers.length === 0;
}

export function canActivateAnlassraum(
  record: AnlassraumActivationRecord,
): boolean {
  if (
    record.status !== "approved_for_activation" ||
    !record.approvedForActivationAt ||
    !record.approvedForActivationBy
  ) {
    return false;
  }
  const blockers = getAnlassraumActivationBlockers(record).filter(
    (blocker) =>
      blocker !== "publication_not_approved" &&
      blocker !== "insufficient_audit_context",
  );
  return blockers.length === 0;
}

export function canApproveAnlassraumPublication(
  record: AnlassraumActivationRecord,
): boolean {
  if (!["activated", "approved_for_publication"].includes(record.status)) {
    return false;
  }
  const blockers = getAnlassraumActivationBlockers(record).filter(
    (blocker) =>
      blocker !== "publication_not_approved" &&
      blocker !== "insufficient_audit_context",
  );
  return blockers.length === 0;
}

export function canPublishAnlassraum(
  record: AnlassraumActivationRecord,
): boolean {
  if (
    record.status !== "approved_for_publication" ||
    !record.approvedForPublicationAt ||
    !record.approvedForPublicationBy
  ) {
    return false;
  }
  return getAnlassraumActivationBlockers(record).length === 0;
}

export function approveAnlassraumActivation(
  record: AnlassraumActivationRecord,
  auditContext: AnlassraumActivationAuditContext,
): AnlassraumActivationRecord {
  const approvedAt = trimOrNull(auditContext.approvedAt) ?? nowIso();
  const merged = withBlockers({
    ...record,
    status: "approved_for_activation",
    visibility: "editorial_workspace",
    publicAccessMode: "none",
    roomIsPublic: false,
    auditContext: buildAuditContext(record.auditContext, {
      ...auditContext,
      approvedAt,
    }),
    approvedForActivationAt: approvedAt,
    approvedForActivationBy: trimOrNull(auditContext.actorUserId),
    updatedAt: approvedAt,
  });

  const blocking = merged.blockers.filter(
    (blocker) =>
      blocker !== "publication_not_approved" &&
      blocker !== "activation_not_approved",
  );
  if (blocking.length > 0) {
    return {
      ...merged,
      status: "blocked",
      blockers: blocking,
    };
  }
  return merged;
}

export function rejectAnlassraumActivation(
  record: AnlassraumActivationRecord,
  auditContext: AnlassraumActivationAuditContext,
): AnlassraumActivationRecord {
  const rejectedAt = trimOrNull(auditContext.approvedAt) ?? nowIso();
  return {
    ...record,
    status: "rejected",
    blockers: [],
    auditContext: buildAuditContext(record.auditContext, {
      ...auditContext,
      approvedAt: rejectedAt,
    }),
    rejectedAt,
    rejectedBy: trimOrNull(auditContext.actorUserId),
    updatedAt: rejectedAt,
  };
}

export function activateAnlassraumAfterReview(
  record: AnlassraumActivationRecord,
  auditContext: AnlassraumActivationAuditContext,
): TransitionResult {
  if (!canActivateAnlassraum(record)) {
    const blockers = Array.from(
      new Set<AnlassraumActivationBlocker>([
        ...getAnlassraumActivationBlockers(record),
        "activation_not_approved",
      ]),
    );
    return {
      ok: false,
      error: "blocked",
      message:
        "Anlassraum-Aktivierung bleibt blockiert, bis eine neue explizite Freigabe nach dem Guard-Review vorliegt.",
      blockers,
      record: {
        ...record,
        status: "blocked",
        blockers,
      },
    };
  }
  const approvedAt = trimOrNull(auditContext.approvedAt) ?? nowIso();
  const merged: AnlassraumActivationRecord = withBlockers({
    ...record,
    status: "activated",
    visibility: "active_internal",
    publicAccessMode: "internal_only",
    roomStatus: "active",
    roomIsPublic: false,
    auditContext: buildAuditContext(record.auditContext, {
      ...auditContext,
      approvedAt,
    }),
    updatedAt: approvedAt,
  });

  return buildBlockedResult(
    merged,
    "Anlassraum-Aktivierung bleibt blockiert, bis Review-, Moderations- und Kontext-Blocker geklärt sind.",
    ["publication_not_approved"],
  );
}

export function approveAnlassraumPublication(
  record: AnlassraumActivationRecord,
  auditContext: AnlassraumActivationAuditContext,
): AnlassraumActivationRecord {
  const approvedAt = trimOrNull(auditContext.approvedAt) ?? nowIso();
  const merged = withBlockers({
    ...record,
    status: "approved_for_publication",
    visibility: "ready_for_publication_review",
    publicAccessMode: "internal_only",
    roomStatus: "active",
    roomIsPublic: false,
    auditContext: buildAuditContext(record.auditContext, {
      ...auditContext,
      approvedAt,
    }),
    approvedForPublicationAt: approvedAt,
    approvedForPublicationBy: trimOrNull(auditContext.actorUserId),
    updatedAt: approvedAt,
  });

  if (merged.blockers.length > 0) {
    return {
      ...merged,
      status: "blocked",
    };
  }
  return merged;
}

export function rejectAnlassraumPublication(
  record: AnlassraumActivationRecord,
  auditContext: AnlassraumActivationAuditContext,
): AnlassraumActivationRecord {
  const rejectedAt = trimOrNull(auditContext.approvedAt) ?? nowIso();
  return {
    ...record,
    status: "rejected",
    blockers: [],
    auditContext: buildAuditContext(record.auditContext, {
      ...auditContext,
      approvedAt: rejectedAt,
    }),
    rejectedAt,
    rejectedBy: trimOrNull(auditContext.actorUserId),
    updatedAt: rejectedAt,
  };
}

export function publishAnlassraumAfterReview(
  record: AnlassraumActivationRecord,
  auditContext: AnlassraumActivationAuditContext,
): TransitionResult {
  if (!canPublishAnlassraum(record)) {
    const blockers = Array.from(
      new Set<AnlassraumActivationBlocker>([
        ...getAnlassraumActivationBlockers(record),
        "publication_not_approved",
      ]),
    );
    return {
      ok: false,
      error: "blocked",
      message:
        "Anlassraum-Veröffentlichung bleibt blockiert, bis eine neue explizite Freigabe nach dem Guard-Review vorliegt.",
      blockers,
      record: {
        ...record,
        status: "blocked",
        blockers,
      },
    };
  }
  const approvedAt = trimOrNull(auditContext.approvedAt) ?? nowIso();
  const merged: AnlassraumActivationRecord = withBlockers({
    ...record,
    status: "published",
    visibility: "public",
    publicAccessMode: "public_read_only",
    roomStatus: "active",
    roomIsPublic: true,
    auditContext: buildAuditContext(record.auditContext, {
      ...auditContext,
      approvedAt,
    }),
    updatedAt: approvedAt,
  });

  return buildBlockedResult(
    merged,
    "Anlassraum-Veröffentlichung bleibt blockiert, bis alle Public-Review-Blocker aufgelöst sind.",
  );
}

export function blocksAnlassraumAutoActivation(
  record: AnlassraumActivationRecord,
) {
  return record.status === "draft" || record.status === "blocked";
}

export function blocksAnlassraumAutoPublish(
  record: AnlassraumActivationRecord,
) {
  return record.status !== "published";
}

export function blocksUnsafeAnlassraumPublicVisibility(
  record: AnlassraumActivationRecord,
) {
  return hasPublishLeak(record);
}

export function getAnlassraumActivationStatusLabel(
  status: AnlassraumActivationStatus,
) {
  switch (status) {
    case "draft":
      return "Aktivierung prüfen";
    case "approved_for_activation":
      return "Zur Aktivierung freigegeben";
    case "activated":
      return "Intern aktiviert";
    case "approved_for_publication":
      return "Zur Veröffentlichung freigegeben";
    case "published":
      return "Öffentlich veröffentlicht";
    case "rejected":
      return "Abgelehnt";
    case "blocked":
      return "Blockiert";
    case "archived":
      return "Archiviert";
  }
}

export function getAnlassraumPublicVisibilityLabel(
  visibility: AnlassraumPublicVisibility,
) {
  switch (visibility) {
    case "editorial_workspace":
      return "Redaktioneller Arbeitsstand";
    case "active_internal":
      return "Intern aktiv";
    case "ready_for_publication_review":
      return "Wartet auf Public Review";
    case "public":
      return "Öffentlich";
  }
}

export function getAnlassraumPublicAccessModeLabel(
  mode: AnlassraumPublicAccessMode,
) {
  switch (mode) {
    case "none":
      return "Keine öffentliche Freigabe";
    case "internal_only":
      return "Nur intern";
    case "public_read_only":
      return "Öffentlich read-only";
  }
}

export function getAnlassraumActivationBlockerLabel(
  blocker: AnlassraumActivationBlocker,
) {
  switch (blocker) {
    case "anlassraum_missing":
      return "Der erzeugte Anlassraum fehlt.";
    case "anlassraum_not_created":
      return "Vor Aktivierung muss zuerst ein Anlassraum erzeugt werden.";
    case "creation_not_audited":
      return "Die Anlassraum-Erstellung ist noch nicht belastbar auditiert.";
    case "activation_not_approved":
      return "Explizite Aktivierungsfreigabe fehlt.";
    case "publication_not_approved":
      return "Explizite Veröffentlichungsfreigabe fehlt.";
    case "missing_title":
      return "Ein belastbarer Titel fehlt.";
    case "missing_trigger":
      return "Ein belastbarer Anlass fehlt.";
    case "missing_description":
      return "Eine belastbare Beschreibung fehlt.";
    case "source_review_pending":
      return "Mindestens ein Quellenhinweis ist noch in Prüfung.";
    case "moderation_pending":
      return "Moderationsentscheidungen sind noch offen.";
    case "unresolved_abuse_signal":
      return "Ein Abuse- oder Risikosignal ist noch offen.";
    case "unresolved_trust_quality_blocker":
      return "Trust- oder Quellenqualitätsblocker sind noch offen.";
    case "graph_context_pending":
      return "Graph-Kontext ist noch nicht belastbar geklärt.";
    case "dossier_context_pending":
      return "Dossier-Kontext ist noch nicht belastbar geklärt.";
    case "public_copy_missing":
      return "Für die öffentliche Lesart fehlen noch belastbare Textbausteine.";
    case "public_question_guard_blocked":
      return "Die Leitfrage ist durch den Public-Question-Guard blockiert.";
    case "unsafe_auto_publish":
      return "Öffentliche Sichtbarkeit darf nicht als Seiteneffekt entstehen.";
    case "insufficient_audit_context":
      return "Audit-Kontext mit Akteur und Begründung fehlt.";
  }
}

export function summarizeAnlassraumActivationState(
  record: AnlassraumActivationRecord,
) {
  if (record.status === "published") {
    return "Explizit veröffentlicht. Öffentliche Sichtbarkeit bleibt read-only und ist kein Wahrheits- oder Verifikationssignal.";
  }
  if (record.status === "approved_for_publication") {
    return "Public Review ist freigegeben, aber noch nicht veröffentlicht.";
  }
  if (record.status === "activated") {
    return "Intern aktiviert. Öffentliche Sichtbarkeit bleibt weiterhin aus.";
  }
  if (record.status === "approved_for_activation") {
    return "Aktivierungsfreigabe liegt vor. Der Anlassraum ist noch nicht intern aktiviert.";
  }
  if (record.status === "blocked") {
    return "Aktivierung oder Veröffentlichung ist blockiert, bis offene Guardrails geklärt sind.";
  }
  if (record.status === "rejected") {
    return "Aktivierung oder Veröffentlichung wurde ausdrücklich zurückgewiesen.";
  }
  return "Anlassraum-Creation ist von Aktivierung und Veröffentlichung getrennt.";
}
