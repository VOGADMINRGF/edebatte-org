import type {
  ParticipationSpaceStatus,
  ParticipationSpaceVisibility,
} from "@/features/participation/spaceContainer";
import type {
  ParticipationSpaceRuntimeCommunitySignal,
  ParticipationSpaceRuntimeRecord,
  ParticipationSpaceRuntimeSourceStatus,
  ParticipationSpaceRuntimeStatus,
  ParticipationSpaceRuntimeVisibility,
} from "@/features/create/participationSpaceRuntime";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionActorContext,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";
import { normalizeWorkflowRecordVersion } from "@/features/create/safety/questionGuardReviewPersistence";

export const PARTICIPATION_SPACE_PUBLISH_STATUSES = [
  "draft",
  "queued_for_review",
  "approved_for_activation",
  "activated",
  "approved_for_publication",
  "published",
  "rejected",
  "blocked",
  "archived",
] as const;

export type ParticipationSpacePublishStatus =
  (typeof PARTICIPATION_SPACE_PUBLISH_STATUSES)[number];

export const PARTICIPATION_SPACE_PUBLISH_BLOCKERS = [
  "participation_space_missing",
  "participation_space_not_created",
  "creation_not_audited",
  "activation_not_approved",
  "publication_not_approved",
  "missing_title",
  "missing_question",
  "missing_description",
  "source_review_pending",
  "moderation_pending",
  "unresolved_abuse_signal",
  "unresolved_trust_quality_blocker",
  "graph_context_pending",
  "dossier_context_pending",
  "anlassraum_context_pending",
  "public_copy_missing",
  "moderation_policy_missing",
  "public_question_guard_blocked",
  "unsafe_auto_publish",
  "insufficient_audit_context",
] as const;

export type ParticipationSpacePublishBlocker =
  (typeof PARTICIPATION_SPACE_PUBLISH_BLOCKERS)[number];

export const PARTICIPATION_SPACE_PUBLIC_VISIBILITIES = [
  "internal_review",
  "editorial_workspace",
  "active_internal",
  "ready_for_publication_review",
  "public",
] as const;

export type ParticipationSpacePublicVisibility =
  (typeof PARTICIPATION_SPACE_PUBLIC_VISIBILITIES)[number];

export type ParticipationSpacePublishAuditContext = {
  actorUserId: string | null;
  reason: string | null;
  origin:
    | "admin_review"
    | "participation_space_publish_workflow"
    | "participation_space_runtime"
    | "dossier_runtime"
    | "anlassraum_runtime"
    | null;
  approvedAt: string | null;
};

export type ParticipationSpacePublishGuardrails = {
  createdNotPublic: true;
  approvedForCreationNotPublic: true;
  activeInternalNotPublic: true;
  readyForPublicationReviewNotPublic: true;
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
  noAnlassraumContextAsProof: true;
  noMajorityAsTruth: true;
  noAutoGraphWrite: true;
  noAutoMerge: true;
  auditContextRequired: true;
};

export type ParticipationSpacePublishAuditEntry = {
  id: string;
  sourceHandoffId: string;
  participationSpaceId: string | null;
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
  blockers: ParticipationSpacePublishBlocker[];
  status: ParticipationSpacePublishStatus;
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

export type ParticipationSpacePublishDraft = {
  version: number;
  id: string;
  sourceHandoffId: string;
  sourceReviewItemId: string;
  statementId: string;
  participationSpaceId: string | null;
  participationSpaceSlug: string | null;
  runtimeStatus: ParticipationSpaceRuntimeStatus;
  runtimeVisibility: ParticipationSpaceRuntimeVisibility;
  spaceStatus: ParticipationSpaceStatus | null;
  spaceVisibility: ParticipationSpaceVisibility | null;
  title: string;
  workingTitle: string;
  description: string;
  participationQuestion: string;
  questionGuard: PublicQuestionGeneralizationResult;
  publicHeadline: string;
  publicSummary: string;
  moderationPolicy: string | null;
  publicFeedbackAvailable: boolean;
  relatedAnlassraumId: string | null;
  relatedDossierId: string | null;
  recognizedStandpoints: string[];
  argumentLines: string[];
  openQuestions: string[];
  sourceStatus: ParticipationSpaceRuntimeSourceStatus;
  communitySignals: ParticipationSpaceRuntimeCommunitySignal[];
  graphReferences: string[];
  topicReferences: string[];
  moderationPending: boolean;
  unresolvedAbuseSignal: boolean;
  unresolvedTrustQualityBlocker: boolean;
  graphContextPending: boolean;
  dossierContextPending: boolean;
  anlassraumContextPending: boolean;
  creationAudited: boolean;
  status: ParticipationSpacePublishStatus;
  visibility: ParticipationSpacePublicVisibility;
  blockers: ParticipationSpacePublishBlocker[];
  auditContext: ParticipationSpacePublishAuditContext;
  guardrails: ParticipationSpacePublishGuardrails;
  createdAt: string;
  updatedAt: string;
};

export type ParticipationSpacePublishRecord = ParticipationSpacePublishDraft & {
  auditTrail: ParticipationSpacePublishAuditEntry[];
  approvedForActivationAt: string | null;
  approvedForActivationBy: string | null;
  approvedForPublicationAt: string | null;
  approvedForPublicationBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
};

type PublishPhase =
  | "status"
  | "activation_approval"
  | "activation"
  | "publication_approval"
  | "publication";

type BuildDraftInput = {
  version?: number;
  runtimeRecord: ParticipationSpaceRuntimeRecord;
  createdSpace: {
    id: string | null;
    slug: string | null;
    status: ParticipationSpaceStatus | null;
    visibility: ParticipationSpaceVisibility | null;
    publicHeadline?: string | null;
    publicSummary?: string | null;
    publicFeedbackAvailable?: boolean;
    updatedAt?: string | null;
  } | null;
  creationAudited: boolean;
  questionGuard?: PublicQuestionGeneralizationResult | null;
  status?: ParticipationSpacePublishStatus;
  visibility?: ParticipationSpacePublicVisibility;
  publicHeadline?: string | null;
  publicSummary?: string | null;
  moderationPolicy?: string | null;
  auditContext?: Partial<ParticipationSpacePublishAuditContext>;
  approvedForActivationAt?: string | null;
  approvedForActivationBy?: string | null;
  approvedForPublicationAt?: string | null;
  approvedForPublicationBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ParticipationSpaceQuestionGuardReviewInput = {
  actorExtractionSource: "entity_registry" | "actor_graph" | "human_review";
  evidenceRefs: string[];
  actorContexts?: PublicQuestionActorContext[];
  noNamedActorsConfirmed?: boolean;
  reviewedAt?: string | null;
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

function defaultGuardrails(): ParticipationSpacePublishGuardrails {
  return {
    createdNotPublic: true,
    approvedForCreationNotPublic: true,
    activeInternalNotPublic: true,
    readyForPublicationReviewNotPublic: true,
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
    noAnlassraumContextAsProof: true,
    noMajorityAsTruth: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    auditContextRequired: true,
  };
}

function requiresActivationApproval(status: ParticipationSpacePublishStatus) {
  return ![
    "approved_for_activation",
    "activated",
    "approved_for_publication",
    "published",
  ].includes(status);
}

function requiresPublicationApproval(status: ParticipationSpacePublishStatus) {
  return !["approved_for_publication", "published"].includes(status);
}

function isPublicationPhase(phase: PublishPhase) {
  return (
    phase === "status" ||
    phase === "publication_approval" ||
    phase === "publication"
  );
}

export function buildParticipationSpacePublishDraft(
  input: BuildDraftInput,
): ParticipationSpacePublishDraft {
  const createdAt =
    trimOrNull(input.createdAt) ??
    trimOrNull(input.runtimeRecord.createdAt) ??
    nowIso();
  const updatedAt =
    trimOrNull(input.updatedAt) ??
    trimOrNull(input.createdSpace?.updatedAt) ??
    trimOrNull(input.runtimeRecord.updatedAt) ??
    createdAt;
  const questionGuard =
    input.questionGuard ??
    input.runtimeRecord.questionGuard ??
    evaluatePublicQuestionGeneralization({
      originalInput: input.runtimeRecord.description,
      candidatePublicQuestion: input.runtimeRecord.participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: input.runtimeRecord.graphReferences,
      },
    });
  const draft: ParticipationSpacePublishDraft = {
    version: normalizeWorkflowRecordVersion(input.version),
    id: `participation-space-publish:${input.runtimeRecord.sourceHandoffId}`,
    sourceHandoffId: input.runtimeRecord.sourceHandoffId,
    sourceReviewItemId: input.runtimeRecord.sourceReviewItemId,
    statementId: input.runtimeRecord.statementId,
    participationSpaceId:
      trimOrNull(input.createdSpace?.id) ??
      trimOrNull(input.runtimeRecord.createdParticipationSpaceId),
    participationSpaceSlug:
      trimOrNull(input.createdSpace?.slug) ??
      trimOrNull(input.runtimeRecord.createdParticipationSpaceSlug),
    runtimeStatus: input.runtimeRecord.status,
    runtimeVisibility: input.runtimeRecord.visibility,
    spaceStatus: input.createdSpace?.status ?? null,
    spaceVisibility: input.createdSpace?.visibility ?? null,
    title: String(input.runtimeRecord.title || "").trim(),
    workingTitle: String(
      input.runtimeRecord.workingTitle || input.runtimeRecord.title || "",
    ).trim(),
    description: String(input.runtimeRecord.description || "").trim(),
    participationQuestion: String(
      input.runtimeRecord.participationQuestion || "",
    ).trim(),
    questionGuard,
    publicHeadline:
      trimOrNull(input.publicHeadline) ??
      trimOrNull(input.createdSpace?.publicHeadline) ??
      trimOrNull(input.runtimeRecord.participationQuestion) ??
      trimOrNull(input.runtimeRecord.title) ??
      "",
    publicSummary:
      trimOrNull(input.publicSummary) ??
      trimOrNull(input.createdSpace?.publicSummary) ??
      trimOrNull(input.runtimeRecord.description) ??
      "",
    moderationPolicy:
      trimOrNull(input.moderationPolicy) ??
      "Review-first Veröffentlichung mit expliziter Freigabe, Audit und manueller Moderation.",
    publicFeedbackAvailable: input.createdSpace?.publicFeedbackAvailable === true,
    relatedAnlassraumId: input.runtimeRecord.relatedAnlassraumId,
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
    anlassraumContextPending: input.runtimeRecord.anlassraumContextPending,
    creationAudited: input.creationAudited,
    status: input.status ?? "draft",
    visibility: input.visibility ?? "editorial_workspace",
    blockers: [],
    auditContext: {
      actorUserId: trimOrNull(input.auditContext?.actorUserId),
      reason: trimOrNull(input.auditContext?.reason),
      origin: input.auditContext?.origin ?? null,
      approvedAt: trimOrNull(input.auditContext?.approvedAt),
    },
    guardrails: defaultGuardrails(),
    createdAt,
    updatedAt,
  };

  return {
    ...draft,
    blockers: getParticipationSpacePublishBlockers(draft),
  };
}

export function reviewParticipationSpaceQuestionGuard(
  record: ParticipationSpacePublishRecord,
  input: ParticipationSpaceQuestionGuardReviewInput,
): ParticipationSpacePublishRecord {
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
    candidatePublicQuestion: record.participationQuestion,
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
  const reviewed = {
    ...record,
    status: "draft" as const,
    visibility: "editorial_workspace" as const,
    questionGuard,
    approvedForActivationAt: null,
    approvedForActivationBy: null,
    approvedForPublicationAt: null,
    approvedForPublicationBy: null,
    updatedAt: trimOrNull(input.reviewedAt) ?? nowIso(),
  };
  return {
    ...reviewed,
    blockers: getParticipationSpacePublishBlockers(reviewed),
  };
}

function getBaseBlockers(
  draft: ParticipationSpacePublishDraft | ParticipationSpacePublishRecord,
  phase: PublishPhase,
) {
  const blockers: ParticipationSpacePublishBlocker[] = [];

  if (!draft.participationSpaceId) {
    blockers.push("participation_space_not_created");
    blockers.push("participation_space_missing");
  } else if (!draft.spaceStatus || !draft.spaceVisibility) {
    blockers.push("participation_space_missing");
  }

  if (draft.runtimeStatus !== "created") {
    blockers.push("participation_space_not_created");
  }
  if (!draft.creationAudited) {
    blockers.push("creation_not_audited");
  }
  if (!hasText(draft.title)) blockers.push("missing_title");
  if (!hasText(draft.participationQuestion)) blockers.push("missing_question");
  if (!hasText(draft.description)) blockers.push("missing_description");
  const questionGuard =
    draft.questionGuard ??
    evaluatePublicQuestionGeneralization({
      originalInput: draft.description,
      candidatePublicQuestion: draft.participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "not_available",
        independentFromCandidateProvider: false,
        evidenceRefs: [],
      },
    });
  if (questionGuard.releaseState !== "draft_allowed") {
    blockers.push("public_question_guard_blocked");
  }
  if (draft.sourceStatus === "source_review_pending") {
    blockers.push("source_review_pending");
  }
  if (draft.moderationPending) blockers.push("moderation_pending");
  if (draft.unresolvedAbuseSignal) blockers.push("unresolved_abuse_signal");
  if (draft.unresolvedTrustQualityBlocker) {
    blockers.push("unresolved_trust_quality_blocker");
  }
  if (draft.graphContextPending) blockers.push("graph_context_pending");
  if (draft.dossierContextPending) blockers.push("dossier_context_pending");
  if (draft.anlassraumContextPending) blockers.push("anlassraum_context_pending");

  if (isPublicationPhase(phase)) {
    if (!hasText(draft.publicHeadline) || !hasText(draft.publicSummary)) {
      blockers.push("public_copy_missing");
    }
    if (!hasText(draft.moderationPolicy)) {
      blockers.push("moderation_policy_missing");
    }
  }

  if (
    !draft.auditContext.actorUserId ||
    !draft.auditContext.reason ||
    !draft.auditContext.origin
  ) {
    blockers.push("insufficient_audit_context");
  }
  if (blocksUnsafePublicVisibility(draft)) blockers.push("unsafe_auto_publish");

  return blockers;
}

export function getParticipationSpacePublishBlockers(
  draft: ParticipationSpacePublishDraft | ParticipationSpacePublishRecord,
  phase: PublishPhase = "status",
) {
  const blockers = getBaseBlockers(draft, phase);

  if (phase === "status" || phase === "activation") {
    if (requiresActivationApproval(draft.status)) {
      blockers.push("activation_not_approved");
    }
  }

  if (phase === "status" || phase === "publication_approval" || phase === "publication") {
    if (
      !["activated", "approved_for_publication", "published"].includes(
        draft.status,
      )
    ) {
      blockers.push("activation_not_approved");
    }
  }

  if (phase === "status" || phase === "publication") {
    if (requiresPublicationApproval(draft.status)) {
      blockers.push("publication_not_approved");
    }
  }

  return unique(blockers) as ParticipationSpacePublishBlocker[];
}

function blockersForApproval(
  record: ParticipationSpacePublishRecord,
  phase: PublishPhase,
) {
  return getParticipationSpacePublishBlockers(record, phase).filter(
    (blocker) =>
      blocker !== "activation_not_approved" &&
      blocker !== "publication_not_approved",
  );
}

export function canApproveParticipationSpaceActivation(
  record: ParticipationSpacePublishRecord,
) {
  if (record.status === "published" || record.status === "rejected") return false;
  return blockersForApproval(record, "activation_approval").length === 0;
}

export function canActivateParticipationSpace(
  record: ParticipationSpacePublishRecord,
) {
  if (
    record.status !== "approved_for_activation" ||
    !record.approvedForActivationAt ||
    !record.approvedForActivationBy
  ) {
    return false;
  }
  return getParticipationSpacePublishBlockers(record, "activation").length === 0;
}

export function canApproveParticipationSpacePublication(
  record: ParticipationSpacePublishRecord,
) {
  if (record.status === "published" || record.status === "rejected") return false;
  return getParticipationSpacePublishBlockers(record, "publication_approval").length === 0;
}

export function canPublishParticipationSpace(
  record: ParticipationSpacePublishRecord,
) {
  if (
    record.status !== "approved_for_publication" ||
    !record.approvedForPublicationAt ||
    !record.approvedForPublicationBy
  ) {
    return false;
  }
  return getParticipationSpacePublishBlockers(record, "publication").length === 0;
}

function updatedAuditContext(
  record: ParticipationSpacePublishRecord,
  input: Partial<ParticipationSpacePublishAuditContext> | undefined,
  fallbackReason: string,
) {
  return {
    actorUserId:
      trimOrNull(input?.actorUserId) ??
      trimOrNull(record.auditContext.actorUserId),
    reason:
      trimOrNull(input?.reason) ??
      trimOrNull(record.auditContext.reason) ??
      fallbackReason,
    origin: input?.origin ?? record.auditContext.origin ?? "admin_review",
    approvedAt: trimOrNull(input?.approvedAt) ?? nowIso(),
  } satisfies ParticipationSpacePublishAuditContext;
}

export function approveParticipationSpaceActivation(
  record: ParticipationSpacePublishRecord,
  input?: Partial<ParticipationSpacePublishAuditContext>,
): ParticipationSpacePublishRecord {
  const approvedAt = trimOrNull(input?.approvedAt) ?? nowIso();
  const candidate: ParticipationSpacePublishRecord = {
    ...record,
    status: "approved_for_activation",
    visibility: "editorial_workspace",
    approvedForActivationAt: approvedAt,
    approvedForActivationBy:
      trimOrNull(input?.actorUserId) ?? record.approvedForActivationBy,
    auditContext: updatedAuditContext(
      record,
      {
        ...input,
        approvedAt,
      },
      "Aktivierung explizit freigegeben.",
    ),
    updatedAt: approvedAt,
  };

  const blockers = blockersForApproval(candidate, "activation_approval");
  return blockers.length > 0
    ? {
        ...candidate,
        status: "blocked",
        blockers,
      }
    : {
        ...candidate,
        blockers: [],
      };
}

export function activateParticipationSpaceAfterReview(
  record: ParticipationSpacePublishRecord,
  input?: Partial<ParticipationSpacePublishAuditContext>,
) {
  if (!canActivateParticipationSpace(record)) {
    return {
      ok: false as const,
      error: "blocked" as const,
      blockers: unique([
        ...getParticipationSpacePublishBlockers(record, "activation"),
        "activation_not_approved",
      ]) as ParticipationSpacePublishBlocker[],
      message:
        "Interne Aktivierung bleibt blockiert, bis eine neue explizite Freigabe nach dem Guard-Review vorliegt.",
    };
  }
  const activatedAt = trimOrNull(input?.approvedAt) ?? nowIso();
  const candidate: ParticipationSpacePublishRecord = {
    ...record,
    status: "approved_for_activation",
    approvedForActivationAt: record.approvedForActivationAt ?? activatedAt,
    approvedForActivationBy:
      record.approvedForActivationBy ?? trimOrNull(input?.actorUserId),
    auditContext: updatedAuditContext(
      record,
      {
        ...input,
        approvedAt: activatedAt,
      },
      "Interne Aktivierung wird ausgeführt.",
    ),
    updatedAt: activatedAt,
  };
  const blockers = getParticipationSpacePublishBlockers(candidate, "activation");
  if (blockers.length > 0) {
    return {
      ok: false as const,
      error: "blocked" as const,
      blockers,
      message:
        "Interne Aktivierung bleibt blockiert, bis Freigabe, Audit und Review-Kontext vollständig sind.",
    };
  }

  return {
    ok: true as const,
    record: {
      ...candidate,
      status: "activated" as const,
      visibility: "active_internal" as const,
      spaceStatus: "feedback_prepared" as const,
      spaceVisibility: "review_only" as const,
      blockers: [],
      updatedAt: activatedAt,
    },
  };
}

export function approveParticipationSpacePublication(
  record: ParticipationSpacePublishRecord,
  input?: Partial<ParticipationSpacePublishAuditContext>,
): ParticipationSpacePublishRecord {
  const approvedAt = trimOrNull(input?.approvedAt) ?? nowIso();
  const candidate: ParticipationSpacePublishRecord = {
    ...record,
    status: "approved_for_publication",
    visibility: "ready_for_publication_review",
    approvedForPublicationAt: approvedAt,
    approvedForPublicationBy:
      trimOrNull(input?.actorUserId) ?? record.approvedForPublicationBy,
    auditContext: updatedAuditContext(
      record,
      {
        ...input,
        approvedAt,
      },
      "Veröffentlichung explizit freigegeben.",
    ),
    updatedAt: approvedAt,
  };

  const blockers = blockersForApproval(candidate, "publication_approval");
  return blockers.length > 0
    ? {
        ...candidate,
        status: "blocked",
        blockers,
      }
    : {
        ...candidate,
        blockers: [],
      };
}

export function publishParticipationSpaceAfterReview(
  record: ParticipationSpacePublishRecord,
  input?: Partial<ParticipationSpacePublishAuditContext>,
) {
  if (!canPublishParticipationSpace(record)) {
    return {
      ok: false as const,
      error: "blocked" as const,
      blockers: unique([
        ...getParticipationSpacePublishBlockers(record, "publication"),
        "publication_not_approved",
      ]) as ParticipationSpacePublishBlocker[],
      message:
        "Veröffentlichung bleibt blockiert, bis eine neue explizite Freigabe nach dem Guard-Review vorliegt.",
    };
  }
  const publishedAt = trimOrNull(input?.approvedAt) ?? nowIso();
  const candidate: ParticipationSpacePublishRecord = {
    ...record,
    status: "approved_for_publication",
    visibility: "ready_for_publication_review",
    approvedForPublicationAt: record.approvedForPublicationAt ?? publishedAt,
    approvedForPublicationBy:
      record.approvedForPublicationBy ?? trimOrNull(input?.actorUserId),
    auditContext: updatedAuditContext(
      record,
      {
        ...input,
        approvedAt: publishedAt,
      },
      "Öffentliche Sichtbarkeit wird explizit gesetzt.",
    ),
    updatedAt: publishedAt,
  };
  const blockers = getParticipationSpacePublishBlockers(candidate, "publication");
  if (blockers.length > 0) {
    return {
      ok: false as const,
      error: "blocked" as const,
      blockers,
      message:
        "Veröffentlichung bleibt blockiert, bis Freigabe, Audit, Public Copy und Review-Kontext vollständig sind.",
    };
  }

  return {
    ok: true as const,
    record: {
      ...candidate,
      status: "published" as const,
      visibility: "public" as const,
      spaceStatus: candidate.publicFeedbackAvailable
        ? ("public_feedback_live" as const)
        : ("feedback_prepared" as const),
      spaceVisibility: "public_read_only" as const,
      blockers: [],
      updatedAt: publishedAt,
    },
  };
}

export function getParticipationSpacePublishStatusLabel(
  status: ParticipationSpacePublishStatus,
) {
  switch (status) {
    case "draft":
      return "Entwurf";
    case "queued_for_review":
      return "Zur Prüfung";
    case "approved_for_activation":
      return "Für Aktivierung freigegeben";
    case "activated":
      return "Intern aktiviert";
    case "approved_for_publication":
      return "Für Veröffentlichung freigegeben";
    case "published":
      return "Veröffentlicht";
    case "rejected":
      return "Abgelehnt";
    case "blocked":
      return "Blockiert";
    case "archived":
      return "Archiviert";
    default:
      return status;
  }
}

export function getParticipationSpacePublicVisibilityLabel(
  visibility: ParticipationSpacePublicVisibility,
) {
  switch (visibility) {
    case "internal_review":
      return "Interne Prüfung";
    case "editorial_workspace":
      return "Redaktioneller Arbeitsstand";
    case "active_internal":
      return "Intern aktiviert";
    case "ready_for_publication_review":
      return "Bereit für Veröffentlichungsprüfung";
    case "public":
      return "Öffentlich";
    default:
      return visibility;
  }
}

export function getParticipationSpacePublishBlockerLabel(
  blocker: ParticipationSpacePublishBlocker,
) {
  switch (blocker) {
    case "participation_space_missing":
      return "Der erzeugte Beteiligungsraum konnte nicht belastbar geladen werden.";
    case "participation_space_not_created":
      return "Ein echter Beteiligungsraum ist noch nicht erstellt.";
    case "creation_not_audited":
      return "Die Erstellung ist noch nicht sauber auditierbar bestätigt.";
    case "activation_not_approved":
      return "Aktivierung ist ein separater Freigabeschritt.";
    case "publication_not_approved":
      return "Veröffentlichung braucht eine eigene explizite Freigabe.";
    case "missing_title":
      return "Titel oder Arbeitstitel fehlt.";
    case "missing_question":
      return "Leitfrage oder Beteiligungsfrage fehlt.";
    case "missing_description":
      return "Beschreibung fehlt.";
    case "source_review_pending":
      return "Quellenprüfung ist noch offen.";
    case "moderation_pending":
      return "Moderation ist noch offen.";
    case "unresolved_abuse_signal":
      return "Abuse-/Spam-Signal ist noch ungeklärt.";
    case "unresolved_trust_quality_blocker":
      return "Trust-/Quellenqualitäts-Blocker ist noch ungeklärt.";
    case "graph_context_pending":
      return "Graph-Kontext ist noch nicht belastbar genug.";
    case "dossier_context_pending":
      return "Dossier-Kontext ist noch nicht belastbar genug.";
    case "anlassraum_context_pending":
      return "Anlassraum-Kontext ist noch nicht belastbar genug.";
    case "public_copy_missing":
      return "Öffentliche Kurzbeschreibung oder Headline fehlt.";
    case "moderation_policy_missing":
      return "Moderations- und Freigaberahmen fehlt.";
    case "public_question_guard_blocked":
      return "Die Beteiligungsfrage ist durch den Public-Question-Guard blockiert.";
    case "unsafe_auto_publish":
      return "Öffentliche Sichtbarkeit als Side Effect bleibt gesperrt.";
    case "insufficient_audit_context":
      return "Audit-Kontext ist unvollständig.";
    default:
      return blocker;
  }
}

export function blocksParticipationSpaceAutoPublish(
  draft: ParticipationSpacePublishDraft | ParticipationSpacePublishRecord,
) {
  return (
    draft.status !== "published" &&
    (draft.visibility === "public" ||
      draft.spaceVisibility === "public_read_only" ||
      draft.spaceVisibility === "public_intake_open" ||
      draft.spaceVisibility === "archived_public")
  );
}

export function blocksParticipationSpaceAutoActivation(
  draft: ParticipationSpacePublishDraft | ParticipationSpacePublishRecord,
) {
  return (
    !["activated", "approved_for_publication", "published"].includes(
      draft.status,
    ) &&
    draft.spaceStatus === "feedback_prepared"
  );
}

export function blocksUnsafePublicVisibility(
  draft: ParticipationSpacePublishDraft | ParticipationSpacePublishRecord,
) {
  if (draft.status === "published") return false;
  return (
    draft.visibility === "public" ||
    draft.spaceVisibility === "public_read_only" ||
    draft.spaceVisibility === "public_intake_open" ||
    draft.spaceVisibility === "archived_public"
  );
}

export function summarizeParticipationSpacePublishState(
  draft: ParticipationSpacePublishDraft | ParticipationSpacePublishRecord,
) {
  const parts = [
    getParticipationSpacePublishStatusLabel(draft.status),
    getParticipationSpacePublicVisibilityLabel(draft.visibility),
  ];
  if (draft.spaceStatus) parts.push(`Raumstatus ${draft.spaceStatus}`);
  if (draft.spaceVisibility) parts.push(`Raumsichtbarkeit ${draft.spaceVisibility}`);
  if (draft.blockers.length > 0) {
    parts.push(
      `Blocker: ${draft.blockers
        .map(getParticipationSpacePublishBlockerLabel)
        .join(" | ")}`,
    );
  }
  return parts.join(" · ");
}
