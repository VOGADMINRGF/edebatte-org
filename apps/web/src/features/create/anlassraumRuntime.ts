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

export const ANLASSRAUM_RUNTIME_STATUSES = [
  "draft",
  "queued_for_review",
  "approved_for_creation",
  "created",
  "rejected",
  "blocked",
  "archived",
] as const;

export type AnlassraumRuntimeStatus =
  (typeof ANLASSRAUM_RUNTIME_STATUSES)[number];

export const ANLASSRAUM_RUNTIME_CREATION_BLOCKERS = [
  "review_not_approved",
  "missing_title",
  "missing_trigger",
  "missing_description",
  "source_review_pending",
  "moderation_pending",
  "unresolved_abuse_signal",
  "unresolved_trust_quality_blocker",
  "graph_context_pending",
  "dossier_context_pending",
  "unsafe_auto_create",
  "publish_not_allowed",
  "participation_space_not_allowed",
  "insufficient_audit_context",
] as const;

export type AnlassraumRuntimeCreationBlocker =
  (typeof ANLASSRAUM_RUNTIME_CREATION_BLOCKERS)[number];

export const ANLASSRAUM_RUNTIME_SOURCE_STATUSES = [
  "not_checked",
  "source_review_requested",
  "source_review_pending",
  "source_reviewed",
  "disputed",
  "blocked",
] as const;

export type AnlassraumRuntimeSourceStatus =
  (typeof ANLASSRAUM_RUNTIME_SOURCE_STATUSES)[number];

export const ANLASSRAUM_RUNTIME_VISIBILITIES = [
  "internal_review",
  "editorial_workspace",
  "ready_for_activation_review",
  "active_internal",
  "published",
] as const;

export type AnlassraumRuntimeVisibility =
  (typeof ANLASSRAUM_RUNTIME_VISIBILITIES)[number];

export type AnlassraumRuntimeAuditContext = {
  actorUserId: string | null;
  reason: string | null;
  origin:
    | "create_handoff_review"
    | "admin_review"
    | "anlassraum_runtime"
    | "dossier_runtime"
    | null;
  approvedAt: string | null;
};

export type AnlassraumRuntimeCommunitySignal = {
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

export type AnlassraumRuntimeGuardrails = {
  noAutoCreateFromAiAlone: true;
  noAutoPublish: true;
  noParticipationSpaceSideEffect: true;
  noVerifiedFactsByDefault: true;
  noVerifiedSourcesByDefault: true;
  noCommunityHintsAsTruth: true;
  noTrustOrSourceQualityAsVerification: true;
  noGraphEdgeAsProof: true;
  noDossierContextAsProof: true;
  noMajorityAsTruth: true;
  noAutoGraphWrite: true;
  noAutoMerge: true;
  auditContextRequired: true;
  createdNotPublished: true;
  activeInternalNotPublic: true;
};

export type AnlassraumRuntimeDraft = {
  id: string;
  sourceHandoffId: string;
  sourceReviewItemId: string;
  statementId: string;
  title: string;
  workingTitle: string;
  trigger: string;
  questionGuard?: PublicQuestionGeneralizationResult;
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
  approvedForSetup: boolean;
  status: AnlassraumRuntimeStatus;
  visibility: AnlassraumRuntimeVisibility;
  blockers: AnlassraumRuntimeCreationBlocker[];
  auditContext: AnlassraumRuntimeAuditContext;
  createdAnlassraumId: string | null;
  createdEntityId: string | null;
  guardrails: AnlassraumRuntimeGuardrails;
  createdAt: string;
  updatedAt: string;
};

export type AnlassraumRuntimeAuditEntry = {
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
  blockers: AnlassraumRuntimeCreationBlocker[];
  status: AnlassraumRuntimeStatus;
  anlassraumId?: string | null;
  entityId?: string | null;
};

export type AnlassraumRuntimeRecord = AnlassraumRuntimeDraft & {
  auditTrail: AnlassraumRuntimeAuditEntry[];
  approvedForCreationAt: string | null;
  approvedForCreationBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
};

export type AnlassraumRuntimeDossierContext = {
  dossierId: string;
  title: string;
  summary: string;
  originQuestion?: string | null;
  recognizedStandpoints?: string[];
  argumentLines?: string[];
  openQuestions?: string[];
  topicReferences?: string[];
  graphReferences?: string[];
  sourceStatus?: AnlassraumRuntimeSourceStatus;
};

export type AnlassraumRuntimeCreateDependencies = {
  creator: (input: {
    record: AnlassraumRuntimeRecord;
    auditContext: AnlassraumRuntimeAuditContext;
  }) => Promise<
    | {
        ok: true;
        createdAt?: string | null;
        anlassraumId: string;
        entityId?: string | null;
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
  signals: AnlassraumRuntimeCommunitySignal[],
): AnlassraumRuntimeSourceStatus {
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
): AnlassraumRuntimeCommunitySignal {
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

function defaultGuardrails(): AnlassraumRuntimeGuardrails {
  return {
    noAutoCreateFromAiAlone: true,
    noAutoPublish: true,
    noParticipationSpaceSideEffect: true,
    noVerifiedFactsByDefault: true,
    noVerifiedSourcesByDefault: true,
    noCommunityHintsAsTruth: true,
    noTrustOrSourceQualityAsVerification: true,
    noGraphEdgeAsProof: true,
    noDossierContextAsProof: true,
    noMajorityAsTruth: true,
    noAutoGraphWrite: true,
    noAutoMerge: true,
    auditContextRequired: true,
    createdNotPublished: true,
    activeInternalNotPublic: true,
  };
}

function buildGuardrailBlockers(
  draft: Pick<
    AnlassraumRuntimeDraft,
    | "guardrails"
    | "visibility"
    | "title"
    | "trigger"
    | "description"
    | "sourceStatus"
    | "moderationPending"
    | "unresolvedAbuseSignal"
    | "unresolvedTrustQualityBlocker"
    | "graphContextPending"
    | "dossierContextPending"
    | "status"
    | "auditContext"
  >,
) {
  const blockers: AnlassraumRuntimeCreationBlocker[] = [];

  if (draft.status !== "approved_for_creation" && draft.status !== "created") {
    blockers.push("review_not_approved");
  }
  if (!hasText(draft.title)) blockers.push("missing_title");
  if (!hasText(draft.trigger)) blockers.push("missing_trigger");
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
  if (blocksUnsafeAnlassraumCreation(draft)) blockers.push("unsafe_auto_create");
  if (blocksAnlassraumAutoPublish(draft)) blockers.push("publish_not_allowed");
  if (blocksParticipationSpaceSideEffect(draft)) {
    blockers.push("participation_space_not_allowed");
  }
  if (
    !draft.auditContext.actorUserId ||
    !draft.auditContext.reason ||
    !draft.auditContext.origin
  ) {
    blockers.push("insufficient_audit_context");
  }

  return unique(blockers) as AnlassraumRuntimeCreationBlocker[];
}

export function getAnlassraumRuntimeStatusLabel(
  status: AnlassraumRuntimeStatus,
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

export function getAnlassraumRuntimeCreationBlockerLabel(
  blocker: AnlassraumRuntimeCreationBlocker,
) {
  switch (blocker) {
    case "review_not_approved":
      return "Explizite Freigabe zur Anlassraum-Erstellung fehlt.";
    case "missing_title":
      return "Titel oder Arbeitstitel fehlt.";
    case "missing_trigger":
      return "Anlass oder Ausgangsfrage fehlt.";
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
    case "unsafe_auto_create":
      return "Auto-Anlassraum aus KI allein bleibt gesperrt.";
    case "publish_not_allowed":
      return "Erstellung darf keine Veröffentlichung setzen.";
    case "participation_space_not_allowed":
      return "Erstellung darf keinen Beteiligungsraum als Side Effect anlegen.";
    case "insufficient_audit_context":
      return "Audit-Kontext ist unvollständig.";
    default:
      return blocker;
  }
}

export function getAnlassraumRuntimeSourceStatusLabel(
  status: AnlassraumRuntimeSourceStatus,
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

export function getAnlassraumRuntimeVisibilityLabel(
  visibility: AnlassraumRuntimeVisibility,
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
    case "published":
      return "Veröffentlicht";
    default:
      return visibility;
  }
}

export function buildAnlassraumRuntimeDraftFromDossier(
  context: AnlassraumRuntimeDossierContext,
  options?: {
    status?: AnlassraumRuntimeStatus;
    visibility?: AnlassraumRuntimeVisibility;
    graphContextPending?: boolean;
    dossierContextPending?: boolean;
    auditContext?: Partial<AnlassraumRuntimeAuditContext>;
  },
): AnlassraumRuntimeDraft {
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const trigger =
    trimOrNull(context.originQuestion) ??
    trimOrNull(context.summary) ??
    String(context.title || "").trim();
  const draft: AnlassraumRuntimeDraft = {
    id: `anlassraum-runtime:dossier:${context.dossierId}`,
    sourceHandoffId: `dossier:${context.dossierId}`,
    sourceReviewItemId: `dossier:${context.dossierId}`,
    statementId: `dossier:${context.dossierId}`,
    title: String(context.title || "").trim(),
    workingTitle: String(context.title || "").trim(),
    trigger,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: context.summary,
      candidatePublicQuestion: trigger,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: context.graphReferences ?? [],
      },
    }),
    description: String(context.summary || "").trim(),
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
    createdAnlassraumId: null,
    createdEntityId: null,
    guardrails: defaultGuardrails(),
    createdAt,
    updatedAt,
  };

  return {
    ...draft,
    blockers: getAnlassraumRuntimeCreationBlockers(draft),
  };
}

export function buildAnlassraumRuntimeDraftFromHandoff(
  record: PersistedCreateHandoffRecord,
  options?: {
    communityContributions?: CommunitySourceReviewContribution[];
    status?: AnlassraumRuntimeStatus;
    createdAnlassraumId?: string | null;
    createdEntityId?: string | null;
    approvedForSetup?: boolean;
    visibility?: AnlassraumRuntimeVisibility;
    graphContextPending?: boolean;
    dossierContextPending?: boolean;
    auditContext?: Partial<AnlassraumRuntimeAuditContext>;
  },
): AnlassraumRuntimeDraft {
  const createdAt = record.createdAt ?? nowIso();
  const updatedAt = nowIso();
  const status = options?.status ?? "queued_for_review";
  const communitySignals = (options?.communityContributions ?? []).map(
    mapCommunitySignal,
  );
  const sourceStatus = sourceStatusFromCommunitySignals(communitySignals);
  const graphReferences = buildGraphReferences(record);
  const topicReferences = buildTopicReferences(record);
  const relatedDossierId =
    trimOrNull(record.dossierId) ??
    trimOrNull(record.graphMatches.matchedDossiers[0]);
  const trigger =
    trimOrNull(record.plannerResult.openQuestions?.[0]) ??
    trimOrNull(record.plannerResult.shortSummary) ??
    trimOrNull(record.sourceText) ??
    "Anlassraum prüfen";
  const draft: AnlassraumRuntimeDraft = {
    id: `anlassraum-runtime:${record.id}`,
    sourceHandoffId: record.id,
    sourceReviewItemId: `create_handoff:persisted:${record.id}`,
    statementId: persistedCreateHandoffStatementId(record.id),
    title: buildPersistedCreateHandoffSuggestedTitle(record, "anlassraum"),
    workingTitle: buildPersistedCreateHandoffSuggestedTitle(record, "anlassraum"),
    trigger,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: record.sourceText,
      candidatePublicQuestion: trigger,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: graphReferences,
      },
    }),
    description: buildPersistedCreateHandoffSummary(record),
    relatedDossierId,
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
    approvedForSetup: options?.approvedForSetup ?? true,
    status,
    visibility: options?.visibility ?? "internal_review",
    blockers: [],
    auditContext: {
      actorUserId: trimOrNull(options?.auditContext?.actorUserId),
      reason: trimOrNull(options?.auditContext?.reason),
      origin: options?.auditContext?.origin ?? null,
      approvedAt: trimOrNull(options?.auditContext?.approvedAt),
    },
    createdAnlassraumId: trimOrNull(options?.createdAnlassraumId),
    createdEntityId: trimOrNull(options?.createdEntityId),
    guardrails: defaultGuardrails(),
    createdAt,
    updatedAt,
  };

  return {
    ...draft,
    blockers: getAnlassraumRuntimeCreationBlockers(draft),
  };
}

export function buildAnlassraumRuntimeDraftFromReviewItem(
  item: CreateHandoffReviewQueueItem,
  options?: {
    status?: AnlassraumRuntimeStatus;
    graphContextPending?: boolean;
    dossierContextPending?: boolean;
    auditContext?: Partial<AnlassraumRuntimeAuditContext>;
  },
): AnlassraumRuntimeDraft {
  const trigger = item.openQuestions[0] ?? item.topicTitle ?? item.summary;
  const draft: AnlassraumRuntimeDraft = {
    id: `anlassraum-runtime:${item.id}`,
    sourceHandoffId: item.sourceDraftId,
    sourceReviewItemId: item.id,
    statementId: persistedCreateHandoffStatementId(item.sourceDraftId),
    title: item.title,
    workingTitle: item.title,
    trigger,
    questionGuard: evaluatePublicQuestionGeneralization({
      originalInput: item.summary,
      candidatePublicQuestion: trigger,
      actorContexts: [],
      actorExtraction: {
        status: "unverified",
        source: "create_analysis",
        independentFromCandidateProvider: false,
        evidenceRefs: [],
      },
    }),
    description: item.summary,
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
    graphContextPending:
      options?.graphContextPending ?? !item.topicTitle,
    dossierContextPending: options?.dossierContextPending ?? false,
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
    createdAnlassraumId: null,
    createdEntityId: null,
    guardrails: defaultGuardrails(),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  return {
    ...draft,
    blockers: getAnlassraumRuntimeCreationBlockers(draft),
  };
}

export function getAnlassraumRuntimeCreationBlockers(
  draft: Pick<
    AnlassraumRuntimeDraft,
    | "guardrails"
    | "visibility"
    | "title"
    | "trigger"
    | "description"
    | "sourceStatus"
    | "moderationPending"
    | "unresolvedAbuseSignal"
    | "unresolvedTrustQualityBlocker"
    | "graphContextPending"
    | "dossierContextPending"
    | "status"
    | "auditContext"
  >,
) {
  return buildGuardrailBlockers(draft);
}

export function canCreateAnlassraumRuntime(
  draft: Pick<
    AnlassraumRuntimeDraft,
    | "guardrails"
    | "visibility"
    | "title"
    | "trigger"
    | "description"
    | "sourceStatus"
    | "moderationPending"
    | "unresolvedAbuseSignal"
    | "unresolvedTrustQualityBlocker"
    | "graphContextPending"
    | "dossierContextPending"
    | "status"
    | "auditContext"
  >,
) {
  return getAnlassraumRuntimeCreationBlockers(draft).length === 0;
}

export function blocksUnsafeAnlassraumCreation(
  draft: Pick<AnlassraumRuntimeDraft, "guardrails">,
) {
  return (
    draft.guardrails.noAutoCreateFromAiAlone !== true ||
    draft.guardrails.noVerifiedFactsByDefault !== true ||
    draft.guardrails.noVerifiedSourcesByDefault !== true ||
    draft.guardrails.noCommunityHintsAsTruth !== true ||
    draft.guardrails.noTrustOrSourceQualityAsVerification !== true ||
    draft.guardrails.noGraphEdgeAsProof !== true ||
    draft.guardrails.noDossierContextAsProof !== true ||
    draft.guardrails.noMajorityAsTruth !== true ||
    draft.guardrails.noAutoGraphWrite !== true ||
    draft.guardrails.noAutoMerge !== true ||
    draft.guardrails.auditContextRequired !== true
  );
}

export function blocksAnlassraumAutoPublish(
  draft: Pick<AnlassraumRuntimeDraft, "guardrails" | "visibility">,
) {
  return (
    draft.guardrails.noAutoPublish !== true || draft.visibility === "published"
  );
}

export function blocksParticipationSpaceSideEffect(
  draft: Pick<AnlassraumRuntimeDraft, "guardrails">,
) {
  return draft.guardrails.noParticipationSpaceSideEffect !== true;
}

export function summarizeAnlassraumRuntimeState(
  draft: Pick<
    AnlassraumRuntimeDraft,
    | "status"
    | "sourceStatus"
    | "visibility"
    | "blockers"
    | "createdAnlassraumId"
  >,
) {
  const parts = [
    getAnlassraumRuntimeStatusLabel(draft.status),
    getAnlassraumRuntimeSourceStatusLabel(draft.sourceStatus),
    getAnlassraumRuntimeVisibilityLabel(draft.visibility),
  ];

  if (draft.createdAnlassraumId) {
    parts.push(`Anlassraum ${draft.createdAnlassraumId}`);
  }
  if (draft.blockers.length > 0) {
    parts.push(
      draft.blockers.map(getAnlassraumRuntimeCreationBlockerLabel).join(" "),
    );
  }

  return parts.join(" · ");
}

export async function createAnlassraumRuntimeAfterReview(
  record: AnlassraumRuntimeRecord,
  options: {
    auditContext?: Partial<AnlassraumRuntimeAuditContext>;
  } & AnlassraumRuntimeCreateDependencies,
): Promise<
  | {
      ok: true;
      record: AnlassraumRuntimeRecord;
    }
  | {
      ok: false;
      blockers: AnlassraumRuntimeCreationBlocker[];
      error: "blocked" | "create_failed";
      message: string;
    }
> {
  const merged: AnlassraumRuntimeRecord = {
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
  const blockers = getAnlassraumRuntimeCreationBlockers(merged);
  if (blockers.length > 0) {
    return {
      ok: false,
      blockers,
      error: "blocked",
      message:
        "Anlassraum-Erstellung bleibt review-first blockiert, bis Freigabe, Audit-Kontext und offene Guardrail-Blocker sauber geklärt sind.",
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
        "Die Anlassraum-Runtime konnte nicht sicher in die bestehende Persistenz geschrieben werden.",
    };
  }

  return {
    ok: true,
    record: {
      ...merged,
      status: "created",
      visibility: "ready_for_activation_review",
      blockers: [],
      createdAnlassraumId: created.anlassraumId,
      createdEntityId: trimOrNull(created.entityId),
      updatedAt: trimOrNull(created.createdAt) ?? nowIso(),
    },
  };
}
