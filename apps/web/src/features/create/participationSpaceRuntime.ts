import type { CreateHandoffReviewQueueItem } from "@/features/create/createHandoffReviewQueue";
import type { CommunitySourceReviewContribution } from "@/features/create/communitySourceReviewContribution";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";
import {
  buildPersistedCreateHandoffSuggestedTitle,
  buildPersistedCreateHandoffSummary,
  persistedCreateHandoffStatementId,
  type PersistedCreateHandoffRecord,
} from "@/features/create/createHandoffPersistenceContract";

export const PARTICIPATION_SPACE_RUNTIME_STATUSES = [
  "draft",
  "queued_for_review",
  "approved_for_creation",
  "created",
  "rejected",
  "blocked",
  "archived",
] as const;

export type ParticipationSpaceRuntimeStatus =
  (typeof PARTICIPATION_SPACE_RUNTIME_STATUSES)[number];

export const PARTICIPATION_SPACE_RUNTIME_CREATION_BLOCKERS = [
  "review_not_approved",
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
  "unsafe_auto_create",
  "publish_not_allowed",
  "activation_not_allowed",
  "public_visibility_not_allowed",
  "insufficient_audit_context",
] as const;

export type ParticipationSpaceRuntimeCreationBlocker =
  (typeof PARTICIPATION_SPACE_RUNTIME_CREATION_BLOCKERS)[number];

export const PARTICIPATION_SPACE_RUNTIME_SOURCE_STATUSES = [
  "not_checked",
  "source_review_requested",
  "source_review_pending",
  "source_reviewed",
  "disputed",
  "blocked",
] as const;

export type ParticipationSpaceRuntimeSourceStatus =
  (typeof PARTICIPATION_SPACE_RUNTIME_SOURCE_STATUSES)[number];

export const PARTICIPATION_SPACE_RUNTIME_VISIBILITIES = [
  "internal_review",
  "editorial_workspace",
  "ready_for_activation_review",
  "active_internal",
  "ready_for_publication_review",
  "public",
] as const;

export type ParticipationSpaceRuntimeVisibility =
  (typeof PARTICIPATION_SPACE_RUNTIME_VISIBILITIES)[number];

export type ParticipationSpaceRuntimeAuditContext = {
  actorUserId: string | null;
  reason: string | null;
  origin:
    | "create_handoff_review"
    | "admin_review"
    | "participation_space_runtime"
    | "anlassraum_runtime"
    | "dossier_runtime"
    | null;
  approvedAt: string | null;
};

export type ParticipationSpaceRuntimeCommunitySignal = {
  contributionId: string;
  title: string;
  status: CommunitySourceReviewContribution["status"];
  kind: CommunitySourceReviewContribution["kind"];
  summary: string;
  trustLevel: CommunitySourceReviewContribution["moderation"]["trustLevel"];
  sourceQualityLevel: CommunitySourceReviewContribution["moderation"]["sourceQualityLevel"];
  reviewPriority: CommunitySourceReviewContribution["moderation"]["reviewPriority"];
  moderationStatus: CommunitySourceReviewContribution["moderation"]["moderationStatus"];
  hasAbuseBlocker: boolean;
  hasTrustQualityBlocker: boolean;
  sourceReviewPending: boolean;
  moderationPending: boolean;
};

export type ParticipationSpaceRuntimeGuardrails = {
  noAutoCreateFromAiAlone: true;
  noAutoPublish: true;
  noAutoActivation: true;
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
  approvedForCreationNotPublic: true;
  createdNotPublic: true;
  activeInternalNotPublic: true;
};

export type ParticipationSpaceRuntimeDraft = {
  id: string;
  sourceHandoffId: string;
  sourceReviewItemId: string;
  statementId: string;
  title: string;
  workingTitle: string;
  description: string;
  participationQuestion: string;
  questionGuard?: PublicQuestionGeneralizationResult;
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
  approvedForSetup: boolean;
  status: ParticipationSpaceRuntimeStatus;
  visibility: ParticipationSpaceRuntimeVisibility;
  blockers: ParticipationSpaceRuntimeCreationBlocker[];
  auditContext: ParticipationSpaceRuntimeAuditContext;
  createdParticipationSpaceId: string | null;
  createdParticipationSpaceSlug: string | null;
  guardrails: ParticipationSpaceRuntimeGuardrails;
  createdAt: string;
  updatedAt: string;
};

export type ParticipationSpaceRuntimeAuditEntry = {
  id: string;
  sourceHandoffId: string;
  at: string;
  action:
    | "draft_derived"
    | "creation_approved"
    | "creation_rejected"
    | "creation_blocked"
    | "runtime_created";
  actorUserId: string | null;
  note: string | null;
  blockers: ParticipationSpaceRuntimeCreationBlocker[];
  status: ParticipationSpaceRuntimeStatus;
  participationSpaceId?: string | null;
  participationSpaceSlug?: string | null;
};

export type ParticipationSpaceRuntimeRecord = ParticipationSpaceRuntimeDraft & {
  auditTrail: ParticipationSpaceRuntimeAuditEntry[];
  approvedForCreationAt: string | null;
  approvedForCreationBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
};

export type ParticipationSpaceRuntimeDossierContext = {
  dossierId: string;
  title: string;
  summary: string;
  originQuestion?: string | null;
  relatedAnlassraumId?: string | null;
  recognizedStandpoints?: string[];
  argumentLines?: string[];
  openQuestions?: string[];
  topicReferences?: string[];
  graphReferences?: string[];
  sourceStatus?: ParticipationSpaceRuntimeSourceStatus;
};

export type ParticipationSpaceRuntimeAnlassraumContext = {
  anlassraumId: string;
  title: string;
  trigger: string;
  description: string;
  relatedDossierId?: string | null;
  recognizedStandpoints?: string[];
  argumentLines?: string[];
  openQuestions?: string[];
  topicReferences?: string[];
  graphReferences?: string[];
  sourceStatus?: ParticipationSpaceRuntimeSourceStatus;
};

export type ParticipationSpaceRuntimeCreateDependencies = {
  creator: (input: {
    record: ParticipationSpaceRuntimeRecord;
    auditContext: ParticipationSpaceRuntimeAuditContext;
  }) => Promise<
    | {
        ok: true;
        createdAt?: string | null;
        participationSpaceId: string;
        participationSpaceSlug?: string | null;
      }
    | {
        ok: false;
        error?: string;
      }
  >;
};

function nowIso() {
  return new Date().toISOString();
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function trimOrNull(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function sourceStatusFromCommunitySignals(
  signals: ParticipationSpaceRuntimeCommunitySignal[],
): ParticipationSpaceRuntimeSourceStatus {
  if (signals.some((signal) => signal.hasAbuseBlocker)) return "blocked";
  if (signals.some((signal) => signal.kind === "counter_source")) return "disputed";
  if (signals.some((signal) => signal.sourceReviewPending)) {
    return "source_review_pending";
  }
  if (signals.some((signal) => signal.status === "accepted_as_hint")) {
    return "source_reviewed";
  }
  if (signals.length > 0) return "source_review_requested";
  return "not_checked";
}

function mapCommunitySignal(
  contribution: CommunitySourceReviewContribution,
): ParticipationSpaceRuntimeCommunitySignal {
  const abuseBlocked = Boolean(
    contribution.moderation.abuseState.usageBlocked ||
      contribution.moderation.abuseState.evidenceBlocked ||
      contribution.moderation.abuseState.autoActionBlocked ||
      contribution.moderation.moderationStatus === "rejected_abuse",
  );
  const trustQualityBlocked = Boolean(
    contribution.moderation.trustState.reviewBlocked ||
      contribution.moderation.sourceQualityState.reviewBlocked,
  );
  const sourcePending =
    contribution.status === "pending_review" ||
    contribution.status === "submitted" ||
    contribution.moderation.sourceQualityState.reviewCandidateHint !== "none";
  const moderationPending =
    contribution.status === "needs_moderation" ||
    contribution.moderation.moderationStatus === "needs_moderation" ||
    contribution.moderation.moderationStatus === "hidden_pending_review";

  return {
    contributionId: contribution.id,
    title: contribution.title,
    status: contribution.status,
    kind: contribution.kind,
    summary: contribution.moderation.summary,
    trustLevel: contribution.moderation.trustLevel,
    sourceQualityLevel: contribution.moderation.sourceQualityLevel,
    reviewPriority: contribution.moderation.reviewPriority,
    moderationStatus: contribution.moderation.moderationStatus,
    hasAbuseBlocker: abuseBlocked,
    hasTrustQualityBlocker: trustQualityBlocked,
    sourceReviewPending: sourcePending,
    moderationPending,
  };
}

function buildRecognizedStandpoints(record: PersistedCreateHandoffRecord) {
  const argumentStandpoints = record.arguments.map((argument) => {
    if (argument.stance === "pro") return `Pro: ${argument.text}`;
    if (argument.stance === "contra") return `Contra: ${argument.text}`;
    if (argument.stance === "mixed") return `Gemischt: ${argument.text}`;
    return `Standpunkt offen: ${argument.text}`;
  });
  if (argumentStandpoints.length > 0) return unique(argumentStandpoints);

  const claimStandpoints = record.claims.map((claim) => claim.text);
  if (claimStandpoints.length > 0) return unique(claimStandpoints);

  return unique([record.sourceText]);
}

function buildArgumentLines(record: PersistedCreateHandoffRecord) {
  const lines = record.arguments.map((argument) => argument.text);
  if (lines.length > 0) return unique(lines);
  return unique(record.claims.map((claim) => claim.text));
}

function buildOpenQuestions(record: PersistedCreateHandoffRecord) {
  const fromDraft = record.openQuestions.map((question) => question.question);
  const fromPlanner = record.plannerResult.openQuestions ?? [];
  return unique([...fromDraft, ...fromPlanner]);
}

function buildGraphReferences(record: PersistedCreateHandoffRecord) {
  const refs = [
    ...(record.graphMatches.matches ?? []).map((match) => match.label),
    ...(record.graphMatches.matchedDossiers ?? []),
    ...(record.graphMatches.matchedAnlassraeume ?? []),
    ...(record.graphMatches.matchedTopics ?? []),
  ];
  return unique(refs);
}

function buildTopicReferences(record: PersistedCreateHandoffRecord) {
  return unique([
    record.topicSeed.topicLabel,
    ...(record.plannerResult.topicCandidates ?? []),
    ...(record.graphMatches.matchedTopics ?? []),
  ]);
}

function defaultGuardrails(): ParticipationSpaceRuntimeGuardrails {
  return {
    noAutoCreateFromAiAlone: true,
    noAutoPublish: true,
    noAutoActivation: true,
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
    approvedForCreationNotPublic: true,
    createdNotPublic: true,
    activeInternalNotPublic: true,
  };
}

function buildGuardrailBlockers(
  draft: Pick<
    ParticipationSpaceRuntimeDraft,
    | "guardrails"
    | "visibility"
    | "title"
    | "participationQuestion"
    | "description"
    | "sourceStatus"
    | "moderationPending"
    | "unresolvedAbuseSignal"
    | "unresolvedTrustQualityBlocker"
    | "graphContextPending"
    | "dossierContextPending"
    | "anlassraumContextPending"
    | "status"
    | "auditContext"
  >,
) {
  const blockers: ParticipationSpaceRuntimeCreationBlocker[] = [];

  if (draft.status !== "approved_for_creation" && draft.status !== "created") {
    blockers.push("review_not_approved");
  }
  if (!hasText(draft.title)) blockers.push("missing_title");
  if (!hasText(draft.participationQuestion)) blockers.push("missing_question");
  if (!hasText(draft.description)) blockers.push("missing_description");
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
  if (blocksUnsafeParticipationSpaceCreation(draft)) {
    blockers.push("unsafe_auto_create");
  }
  if (blocksParticipationSpaceAutoPublish(draft)) {
    blockers.push("publish_not_allowed");
  }
  if (blocksParticipationSpaceAutoActivation(draft)) {
    blockers.push("activation_not_allowed");
  }
  if (blocksParticipationSpacePublicVisibility(draft)) {
    blockers.push("public_visibility_not_allowed");
  }
  if (
    !draft.auditContext.actorUserId ||
    !draft.auditContext.reason ||
    !draft.auditContext.origin
  ) {
    blockers.push("insufficient_audit_context");
  }

  return unique(blockers) as ParticipationSpaceRuntimeCreationBlocker[];
}

export function getParticipationSpaceRuntimeStatusLabel(
  status: ParticipationSpaceRuntimeStatus,
) {
  switch (status) {
    case "draft":
      return "Entwurf";
    case "queued_for_review":
      return "Zur Prüfung";
    case "approved_for_creation":
      return "Für Erstellung freigegeben";
    case "created":
      return "Erstellt";
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

export function getParticipationSpaceRuntimeCreationBlockerLabel(
  blocker: ParticipationSpaceRuntimeCreationBlocker,
) {
  switch (blocker) {
    case "review_not_approved":
      return "Explizite Freigabe zur Beteiligungsraum-Erstellung fehlt.";
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
      return "Graph-/Themenkontext ist noch nicht belastbar genug.";
    case "dossier_context_pending":
      return "Dossier-Kontext ist noch nicht belastbar genug.";
    case "anlassraum_context_pending":
      return "Anlassraum-Kontext ist noch nicht belastbar genug.";
    case "unsafe_auto_create":
      return "Auto-Beteiligungsraum aus KI allein bleibt gesperrt.";
    case "publish_not_allowed":
      return "Erstellung darf keine Veröffentlichung setzen.";
    case "activation_not_allowed":
      return "Erstellung darf keine öffentliche Aktivierung setzen.";
    case "public_visibility_not_allowed":
      return "Erstellung darf keine öffentliche Sichtbarkeit als Side Effect setzen.";
    case "insufficient_audit_context":
      return "Audit-Kontext ist unvollständig.";
    default:
      return blocker;
  }
}

export function getParticipationSpaceRuntimeSourceStatusLabel(
  status: ParticipationSpaceRuntimeSourceStatus,
) {
  switch (status) {
    case "not_checked":
      return "Nicht geprüft";
    case "source_review_requested":
      return "Quellenprüfung angefordert";
    case "source_review_pending":
      return "Quellenprüfung offen";
    case "source_reviewed":
      return "Quellenprüfung eingeordnet";
    case "disputed":
      return "Umstritten";
    case "blocked":
      return "Blockiert";
    default:
      return status;
  }
}

export function getParticipationSpaceRuntimeVisibilityLabel(
  visibility: ParticipationSpaceRuntimeVisibility,
) {
  switch (visibility) {
    case "internal_review":
      return "Nur interne Prüfung";
    case "editorial_workspace":
      return "Redaktioneller Arbeitsraum";
    case "ready_for_activation_review":
      return "Bereit für Aktivierungsprüfung";
    case "active_internal":
      return "Interner Arbeitsstand";
    case "ready_for_publication_review":
      return "Bereit für Veröffentlichungsprüfung";
    case "public":
      return "Öffentlich";
    default:
      return visibility;
  }
}

export function buildParticipationSpaceRuntimeDraftFromAnlassraum(
  context: ParticipationSpaceRuntimeAnlassraumContext,
  options?: {
    status?: ParticipationSpaceRuntimeStatus;
    visibility?: ParticipationSpaceRuntimeVisibility;
    graphContextPending?: boolean;
    dossierContextPending?: boolean;
    anlassraumContextPending?: boolean;
    auditContext?: Partial<ParticipationSpaceRuntimeAuditContext>;
  },
): ParticipationSpaceRuntimeDraft {
  const createdAt = nowIso();
  const participationQuestion =
    trimOrNull(context.trigger) ??
    trimOrNull(context.description) ??
    String(context.title || "").trim();
  const draft: ParticipationSpaceRuntimeDraft = {
    id: `participation-space-runtime:anlassraum:${context.anlassraumId}`,
    sourceHandoffId: `anlassraum:${context.anlassraumId}`,
    sourceReviewItemId: `anlassraum:${context.anlassraumId}`,
    statementId: `anlassraum:${context.anlassraumId}`,
    title: String(context.title || "").trim(),
    workingTitle: String(context.title || "").trim(),
    description: String(context.description || "").trim(),
    participationQuestion,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: context.description,
      candidatePublicQuestion: participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: context.graphReferences ?? [],
      },
    }),
    relatedAnlassraumId: context.anlassraumId,
    relatedDossierId: trimOrNull(context.relatedDossierId),
    recognizedStandpoints: unique(context.recognizedStandpoints ?? []),
    argumentLines: unique(context.argumentLines ?? []),
    openQuestions: unique(context.openQuestions ?? []),
    sourceStatus: context.sourceStatus ?? "source_review_requested",
    communitySignals: [],
    graphReferences: unique(context.graphReferences ?? []),
    topicReferences: unique(context.topicReferences ?? [context.title]),
    moderationPending: false,
    unresolvedAbuseSignal: false,
    unresolvedTrustQualityBlocker: false,
    graphContextPending: options?.graphContextPending ?? false,
    dossierContextPending: options?.dossierContextPending ?? false,
    anlassraumContextPending: options?.anlassraumContextPending ?? false,
    approvedForSetup: true,
    status: options?.status ?? "queued_for_review",
    visibility: options?.visibility ?? "internal_review",
    blockers: [],
    auditContext: {
      actorUserId: trimOrNull(options?.auditContext?.actorUserId),
      reason: trimOrNull(options?.auditContext?.reason),
      origin: options?.auditContext?.origin ?? null,
      approvedAt: trimOrNull(options?.auditContext?.approvedAt),
    },
    createdParticipationSpaceId: null,
    createdParticipationSpaceSlug: null,
    guardrails: defaultGuardrails(),
    createdAt,
    updatedAt: createdAt,
  };

  return {
    ...draft,
    blockers: getParticipationSpaceRuntimeCreationBlockers(draft),
  };
}

export function buildParticipationSpaceRuntimeDraftFromDossier(
  context: ParticipationSpaceRuntimeDossierContext,
  options?: {
    status?: ParticipationSpaceRuntimeStatus;
    visibility?: ParticipationSpaceRuntimeVisibility;
    graphContextPending?: boolean;
    dossierContextPending?: boolean;
    anlassraumContextPending?: boolean;
    auditContext?: Partial<ParticipationSpaceRuntimeAuditContext>;
  },
): ParticipationSpaceRuntimeDraft {
  const createdAt = nowIso();
  const participationQuestion =
    trimOrNull(context.originQuestion) ??
    trimOrNull(context.summary) ??
    String(context.title || "").trim();
  const draft: ParticipationSpaceRuntimeDraft = {
    id: `participation-space-runtime:dossier:${context.dossierId}`,
    sourceHandoffId: `dossier:${context.dossierId}`,
    sourceReviewItemId: `dossier:${context.dossierId}`,
    statementId: `dossier:${context.dossierId}`,
    title: String(context.title || "").trim(),
    workingTitle: String(context.title || "").trim(),
    description: String(context.summary || "").trim(),
    participationQuestion,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: context.summary,
      candidatePublicQuestion: participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: context.graphReferences ?? [],
      },
    }),
    relatedAnlassraumId: trimOrNull(context.relatedAnlassraumId),
    relatedDossierId: context.dossierId,
    recognizedStandpoints: unique(context.recognizedStandpoints ?? []),
    argumentLines: unique(context.argumentLines ?? []),
    openQuestions: unique(context.openQuestions ?? []),
    sourceStatus: context.sourceStatus ?? "source_review_requested",
    communitySignals: [],
    graphReferences: unique(context.graphReferences ?? []),
    topicReferences: unique(context.topicReferences ?? [context.title]),
    moderationPending: false,
    unresolvedAbuseSignal: false,
    unresolvedTrustQualityBlocker: false,
    graphContextPending: options?.graphContextPending ?? false,
    dossierContextPending: options?.dossierContextPending ?? false,
    anlassraumContextPending: options?.anlassraumContextPending ?? false,
    approvedForSetup: true,
    status: options?.status ?? "queued_for_review",
    visibility: options?.visibility ?? "internal_review",
    blockers: [],
    auditContext: {
      actorUserId: trimOrNull(options?.auditContext?.actorUserId),
      reason: trimOrNull(options?.auditContext?.reason),
      origin: options?.auditContext?.origin ?? null,
      approvedAt: trimOrNull(options?.auditContext?.approvedAt),
    },
    createdParticipationSpaceId: null,
    createdParticipationSpaceSlug: null,
    guardrails: defaultGuardrails(),
    createdAt,
    updatedAt: createdAt,
  };

  return {
    ...draft,
    blockers: getParticipationSpaceRuntimeCreationBlockers(draft),
  };
}

export function buildParticipationSpaceRuntimeDraftFromHandoff(
  record: PersistedCreateHandoffRecord,
  options?: {
    communityContributions?: CommunitySourceReviewContribution[];
    status?: ParticipationSpaceRuntimeStatus;
    createdParticipationSpaceId?: string | null;
    createdParticipationSpaceSlug?: string | null;
    approvedForSetup?: boolean;
    visibility?: ParticipationSpaceRuntimeVisibility;
    graphContextPending?: boolean;
    dossierContextPending?: boolean;
    anlassraumContextPending?: boolean;
    auditContext?: Partial<ParticipationSpaceRuntimeAuditContext>;
  },
): ParticipationSpaceRuntimeDraft {
  const createdAt = record.createdAt ?? nowIso();
  const communitySignals = (options?.communityContributions ?? []).map(
    mapCommunitySignal,
  );
  const sourceStatus = sourceStatusFromCommunitySignals(communitySignals);
  const graphReferences = buildGraphReferences(record);
  const topicReferences = buildTopicReferences(record);
  const participationQuestion =
    trimOrNull(record.plannerResult.openQuestions?.[0]) ??
    trimOrNull(record.plannerResult.shortSummary) ??
    trimOrNull(record.sourceText) ??
    "Beteiligungsraum prüfen";
  const draft: ParticipationSpaceRuntimeDraft = {
    id: `participation-space-runtime:${record.id}`,
    sourceHandoffId: record.id,
    sourceReviewItemId: `create_handoff:persisted:${record.id}`,
    statementId: persistedCreateHandoffStatementId(record.id),
    title: buildPersistedCreateHandoffSuggestedTitle(
      record,
      "participation_space",
    ),
    workingTitle: buildPersistedCreateHandoffSuggestedTitle(
      record,
      "participation_space",
    ),
    description: buildPersistedCreateHandoffSummary(record),
    participationQuestion,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: record.sourceText,
      candidatePublicQuestion: participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: graphReferences,
      },
    }),
    relatedAnlassraumId:
      trimOrNull(record.anlassraumId) ??
      trimOrNull(record.graphMatches.matchedAnlassraeume[0]),
    relatedDossierId:
      trimOrNull(record.dossierId) ??
      trimOrNull(record.graphMatches.matchedDossiers[0]),
    recognizedStandpoints: buildRecognizedStandpoints(record),
    argumentLines: buildArgumentLines(record),
    openQuestions: buildOpenQuestions(record),
    sourceStatus,
    communitySignals,
    graphReferences,
    topicReferences,
    moderationPending: communitySignals.some((signal) => signal.moderationPending),
    unresolvedAbuseSignal: communitySignals.some((signal) => signal.hasAbuseBlocker),
    unresolvedTrustQualityBlocker: communitySignals.some(
      (signal) => signal.hasTrustQualityBlocker,
    ),
    graphContextPending:
      options?.graphContextPending ??
      (graphReferences.length === 0 &&
        topicReferences.length === 0 &&
        !record.graphMatches.shouldCreateNewTopic),
    dossierContextPending: options?.dossierContextPending ?? false,
    anlassraumContextPending: options?.anlassraumContextPending ?? false,
    approvedForSetup: options?.approvedForSetup ?? true,
    status: options?.status ?? "queued_for_review",
    visibility: options?.visibility ?? "internal_review",
    blockers: [],
    auditContext: {
      actorUserId: trimOrNull(options?.auditContext?.actorUserId),
      reason: trimOrNull(options?.auditContext?.reason),
      origin: options?.auditContext?.origin ?? null,
      approvedAt: trimOrNull(options?.auditContext?.approvedAt),
    },
    createdParticipationSpaceId: trimOrNull(options?.createdParticipationSpaceId),
    createdParticipationSpaceSlug: trimOrNull(
      options?.createdParticipationSpaceSlug,
    ),
    guardrails: defaultGuardrails(),
    createdAt,
    updatedAt: nowIso(),
  };

  return {
    ...draft,
    blockers: getParticipationSpaceRuntimeCreationBlockers(draft),
  };
}

export function buildParticipationSpaceRuntimeDraftFromReviewItem(
  item: CreateHandoffReviewQueueItem,
  options?: {
    status?: ParticipationSpaceRuntimeStatus;
    graphContextPending?: boolean;
    dossierContextPending?: boolean;
    anlassraumContextPending?: boolean;
    auditContext?: Partial<ParticipationSpaceRuntimeAuditContext>;
  },
): ParticipationSpaceRuntimeDraft {
  const participationQuestion = item.openQuestions[0] ?? item.topicTitle ?? item.summary;
  const draft: ParticipationSpaceRuntimeDraft = {
    id: `participation-space-runtime:${item.id}`,
    sourceHandoffId: item.sourceDraftId,
    sourceReviewItemId: item.id,
    statementId: persistedCreateHandoffStatementId(item.sourceDraftId),
    title: item.title,
    workingTitle: item.title,
    description: item.summary,
    participationQuestion,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: item.summary,
      candidatePublicQuestion: participationQuestion,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: [],
      },
    }),
    relatedAnlassraumId: null,
    relatedDossierId: null,
    recognizedStandpoints: item.authorStandpoint ? [item.authorStandpoint] : [],
    argumentLines: [],
    openQuestions: unique(item.openQuestions),
    sourceStatus: item.requiresFactcheck
      ? "source_review_pending"
      : "source_review_requested",
    communitySignals: [],
    graphReferences: [],
    topicReferences: item.topicTitle ? [item.topicTitle] : [],
    moderationPending: false,
    unresolvedAbuseSignal: false,
    unresolvedTrustQualityBlocker: false,
    graphContextPending: options?.graphContextPending ?? !item.topicTitle,
    dossierContextPending: options?.dossierContextPending ?? false,
    anlassraumContextPending: options?.anlassraumContextPending ?? false,
    approvedForSetup: item.status === "approved_for_setup",
    status: options?.status ?? "queued_for_review",
    visibility: "internal_review",
    blockers: [],
    auditContext: {
      actorUserId: trimOrNull(options?.auditContext?.actorUserId),
      reason: trimOrNull(options?.auditContext?.reason),
      origin: options?.auditContext?.origin ?? null,
      approvedAt: trimOrNull(options?.auditContext?.approvedAt),
    },
    createdParticipationSpaceId: null,
    createdParticipationSpaceSlug: null,
    guardrails: defaultGuardrails(),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  return {
    ...draft,
    blockers: getParticipationSpaceRuntimeCreationBlockers(draft),
  };
}

export function getParticipationSpaceRuntimeCreationBlockers(
  draft: Pick<
    ParticipationSpaceRuntimeDraft,
    | "guardrails"
    | "visibility"
    | "title"
    | "participationQuestion"
    | "description"
    | "sourceStatus"
    | "moderationPending"
    | "unresolvedAbuseSignal"
    | "unresolvedTrustQualityBlocker"
    | "graphContextPending"
    | "dossierContextPending"
    | "anlassraumContextPending"
    | "status"
    | "auditContext"
  >,
) {
  return buildGuardrailBlockers(draft);
}

export function canCreateParticipationSpaceRuntime(
  draft: Pick<
    ParticipationSpaceRuntimeDraft,
    | "guardrails"
    | "visibility"
    | "title"
    | "participationQuestion"
    | "description"
    | "sourceStatus"
    | "moderationPending"
    | "unresolvedAbuseSignal"
    | "unresolvedTrustQualityBlocker"
    | "graphContextPending"
    | "dossierContextPending"
    | "anlassraumContextPending"
    | "status"
    | "auditContext"
  >,
) {
  return getParticipationSpaceRuntimeCreationBlockers(draft).length === 0;
}

export function blocksUnsafeParticipationSpaceCreation(
  draft: Pick<ParticipationSpaceRuntimeDraft, "guardrails">,
) {
  return (
    draft.guardrails.noAutoCreateFromAiAlone !== true ||
    draft.guardrails.noVerifiedFactsByDefault !== true ||
    draft.guardrails.noVerifiedSourcesByDefault !== true ||
    draft.guardrails.noCommunityHintsAsTruth !== true ||
    draft.guardrails.noTrustOrSourceQualityAsVerification !== true ||
    draft.guardrails.noGraphEdgeAsProof !== true ||
    draft.guardrails.noDossierContextAsProof !== true ||
    draft.guardrails.noAnlassraumContextAsProof !== true ||
    draft.guardrails.noMajorityAsTruth !== true ||
    draft.guardrails.noAutoGraphWrite !== true ||
    draft.guardrails.noAutoMerge !== true ||
    draft.guardrails.auditContextRequired !== true
  );
}

export function blocksParticipationSpaceAutoPublish(
  draft: Pick<ParticipationSpaceRuntimeDraft, "guardrails" | "visibility">,
) {
  return draft.guardrails.noAutoPublish !== true || draft.visibility === "public";
}

export function blocksParticipationSpaceAutoActivation(
  draft: Pick<ParticipationSpaceRuntimeDraft, "guardrails" | "visibility">,
) {
  return (
    draft.guardrails.noAutoActivation !== true || draft.visibility === "public"
  );
}

export function blocksParticipationSpacePublicVisibility(
  draft: Pick<ParticipationSpaceRuntimeDraft, "guardrails" | "visibility">,
) {
  return (
    draft.guardrails.noPublicVisibilitySideEffect !== true ||
    draft.visibility === "public"
  );
}

export function summarizeParticipationSpaceRuntimeState(
  draft: Pick<
    ParticipationSpaceRuntimeDraft,
    | "status"
    | "sourceStatus"
    | "visibility"
    | "blockers"
    | "createdParticipationSpaceId"
    | "createdParticipationSpaceSlug"
  >,
) {
  const parts = [
    getParticipationSpaceRuntimeStatusLabel(draft.status),
    getParticipationSpaceRuntimeSourceStatusLabel(draft.sourceStatus),
    getParticipationSpaceRuntimeVisibilityLabel(draft.visibility),
  ];

  if (draft.createdParticipationSpaceId) {
    parts.push(`Beteiligungsraum ${draft.createdParticipationSpaceId}`);
  }
  if (draft.createdParticipationSpaceSlug) {
    parts.push(`Slug ${draft.createdParticipationSpaceSlug}`);
  }
  if (draft.blockers.length > 0) {
    parts.push(
      draft.blockers
        .map(getParticipationSpaceRuntimeCreationBlockerLabel)
        .join(" "),
    );
  }

  return parts.join(" · ");
}

export async function createParticipationSpaceRuntimeAfterReview(
  record: ParticipationSpaceRuntimeRecord,
  options: {
    auditContext?: Partial<ParticipationSpaceRuntimeAuditContext>;
  } & ParticipationSpaceRuntimeCreateDependencies,
): Promise<
  | {
      ok: true;
      record: ParticipationSpaceRuntimeRecord;
    }
  | {
      ok: false;
      blockers: ParticipationSpaceRuntimeCreationBlocker[];
      error: "blocked" | "create_failed";
      message: string;
    }
> {
  const merged: ParticipationSpaceRuntimeRecord = {
    ...record,
    auditContext: {
      actorUserId:
        trimOrNull(options.auditContext?.actorUserId) ??
        record.auditContext.actorUserId,
      reason:
        trimOrNull(options.auditContext?.reason) ?? record.auditContext.reason,
      origin: options.auditContext?.origin ?? record.auditContext.origin,
      approvedAt:
        trimOrNull(options.auditContext?.approvedAt) ??
        record.auditContext.approvedAt,
    },
    updatedAt: nowIso(),
  };
  const blockers = getParticipationSpaceRuntimeCreationBlockers(merged);
  if (blockers.length > 0) {
    return {
      ok: false,
      blockers,
      error: "blocked",
      message:
        "Beteiligungsraum-Erstellung bleibt review-first blockiert, bis Freigabe, Audit-Kontext und offene Guardrail-Blocker sauber geklärt sind.",
    };
  }

  const created = await options.creator({
    record: merged,
    auditContext: merged.auditContext,
  });
  if (created.ok === false) {
    return {
      ok: false,
      blockers: [],
      error: "create_failed",
      message:
        created.error ??
        "Die Beteiligungsraum-Runtime konnte nicht sicher in die bestehende Persistenz geschrieben werden.",
    };
  }

  return {
    ok: true,
    record: {
      ...merged,
      status: "created",
      visibility: "active_internal",
      blockers: [],
      createdParticipationSpaceId: created.participationSpaceId,
      createdParticipationSpaceSlug: trimOrNull(created.participationSpaceSlug),
      updatedAt: trimOrNull(created.createdAt) ?? nowIso(),
    },
  };
}
