import type { CreateAnalyzeResponse } from "@/features/create/analyzeContract";
import type { CreateAnalyzeEnvelopeProviderMatrixEntry } from "@/features/create/analyzeEnvelope";
import type { CreateIntakeContext } from "@/features/create/intakeContext";
import type { NormalizedMaterialItem } from "@/features/create/materialRouting";
import type { CreateIntelligentFollowupResult } from "@/features/create/intelligentFollowupContract";
import type { RundenCreateHandoffIntegrityState } from "@/features/create/rundenCreateHandoffIntegrity";
import type { ManualAnlassraumServerDraftSnapshot } from "@/features/surfaces/runden/manualAnlassraumSetup";
import type { RunReceipt } from "@features/analyze/schemas";
import {
  hasValidatedCreatePlannerProviderIdentity,
  isCreatePlannerProviderSource,
  type CreatePlannerValidatedProviderSource,
} from "@/features/create/createPlannerProviderContract";
import type { CreatePlannerResult } from "@/features/create/createPlanner";

export type AiOrchestrationTraceSurface =
  | "/runden/new"
  | "/create"
  | "/api/create/intelligent-followup"
  | "/api/contributions/analyze"
  | "/admin/telemetry/ai/orchestrator";

export type AiOrchestrationTraceTrigger =
  | "without_ai_save"
  | "with_ai_continue"
  | "server_draft_handoff"
  | "create_intelligent_followup_planner"
  | "create_analyze"
  | "admin_orchestrator_smoke"
  | "downstream_planned";

export type AiOrchestrationInputOriginType =
  | "human_input"
  | "server_draft"
  | "start_draft_context"
  | "url"
  | "document"
  | "dossier"
  | "claim"
  | "manual_editorial"
  | "ai_derivation"
  | "planned_not_active";

export type AiOrchestrationProviderVisibility =
  | "public_safe"
  | "admin_review_only"
  | "missing_runtime_truth";

export type AiOrchestrationOutputType =
  | "draft_saved"
  | "draft_handoff_ready"
  | "planner_followup"
  | "candidate_preview"
  | "candidate_review_handoff"
  | "analyze_result"
  | "run_receipt"
  | "admin_smoke_diagnostics"
  | "planned_not_active";

export type AiOrchestrationOutputOrigin =
  | "human_input"
  | "ai_assisted"
  | "ai_generated"
  | "operational_trace"
  | "planned_not_active";

export type AiOrchestrationGraphTarget =
  | "draft_pre_record"
  | "create_workspace"
  | "graph_candidate"
  | "dossier_candidate"
  | "anlassraum_candidate"
  | "participation_space_candidate"
  | "review_queue_handoff"
  | "none";

export type AiOrchestrationGraphTargetState =
  | "pre_record"
  | "candidate_only"
  | "planned_handoff"
  | "not_applicable"
  | "missing_runtime_truth";

export type AiOrchestrationReviewState =
  | "draft"
  | "review_required"
  | "operator_review"
  | "planned_not_active"
  | "not_required";

export type AiOrchestrationPublishState =
  | "not_published"
  | "publish_blocked"
  | "planned_not_active";

export type AiOrchestrationSourceProvenance = {
  label: string;
  type: AiOrchestrationInputOriginType;
  ref: string | null;
  state: "present" | "planned_not_active" | "missing_runtime_truth";
  visibility: "frontend_safe" | "admin_review_only";
};

export type AiOrchestrationInputContext = {
  initialTextPresent: boolean;
  intakeSource: string | null;
  draftId: string | null;
  dossierId: string | null;
  anlassraumId: string | null;
  runId: string | null;
  requestId: string | null;
  operationId: string | null;
  operationType: string | null;
  userScope: "present" | "not_required" | "missing_runtime_truth";
};

export type AiOrchestrationProvenanceTraceStep = {
  stepId: string;
  surface: AiOrchestrationTraceSurface;
  trigger: AiOrchestrationTraceTrigger;
  inputContext: AiOrchestrationInputContext;
  inputOrigin: string;
  inputOriginType: AiOrchestrationInputOriginType;
  inputOriginRef: string | null;
  provider: string | null;
  model: string | null;
  providerAttempt?: number | null;
  providerResultStatus?:
    | "succeeded"
    | "failed"
    | "degraded_fallback"
    | "not_attempted"
    | null;
  providerKnown: boolean;
  providerVisibility: AiOrchestrationProviderVisibility;
  aiActive: boolean;
  usageRecorded: boolean;
  outputType: AiOrchestrationOutputType;
  outputOrigin: AiOrchestrationOutputOrigin;
  sourceProvenance: AiOrchestrationSourceProvenance[];
  evidenceRefs: string[];
  graphTarget: AiOrchestrationGraphTarget;
  graphTargetState: AiOrchestrationGraphTargetState;
  reviewState: AiOrchestrationReviewState;
  publishState: AiOrchestrationPublishState;
  userVisibleLabel: string;
  adminVisibleLabel: string;
  missingRuntimeTruth: boolean;
  missingRuntimeTruthReasons: string[];
};

export type CreatePlannerRuntimeTrace = {
  requestId: string | null;
  operationId: string | null;
  operationType: string | null;
  userScope: "present" | "missing_runtime_truth";
  timings?: {
    saveMs?: number | null;
    accessMs: number;
    plannerMs: number | null;
    contextMs: number | null;
    totalMs: number;
    submitToResultMs?: number | null;
  };
  intake?: {
    selectedTimingLane: "fast" | "standard";
    inputLength: number;
    canonicalTopicCount: number;
    issueMode: "single_issue" | "multi_issue";
  };
};

export type CreateAnalyzeRuntimeTrace = {
  createAnalyze: CreateAnalyzeResponse | null;
  providerMatrix: CreateAnalyzeEnvelopeProviderMatrixEntry[];
  runReceipt: RunReceipt | null;
};

type CreateTraceInput = {
  initialText?: string | null;
  intakeContext?: CreateIntakeContext | null;
  draftId?: string | null;
  dossierId?: string | null;
  anlassraumId?: string | null;
  handoff?: RundenCreateHandoffIntegrityState | null;
  plannerResult?: CreateIntelligentFollowupResult | null;
  plannerTrace?: CreatePlannerRuntimeTrace | null;
  analyzeTrace?: CreateAnalyzeRuntimeTrace | null;
  materialItems?: NormalizedMaterialItem[] | null;
  candidatePreviewAvailable?: boolean;
  candidateReviewHandoffAvailable?: boolean;
  claimToDossierPipelineAvailable?: boolean;
  feedEnrichmentSuggestionsAvailable?: boolean;
};

type PlannerProviderTrace = {
  provider: CreatePlannerValidatedProviderSource | null;
  model: string | null;
  attempt: number | null;
  resultStatus:
    | "succeeded"
    | "failed"
    | "degraded_fallback"
    | "not_attempted";
  known: boolean;
  visibility: AiOrchestrationProviderVisibility;
};

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function resolvePlannerProviderTrace(
  planner: CreatePlannerResult | null,
): PlannerProviderTrace {
  if (!planner) {
    return {
      provider: null,
      model: null,
      attempt: null,
      resultStatus: "not_attempted",
      known: false,
      visibility: "missing_runtime_truth",
    };
  }

  const validatedSuccess =
    hasValidatedCreatePlannerProviderIdentity(planner) &&
    planner.providerCallAttempted === true &&
    planner.providerCallSucceeded === true &&
    planner.plannerDebug.usedProvider === planner.plannerProvider;
  const finalAttempt = Array.isArray(planner.providerAttempts)
    ? planner.providerAttempts[planner.providerAttempts.length - 1] ?? null
    : null;
  const attemptedProvider = isCreatePlannerProviderSource(
    finalAttempt?.provider,
  )
    ? finalAttempt.provider
    : isCreatePlannerProviderSource(planner.plannerDebug.attemptedProvider)
      ? planner.plannerDebug.attemptedProvider
      : null;
  const provider = validatedSuccess
    ? planner.plannerProvider
    : attemptedProvider;
  const model = validatedSuccess
    ? finalAttempt?.model ??
      planner.plannerDebug.usedModel ??
      planner.plannerDebug.attemptedModel ??
      null
    : finalAttempt?.model ??
      planner.plannerDebug.attemptedModel ??
      planner.plannerDebug.usedModel ??
      null;
  const attempt =
    provider && finalAttempt
      ? finalAttempt.attempt
      : provider && planner.providerAttemptCount > 0
        ? planner.providerAttemptCount
      : null;
  const resultStatus = validatedSuccess
    ? "succeeded"
    : provider && planner.providerCallAttempted
      ? planner.plannerDegraded
        ? "degraded_fallback"
        : "failed"
      : "not_attempted";

  return {
    provider,
    model,
    attempt,
    resultStatus,
    known: Boolean(provider),
    visibility: provider
      ? "admin_review_only"
      : "missing_runtime_truth",
  };
}

function pushSource(
  target: AiOrchestrationSourceProvenance[],
  entry: AiOrchestrationSourceProvenance,
) {
  if (
    target.some(
      (current) =>
        current.type === entry.type &&
        current.label === entry.label &&
        current.ref === entry.ref,
    )
  ) {
    return;
  }
  target.push(entry);
}

function buildServerDraftSource(
  draftId: string | null | undefined,
): AiOrchestrationSourceProvenance | null {
  if (!hasText(draftId)) return null;
  return {
    label: "Server-Draft aus /runden/new",
    type: "server_draft",
    ref: String(draftId),
    state: "present",
    visibility: "frontend_safe",
  };
}

function buildCreateSourceProvenance(params: {
  intakeContext?: CreateIntakeContext | null;
  draftId?: string | null;
  dossierId?: string | null;
  materialItems?: NormalizedMaterialItem[] | null;
  initialText?: string | null;
}): AiOrchestrationSourceProvenance[] {
  const entries: AiOrchestrationSourceProvenance[] = [];
  const serverDraft = buildServerDraftSource(
    params.draftId ?? params.intakeContext?.draftId ?? null,
  );
  if (serverDraft) pushSource(entries, serverDraft);

  if (hasText(params.dossierId)) {
    pushSource(entries, {
      label: "Dossier-Kontext",
      type: "dossier",
      ref: String(params.dossierId),
      state: "present",
      visibility: "admin_review_only",
    });
  }

  if (hasText(params.intakeContext?.sourceUrl)) {
    pushSource(entries, {
      label: "URL-Kontext",
      type: "url",
      ref: params.intakeContext?.sourceUrl ?? null,
      state: "present",
      visibility: "admin_review_only",
    });
  }

  for (const item of params.materialItems ?? []) {
    const type: AiOrchestrationInputOriginType =
      item.kind === "youtube_url" || item.kind === "web_document" ? "url" : "document";
    pushSource(entries, {
      label: item.label,
      type,
      ref: item.url ?? item.uploadId ?? item.id,
      state: "present",
      visibility: item.url ? "admin_review_only" : "frontend_safe",
    });
  }

  if (!entries.length && hasText(params.initialText)) {
    pushSource(entries, {
      label: "Nutzertext",
      type: "human_input",
      ref: null,
      state: "present",
      visibility: "frontend_safe",
    });
  }

  return entries;
}

function resolvePrimaryInputOrigin(params: {
  intakeContext?: CreateIntakeContext | null;
  draftId?: string | null;
  dossierId?: string | null;
  materialItems?: NormalizedMaterialItem[] | null;
  initialText?: string | null;
}) {
  if (hasText(params.draftId ?? params.intakeContext?.draftId)) {
    return {
      inputOrigin: "Server-Draft aus /runden/new",
      inputOriginType: "server_draft" as const,
      inputOriginRef: String(params.draftId ?? params.intakeContext?.draftId ?? ""),
    };
  }

  const firstMaterial = params.materialItems?.[0] ?? null;
  if (firstMaterial) {
    const isDocument =
      firstMaterial.kind === "pdf_document" || firstMaterial.kind === "upload_document";
    return {
      inputOrigin: isDocument ? "Dokument-/Upload-Kontext" : "URL-/Feed-Kontext",
      inputOriginType: (isDocument ? "document" : "url") as AiOrchestrationInputOriginType,
      inputOriginRef: firstMaterial.url ?? firstMaterial.uploadId ?? firstMaterial.id,
    };
  }

  if (hasText(params.intakeContext?.sourceUrl)) {
    return {
      inputOrigin: "URL-Kontext",
      inputOriginType: "url" as const,
      inputOriginRef: params.intakeContext?.sourceUrl ?? null,
    };
  }

  if (hasText(params.dossierId)) {
    return {
      inputOrigin: "Dossier-Kontext",
      inputOriginType: "dossier" as const,
      inputOriginRef: String(params.dossierId),
    };
  }

  return {
    inputOrigin: hasText(params.initialText) ? "Nutzertext" : "Fehlender belastbarer Input-Kontext",
    inputOriginType: "human_input" as const,
    inputOriginRef: null,
  };
}

function resolveAnalyzeProvider(trace: CreateAnalyzeRuntimeTrace | null | undefined) {
  const receiptProvider = trace?.runReceipt?.provider ?? null;
  const receiptModel = trace?.runReceipt?.model ?? null;
  if (receiptProvider || receiptModel) {
    return {
      provider: receiptProvider,
      model: receiptModel,
      known: Boolean(receiptProvider || receiptModel),
      missingReasons: [] as string[],
    };
  }

  const okEntry =
    trace?.providerMatrix.find((entry) => entry.state === "ok" && hasText(entry.provider)) ??
    trace?.providerMatrix.find((entry) => entry.state === "running" && hasText(entry.provider)) ??
    trace?.providerMatrix.find((entry) => hasText(entry.provider)) ??
    null;
  if (okEntry) {
    return {
      provider: okEntry.provider ?? null,
      model: okEntry.model ?? null,
      known: Boolean(okEntry.provider || okEntry.model),
      missingReasons: okEntry.model ? [] : ["Analyze-Lauf hat keinen belastbaren Modellnamen im Runtime-Kontext."],
    };
  }

  return {
    provider: null,
    model: null,
    known: false,
    missingReasons: ["Analyze-Lauf fuehrt im Frontend noch keinen belastbaren technischen Modellkontext."],
  };
}

function buildInputContext(params: {
  initialText?: string | null;
  intakeContext?: CreateIntakeContext | null;
  draftId?: string | null;
  dossierId?: string | null;
  anlassraumId?: string | null;
  runId?: string | null;
  requestId?: string | null;
  operationId?: string | null;
  operationType?: string | null;
  userScope?: "present" | "not_required" | "missing_runtime_truth";
}): AiOrchestrationInputContext {
  return {
    initialTextPresent: hasText(params.initialText),
    intakeSource: params.intakeContext?.source ?? null,
    draftId: params.draftId ?? params.intakeContext?.draftId ?? null,
    dossierId: params.dossierId ?? null,
    anlassraumId: params.anlassraumId ?? null,
    runId: params.runId ?? null,
    requestId: params.requestId ?? null,
    operationId: params.operationId ?? null,
    operationType: params.operationType ?? null,
    userScope: params.userScope ?? "missing_runtime_truth",
  };
}

function buildEvidenceRefs(values: Array<string | null | undefined>) {
  return values
    .map((value) => (hasText(value) ? String(value).trim() : null))
    .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index);
}

export function getAiOrchestrationOutputTypeLabel(value: AiOrchestrationOutputType) {
  switch (value) {
    case "draft_saved":
      return "Entwurf gespeichert";
    case "draft_handoff_ready":
      return "Übergang vorbereitet";
    case "planner_followup":
      return "Folgeschritte vorbereitet";
    case "candidate_preview":
      return "Kandidaten-Vorschau erzeugt";
    case "candidate_review_handoff":
      return "Kandidaten-Review-Handoff vorbereitet";
    case "analyze_result":
      return "Analyseergebnis erzeugt";
    case "run_receipt":
      return "Run-Receipt erzeugt";
    case "admin_smoke_diagnostics":
      return "Diagnose erzeugt";
    case "planned_not_active":
      return "Noch nicht aktiv";
  }
}

export function getAiOrchestrationGraphTargetStateLabel(
  value: AiOrchestrationGraphTargetState,
) {
  switch (value) {
    case "pre_record":
      return "Bleibt Vorstufe";
    case "candidate_only":
      return "Nur Kandidat/Handoff";
    case "planned_handoff":
      return "Nur geplant";
    case "not_applicable":
      return "Kein Graph-Ziel aktiv";
    case "missing_runtime_truth":
      return "Graph-Ziel noch nicht belastbar";
  }
}

export function getAiOrchestrationReviewStateLabel(value: AiOrchestrationReviewState) {
  switch (value) {
    case "draft":
      return "Entwurf";
    case "review_required":
      return "Review erforderlich";
    case "operator_review":
      return "Admin-/Review-Kontext";
    case "planned_not_active":
      return "Nur geplant";
    case "not_required":
      return "Kein eigener Review-Schritt";
  }
}

export function getAiOrchestrationPublishStateLabel(value: AiOrchestrationPublishState) {
  switch (value) {
    case "not_published":
      return "Nicht veröffentlicht";
    case "publish_blocked":
      return "Publish blockiert";
    case "planned_not_active":
      return "Noch nicht aktiv";
  }
}

export function buildRundenAiOrchestrationProvenanceTrace(params?: {
  serverDraft?: ManualAnlassraumServerDraftSnapshot | null;
}): AiOrchestrationProvenanceTraceStep[] {
  const serverDraft = params?.serverDraft ?? null;
  const draftRef = serverDraft?.draftId ?? null;
  const baseInputContext = buildInputContext({
    initialText:
      serverDraft?.setup.title ??
      serverDraft?.setup.votingQuestion ??
      serverDraft?.setup.description ??
      null,
    draftId: draftRef,
    userScope: "not_required",
  });

  return [
    {
      stepId: "runden_no_ai_draft",
      surface: "/runden/new",
      trigger: "without_ai_save",
      inputContext: baseInputContext,
      inputOrigin: draftRef ? "Server-Draft aus /runden/new" : "Nutzertext",
      inputOriginType: draftRef ? "server_draft" : "human_input",
      inputOriginRef: draftRef,
      provider: null,
      model: null,
      providerKnown: false,
      providerVisibility: "public_safe",
      aiActive: false,
      usageRecorded: false,
      outputType: "draft_saved",
      outputOrigin: "human_input",
      sourceProvenance: draftRef
        ? [buildServerDraftSource(draftRef)!]
        : [
            {
              label: "Nutzertext",
              type: "human_input",
              ref: null,
              state: "present",
              visibility: "frontend_safe",
            },
          ],
      evidenceRefs: buildEvidenceRefs([draftRef]),
      graphTarget: "draft_pre_record",
      graphTargetState: "pre_record",
      reviewState: "draft",
      publishState: "not_published",
      userVisibleLabel: "No-AI-Entwurf bleibt ein Draft",
      adminVisibleLabel: "No-AI Draft Save /runden/new",
      missingRuntimeTruth: false,
      missingRuntimeTruthReasons: [],
    },
    {
      stepId: "runden_create_transition",
      surface: "/runden/new",
      trigger: "with_ai_continue",
      inputContext: baseInputContext,
      inputOrigin: draftRef ? "Server-Draft aus /runden/new" : "Nutzertext",
      inputOriginType: draftRef ? "server_draft" : "human_input",
      inputOriginRef: draftRef,
      provider: null,
      model: null,
      providerKnown: false,
      providerVisibility: "missing_runtime_truth",
      aiActive: false,
      usageRecorded: false,
      outputType: "draft_handoff_ready",
      outputOrigin: "human_input",
      sourceProvenance: draftRef
        ? [buildServerDraftSource(draftRef)!]
        : [
            {
              label: "Nutzertext",
              type: "human_input",
              ref: null,
              state: "present",
              visibility: "frontend_safe",
            },
          ],
      evidenceRefs: buildEvidenceRefs([draftRef]),
      graphTarget: "create_workspace",
      graphTargetState: "planned_handoff",
      reviewState: "review_required",
      publishState: "not_published",
      userVisibleLabel: "Übergang nach /create bleibt bewusst manuell",
      adminVisibleLabel: "Draft Handoff /runden/new -> /create",
      missingRuntimeTruth: true,
      missingRuntimeTruthReasons: [
        "Technische Modelltruth entsteht erst nach dem spaeteren KI-Schritt in /create.",
      ],
    },
  ];
}

export function buildCreateAiOrchestrationProvenanceTrace(
  params: CreateTraceInput,
): AiOrchestrationProvenanceTraceStep[] {
  const planner = params.plannerResult?.meta?.planner ?? null;
  const plannerProviderTrace = resolvePlannerProviderTrace(planner);
  const plannerSourceProvenance = buildCreateSourceProvenance({
    intakeContext: params.intakeContext,
    draftId: params.draftId,
    dossierId: params.dossierId,
    materialItems: params.materialItems,
    initialText: params.initialText,
  });
  const primaryInputOrigin = resolvePrimaryInputOrigin({
    intakeContext: params.intakeContext,
    draftId: params.draftId,
    dossierId: params.dossierId,
    materialItems: params.materialItems,
    initialText: params.initialText,
  });
  const analyzeProvider = resolveAnalyzeProvider(params.analyzeTrace);
  const analyzeMissingReasons = [...analyzeProvider.missingReasons];
  const hasCandidatePreview =
    params.candidatePreviewAvailable ??
    Boolean(params.plannerResult || params.analyzeTrace?.createAnalyze);
  const hasCandidateReviewHandoff =
    params.candidateReviewHandoffAvailable ?? hasCandidatePreview;
  const hasClaimToDossierPipeline =
    params.claimToDossierPipelineAvailable ?? false;
  const hasFeedEnrichmentSuggestions =
    params.feedEnrichmentSuggestionsAvailable ?? false;
  const analyzeEvidenceRefs = buildEvidenceRefs([
    params.analyzeTrace?.createAnalyze?.runId ?? null,
    params.analyzeTrace?.runReceipt?.id ?? null,
    params.analyzeTrace?.runReceipt?.snapshotId ?? null,
    ...(params.analyzeTrace?.createAnalyze?.provenanceRefs ?? []),
  ]);

  if (!params.analyzeTrace?.createAnalyze?.runId) {
    analyzeMissingReasons.push(
      "Analyze-Lauf wurde im Frontend noch nicht mit einer belastbaren runId sichtbar.",
    );
  }

  const candidatePreviewProvider =
    analyzeProvider.known
      ? {
          provider: analyzeProvider.provider,
          model: analyzeProvider.model,
          attempt: null,
          resultStatus: "succeeded" as const,
          known: true,
          visibility: "admin_review_only" as const,
        }
      : plannerProviderTrace;

  const steps: AiOrchestrationProvenanceTraceStep[] = [];

  if (params.handoff) {
    steps.push({
      stepId: "create_server_draft_transition",
      surface: "/create",
      trigger: "server_draft_handoff",
      inputContext: buildInputContext({
        initialText: params.initialText,
        intakeContext: params.intakeContext,
        draftId: params.draftId,
        dossierId: params.dossierId,
        anlassraumId: params.anlassraumId,
        userScope: params.handoff.usesServerDraft ? "present" : "missing_runtime_truth",
      }),
      inputOrigin: params.handoff.usesServerDraft
        ? "Server-Draft aus /runden/new"
        : "Uebergangskontext ohne belastbaren Server-Draft",
      inputOriginType: params.handoff.usesServerDraft ? "server_draft" : "human_input",
      inputOriginRef: params.handoff.draftId,
      provider: null,
      model: null,
      providerKnown: false,
      providerVisibility: params.handoff.usesServerDraft
        ? "public_safe"
        : "missing_runtime_truth",
      aiActive: false,
      usageRecorded: false,
      outputType: "draft_handoff_ready",
      outputOrigin: "human_input",
      sourceProvenance: plannerSourceProvenance.length
        ? plannerSourceProvenance
        : [
            {
              label: "Nutzertext",
              type: "human_input",
              ref: null,
              state: "present",
              visibility: "frontend_safe",
            },
          ],
      evidenceRefs: buildEvidenceRefs([params.handoff.draftId]),
      graphTarget: "create_workspace",
      graphTargetState: params.handoff.usesServerDraft
        ? "planned_handoff"
        : "missing_runtime_truth",
      reviewState: "review_required",
      publishState: "not_published",
      userVisibleLabel: "Server-Draft-Kontext für /create",
      adminVisibleLabel: "Create Handoff Integrity Context",
      missingRuntimeTruth: !params.handoff.usesServerDraft,
      missingRuntimeTruthReasons: params.handoff.usesServerDraft
        ? []
        : [params.handoff.detail],
    });
  }

  steps.push({
    stepId: "create_planner_trace",
    surface: "/api/create/intelligent-followup",
    trigger: "create_intelligent_followup_planner",
    inputContext: buildInputContext({
      initialText: params.initialText,
      intakeContext: params.intakeContext,
      draftId: params.draftId,
      dossierId: params.dossierId,
      anlassraumId: params.anlassraumId,
      requestId: params.plannerTrace?.requestId ?? null,
      operationId: params.plannerTrace?.operationId ?? null,
      operationType: params.plannerTrace?.operationType ?? null,
      userScope: params.plannerTrace?.userScope ?? "missing_runtime_truth",
    }),
    inputOrigin: primaryInputOrigin.inputOrigin,
    inputOriginType: primaryInputOrigin.inputOriginType,
    inputOriginRef: primaryInputOrigin.inputOriginRef,
    provider: plannerProviderTrace.provider,
    model: plannerProviderTrace.model,
    providerAttempt: plannerProviderTrace.attempt,
    providerResultStatus: plannerProviderTrace.resultStatus,
    providerKnown: plannerProviderTrace.known,
    providerVisibility: plannerProviderTrace.visibility,
    aiActive: plannerProviderTrace.resultStatus !== "not_attempted",
    usageRecorded: Boolean(planner?.providerCallAttempted),
    outputType: "planner_followup",
    outputOrigin:
      planner && hasValidatedCreatePlannerProviderIdentity(planner)
      ? "ai_assisted"
      : "human_input",
    sourceProvenance: plannerSourceProvenance,
    evidenceRefs: buildEvidenceRefs([
      params.plannerTrace?.requestId ?? null,
      params.plannerTrace?.operationId ?? null,
      params.draftId,
      params.dossierId,
    ]),
    graphTarget: planner?.providerPlan?.graphMatch === "after_structure"
      ? "graph_candidate"
      : "create_workspace",
    graphTargetState: planner?.providerPlan?.graphMatch === "after_structure"
      ? "candidate_only"
      : "missing_runtime_truth",
    reviewState: "review_required",
    publishState: "not_published",
    userVisibleLabel: "KI bereitet nächste Schritte vor",
    adminVisibleLabel: "Create Intelligent Follow-up Planner",
    missingRuntimeTruth: !params.plannerTrace?.requestId || !planner,
    missingRuntimeTruthReasons: [
      ...(!planner ? ["Planner-Ergebnis liegt im aktuellen Frontend-Zustand noch nicht als belastbare Runtime-Wahrheit vor."] : []),
      ...(!params.plannerTrace?.requestId
        ? ["Planner-Request-/Operation-Korrelation wird im aktuellen Frontend-Zustand noch nicht vollstaendig getragen."]
        : []),
      ...(plannerProviderTrace.model || !planner
        ? []
        : ["Der tatsächlich eingesetzte Planner-Modellname fehlt in den Runtime-Metadaten."]),
    ],
  });

  steps.push({
    stepId: "create_analyze_trace",
    surface: "/api/contributions/analyze",
    trigger: "create_analyze",
    inputContext: buildInputContext({
      initialText: params.initialText,
      intakeContext: params.intakeContext,
      draftId: params.draftId,
      dossierId: params.dossierId,
      anlassraumId: params.anlassraumId,
      runId: params.analyzeTrace?.createAnalyze?.runId ?? null,
      operationId: params.analyzeTrace?.createAnalyze?.runId ?? null,
      operationType: "create_analyze",
      userScope:
        params.analyzeTrace?.createAnalyze?.runId || params.dossierId
          ? "present"
          : "missing_runtime_truth",
    }),
    inputOrigin: primaryInputOrigin.inputOrigin,
    inputOriginType: primaryInputOrigin.inputOriginType,
    inputOriginRef: primaryInputOrigin.inputOriginRef,
    provider: analyzeProvider.provider,
    model: analyzeProvider.model,
    providerKnown: analyzeProvider.known,
    providerVisibility: analyzeProvider.known
      ? "admin_review_only"
      : "missing_runtime_truth",
    aiActive: Boolean(params.analyzeTrace?.createAnalyze?.runId),
    usageRecorded: Boolean(params.analyzeTrace?.createAnalyze?.runId),
    outputType: params.analyzeTrace?.runReceipt ? "run_receipt" : "analyze_result",
    outputOrigin: params.analyzeTrace?.createAnalyze?.runId
      ? "ai_assisted"
      : "planned_not_active",
    sourceProvenance: [
      ...plannerSourceProvenance,
      ...(params.analyzeTrace?.runReceipt?.sourceSet ?? []).map((source, index) => {
        const sourceType: AiOrchestrationInputOriginType =
          source.sourceType === "other" ? "manual_editorial" : "url";
        return {
          label: source.title ?? source.publisher ?? source.canonicalUrl ?? `Quelle ${index + 1}`,
          type: sourceType,
          ref: source.canonicalUrl ?? null,
          state: "present" as const,
          visibility: "admin_review_only" as const,
        };
      }),
    ],
    evidenceRefs: analyzeEvidenceRefs,
    graphTarget: "graph_candidate",
    graphTargetState: params.analyzeTrace?.createAnalyze?.runId
      ? "candidate_only"
      : "missing_runtime_truth",
    reviewState:
      params.analyzeTrace?.createAnalyze?.reviewRecommended === false
        ? "not_required"
        : "review_required",
    publishState: "publish_blocked",
    userVisibleLabel: "KI-Analyse bleibt ein Review-Schritt",
    adminVisibleLabel: "Create Analyze Runtime",
    missingRuntimeTruth: analyzeMissingReasons.length > 0,
    missingRuntimeTruthReasons: analyzeMissingReasons,
  });

  steps.push(
    {
      stepId: hasCandidatePreview
        ? hasCandidateReviewHandoff
          ? "claims_questions_review_handoff"
          : "claims_questions_candidate_preview"
        : "claims_questions_planned",
      surface: "/create",
      trigger: hasCandidatePreview ? "create_intelligent_followup_planner" : "downstream_planned",
      inputContext: buildInputContext({
        initialText: params.initialText,
        intakeContext: params.intakeContext,
        draftId: params.draftId,
        dossierId: params.dossierId,
        anlassraumId: params.anlassraumId,
        requestId: params.plannerTrace?.requestId ?? null,
        operationId:
          params.analyzeTrace?.createAnalyze?.runId ??
          params.plannerTrace?.operationId ??
          null,
        operationType: hasCandidatePreview
          ? "create_candidate_preview"
          : null,
        userScope: hasCandidatePreview ? "present" : "not_required",
      }),
      inputOrigin: hasCandidatePreview
        ? primaryInputOrigin.inputOrigin
        : "Geplanter Folgepfad",
      inputOriginType: hasCandidatePreview
        ? primaryInputOrigin.inputOriginType
        : "planned_not_active",
      inputOriginRef: hasCandidatePreview
        ? primaryInputOrigin.inputOriginRef
        : null,
      provider: candidatePreviewProvider.provider,
      model: candidatePreviewProvider.model,
      providerAttempt: candidatePreviewProvider.attempt,
      providerResultStatus: candidatePreviewProvider.resultStatus,
      providerKnown: candidatePreviewProvider.known,
      providerVisibility: candidatePreviewProvider.visibility,
      aiActive: Boolean(
        hasCandidatePreview &&
          (params.analyzeTrace?.createAnalyze?.runId || planner),
      ),
      usageRecorded: Boolean(hasCandidatePreview && (planner || params.analyzeTrace?.createAnalyze?.runId)),
      outputType: hasCandidatePreview
        ? hasCandidateReviewHandoff
          ? "candidate_review_handoff"
          : "candidate_preview"
        : "planned_not_active",
      outputOrigin: hasCandidatePreview ? "ai_assisted" : "planned_not_active",
      sourceProvenance: hasCandidatePreview
        ? [
            ...plannerSourceProvenance,
            ...(params.analyzeTrace?.runReceipt?.sourceSet ?? []).map((source, index) => {
              const sourceType: AiOrchestrationInputOriginType =
                source.sourceType === "other" ? "manual_editorial" : "url";
              return {
                label: source.title ?? source.publisher ?? source.canonicalUrl ?? `Quelle ${index + 1}`,
                type: sourceType,
                ref: source.canonicalUrl ?? null,
                state: "present" as const,
                visibility: "admin_review_only" as const,
              };
            }),
          ]
        : [
            {
              label: "Noch keine aktive Runtime",
              type: "planned_not_active",
              ref: null,
              state: "planned_not_active",
              visibility: "frontend_safe",
            },
          ],
      evidenceRefs: hasCandidatePreview
        ? buildEvidenceRefs([
            params.plannerTrace?.requestId ?? null,
            params.analyzeTrace?.createAnalyze?.runId ?? null,
            params.analyzeTrace?.runReceipt?.id ?? null,
            params.analyzeTrace?.runReceipt?.snapshotId ?? null,
            ...(params.analyzeTrace?.createAnalyze?.provenanceRefs ?? []),
            params.draftId,
          ])
        : [],
      graphTarget: hasCandidatePreview
        ? "review_queue_handoff"
        : "dossier_candidate",
      graphTargetState: hasCandidatePreview
        ? "candidate_only"
        : "planned_handoff",
      reviewState: hasCandidatePreview
        ? "review_required"
        : "planned_not_active",
      publishState: hasCandidatePreview
        ? "publish_blocked"
        : "planned_not_active",
      userVisibleLabel: hasCandidatePreview
        ? hasClaimToDossierPipeline
          ? "Claims, Gegenpositionen und Fragen sind als Dossier-/Graph-/Anlassraum-Handoff vorbereitet; Umfragen bleiben geplant"
          : hasCandidateReviewHandoff
          ? "Claims, Gegenpositionen, Fragen und Umfragen bleiben Review-Kandidaten und sind als Handoff vorbereitet"
          : "Claims, Gegenpositionen, Fragen und Umfragen bleiben Review-Kandidaten"
        : "Claims, Fragen und Umfragen bleiben geplant",
      adminVisibleLabel: hasCandidatePreview
        ? hasClaimToDossierPipeline
          ? "Claims / Questions / Dossier / Graph / Anlassraum review handoff"
          : hasCandidateReviewHandoff
          ? "Claims / Questions / Polls candidate review handoff"
          : "Claims / Questions / Polls candidate preview"
        : "Claims / Questions / Polls downstream planned",
      missingRuntimeTruth: hasCandidatePreview
        ? !candidatePreviewProvider.known
        : true,
      missingRuntimeTruthReasons: hasCandidatePreview
        ? candidatePreviewProvider.known
          ? []
          : [
              "Die Kandidatenvorschau ist sichtbar, aber ohne belastbare Provider-/Modelltruth für diesen Lauf.",
            ]
        : [
            "Dieser Folgepfad bleibt bewusst planned_not_active, solange keine echte Runtime oder belastbare Quellen-/Lauftruth existiert.",
          ],
    },
    {
      stepId: "feeds_social_voxy_planned",
      surface: "/create",
      trigger: "downstream_planned",
      inputContext: buildInputContext({
        initialText: params.initialText,
        intakeContext: params.intakeContext,
        draftId: params.draftId,
        dossierId: params.dossierId,
        anlassraumId: params.anlassraumId,
        userScope: "not_required",
      }),
      inputOrigin: "Geplanter Folgepfad",
      inputOriginType: "planned_not_active",
      inputOriginRef: null,
      provider: null,
      model: null,
      providerKnown: false,
      providerVisibility: "missing_runtime_truth",
      aiActive: false,
      usageRecorded: false,
      outputType: "planned_not_active",
      outputOrigin: "planned_not_active",
      sourceProvenance: [
        {
          label: "Noch keine aktive Runtime",
          type: "planned_not_active",
          ref: null,
          state: "planned_not_active",
          visibility: "frontend_safe",
        },
      ],
      evidenceRefs: [],
      graphTarget: "review_queue_handoff",
      graphTargetState: "planned_handoff",
      reviewState: "planned_not_active",
      publishState: "planned_not_active",
      userVisibleLabel: "Feeds, Social und Voxy bleiben geplant",
      adminVisibleLabel: "Feed / Social / Voxy downstream planned",
      missingRuntimeTruth: true,
      missingRuntimeTruthReasons: [
        "Dieser Folgepfad bleibt bewusst planned_not_active, solange keine echte Runtime oder belastbare Quellen-/Lauftruth existiert.",
      ],
    },
  );

  steps.push({
    stepId: hasFeedEnrichmentSuggestions
      ? "feed_enrichment_review_suggestions"
      : "feed_enrichment_planned",
    surface: "/create",
    trigger: hasFeedEnrichmentSuggestions
      ? "create_intelligent_followup_planner"
      : "downstream_planned",
    inputContext: buildInputContext({
      initialText: params.initialText,
      intakeContext: params.intakeContext,
      draftId: params.draftId,
      dossierId: params.dossierId,
      anlassraumId: params.anlassraumId,
      requestId: params.plannerTrace?.requestId ?? null,
      operationId:
        params.analyzeTrace?.createAnalyze?.runId ??
        params.plannerTrace?.operationId ??
        null,
      operationType: hasFeedEnrichmentSuggestions
        ? "create_feed_enrichment_review_suggestions"
        : null,
      userScope: hasFeedEnrichmentSuggestions ? "present" : "not_required",
    }),
    inputOrigin: hasFeedEnrichmentSuggestions
      ? primaryInputOrigin.inputOrigin
      : "Geplanter Folgepfad",
    inputOriginType: hasFeedEnrichmentSuggestions
      ? primaryInputOrigin.inputOriginType
      : "planned_not_active",
    inputOriginRef: hasFeedEnrichmentSuggestions
      ? primaryInputOrigin.inputOriginRef
      : null,
    provider: candidatePreviewProvider.provider,
    model: candidatePreviewProvider.model,
    providerAttempt: candidatePreviewProvider.attempt,
    providerResultStatus: candidatePreviewProvider.resultStatus,
    providerKnown: candidatePreviewProvider.known,
    providerVisibility: candidatePreviewProvider.visibility,
    aiActive: Boolean(
      hasFeedEnrichmentSuggestions &&
        (params.analyzeTrace?.createAnalyze?.runId || planner),
    ),
    usageRecorded: Boolean(
      hasFeedEnrichmentSuggestions &&
        (planner || params.analyzeTrace?.createAnalyze?.runId),
    ),
    outputType: hasFeedEnrichmentSuggestions
      ? "candidate_preview"
      : "planned_not_active",
    outputOrigin: hasFeedEnrichmentSuggestions
      ? "ai_assisted"
      : "planned_not_active",
    sourceProvenance: hasFeedEnrichmentSuggestions
      ? [
          ...plannerSourceProvenance,
          ...(params.analyzeTrace?.runReceipt?.sourceSet ?? []).map((source, index) => {
            const sourceType: AiOrchestrationInputOriginType =
              source.sourceType === "other" ? "manual_editorial" : "url";
            return {
              label: source.title ?? source.publisher ?? source.canonicalUrl ?? `Quelle ${index + 1}`,
              type: sourceType,
              ref: source.canonicalUrl ?? null,
              state: "present" as const,
              visibility: "admin_review_only" as const,
            };
          }),
        ]
      : [
          {
            label: "Noch keine aktive Runtime",
            type: "planned_not_active",
            ref: null,
            state: "planned_not_active",
            visibility: "frontend_safe",
          },
        ],
    evidenceRefs: hasFeedEnrichmentSuggestions
      ? buildEvidenceRefs([
          params.plannerTrace?.requestId ?? null,
          params.analyzeTrace?.createAnalyze?.runId ?? null,
          params.analyzeTrace?.runReceipt?.id ?? null,
          params.analyzeTrace?.runReceipt?.snapshotId ?? null,
          params.draftId,
        ])
      : [],
    graphTarget: "review_queue_handoff",
    graphTargetState: "planned_handoff",
    reviewState: hasFeedEnrichmentSuggestions
      ? "review_required"
      : "planned_not_active",
    publishState: hasFeedEnrichmentSuggestions
      ? "publish_blocked"
      : "planned_not_active",
    userVisibleLabel: hasFeedEnrichmentSuggestions
      ? "Vorhandene Feed-, Quellen- und Materialhinweise bleiben review-first Vorschläge"
      : "Feed-, Quellen- und Materialhinweise bleiben geplant",
    adminVisibleLabel: hasFeedEnrichmentSuggestions
      ? "Feed / source / material enrichment suggestions"
      : "Feed / source / material enrichment planned",
    missingRuntimeTruth: !hasFeedEnrichmentSuggestions || !candidatePreviewProvider.known,
    missingRuntimeTruthReasons: hasFeedEnrichmentSuggestions
      ? candidatePreviewProvider.known
        ? [
            "Feed-Enrichment-Vorschläge bleiben review-first und enthalten nur vorhandene Runtime-/Input-Hinweise; pro Hinweis kann weitere Source-Truth fehlen.",
          ]
        : [
            "Feed-Enrichment-Vorschläge sind sichtbar, aber ohne belastbare Provider-/Modelltruth für diesen Lauf.",
          ]
      : [
          "Dieser Feed-Enrichment-Folgepfad bleibt bewusst planned_not_active, solange keine echten Quellen-, Feed- oder Materialhinweise vorliegen.",
        ],
  });

  return steps;
}

export function buildAdminOrchestratorAiProvenanceTraceStep(params: {
  runId?: string | null;
  correlationId?: string | null;
  provider?: string | null;
  model?: string | null;
}): AiOrchestrationProvenanceTraceStep {
  const hasProviderContext = hasText(params.provider) || hasText(params.model);
  return {
    stepId: "admin_orchestrator_smoke_trace",
    surface: "/admin/telemetry/ai/orchestrator",
    trigger: "admin_orchestrator_smoke",
    inputContext: buildInputContext({
      runId: params.runId ?? null,
      requestId: params.correlationId ?? null,
      operationId: params.runId ?? params.correlationId ?? null,
      operationType: "admin_orchestrator_smoke",
      userScope: "not_required",
    }),
    inputOrigin: "Admin-Smoke-Input",
    inputOriginType: "manual_editorial",
    inputOriginRef: params.correlationId ?? params.runId ?? null,
    provider: params.provider ?? null,
    model: params.model ?? null,
    providerKnown: hasProviderContext,
    providerVisibility: hasProviderContext
      ? "admin_review_only"
      : "missing_runtime_truth",
    aiActive: true,
    usageRecorded: true,
    outputType: "admin_smoke_diagnostics",
    outputOrigin: "operational_trace",
    sourceProvenance: [
      {
        label: "Admin-Smoke-Run",
        type: "manual_editorial",
        ref: params.correlationId ?? params.runId ?? null,
        state: "present",
        visibility: "admin_review_only",
      },
    ],
    evidenceRefs: buildEvidenceRefs([params.runId ?? null, params.correlationId ?? null]),
    graphTarget: "none",
    graphTargetState: "not_applicable",
    reviewState: "operator_review",
    publishState: "not_published",
    userVisibleLabel: "Admin-Smoke-Run",
    adminVisibleLabel: "Admin AI Orchestrator Smoke",
    missingRuntimeTruth: !hasProviderContext,
    missingRuntimeTruthReasons:
      hasProviderContext
        ? []
        : ["Admin-Smoke fuehrt noch keinen belastbaren Provider-/Modellnamen."],
  };
}
