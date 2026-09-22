import { stableHash } from "@core/utils/hash";
import {
  VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS,
  type VoxyRenderPreviewReviewCheckKey,
} from "@/features/create/voxyRenderPreviewReviewFlowContract";
import {
  buildVoxyRenderPreviewReviewDecisionEffects,
  buildVoxyRenderPreviewReviewDecisionExecutionFlags,
  type VoxyRenderPreviewReviewDecisionChecklistResult,
  type VoxyRenderPreviewReviewDecisionPersistenceCommand,
  type VoxyRenderPreviewReviewDecisionRecord,
  type VoxyRenderPreviewReviewDecisionType,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceContract";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionOutput,
} from "./localCompositionRuntime";
import { assertVoxyStudioEditorialRenderCandidate } from "./studioRenderBindingGuard";
import type { VoxyStudioDraft } from "./studioDraft";

export type VoxyStudioPreviewReviewContext = {
  draft: VoxyStudioDraft;
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
};

export type VoxyStudioPreviewReviewMatch = {
  exact: boolean;
  reason:
    | "exact_output_decision"
    | "decision_missing"
    | "flow_mismatch"
    | "gate_mismatch"
    | "render_output_mismatch"
    | "draft_mismatch"
    | "story_mismatch"
    | "actor_or_time_missing";
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function assertContext(input: VoxyStudioPreviewReviewContext) {
  const { draft, job, output } = input;
  if (draft.status !== "rendered" || !draft.renderBinding) {
    throw new Error(`voxy_studio_preview_review_not_allowed:${draft.status}`);
  }
  assertVoxyStudioEditorialRenderCandidate({ job, output });
  if (
    draft.renderBinding.jobId !== job.jobId ||
    draft.renderBinding.outputId !== output.outputId ||
    draft.renderBinding.outputSha256 !== output.masterMp4.sha256 ||
    job.outputId !== output.outputId ||
    job.status !== "review_ready"
  ) {
    throw new Error("voxy_studio_preview_review_render_binding_mismatch");
  }
  if (
    draft.renderBinding.studioDraftRevision !== draft.revision ||
    draft.renderBinding.storyPlanRevision !== draft.storyPlan.revision
  ) {
    throw new Error("voxy_studio_preview_review_revision_binding_mismatch");
  }
}

export function buildVoxyStudioPreviewRenderDecisionId(
  input: VoxyStudioPreviewReviewContext,
): string {
  assertContext(input);
  return `voxy-studio-preview-output:${stableHash(
    [
      input.draft.draftId,
      input.draft.revision,
      input.draft.storyPlan.storyPlanId,
      input.draft.storyPlan.revision,
      input.job.jobId,
      input.output.outputId,
      input.output.previewWebm.sha256,
      input.output.masterMp4.sha256,
      input.job.reviewBindingHash,
    ].join(":"),
  ).slice(0, 32)}`;
}

export function validateVoxyStudioPreviewChecklist(input: {
  decisionType: VoxyRenderPreviewReviewDecisionType;
  checklistResults: readonly VoxyRenderPreviewReviewDecisionChecklistResult[];
}): string[] {
  const errors: string[] = [];
  const byKey = new Map<VoxyRenderPreviewReviewCheckKey, VoxyRenderPreviewReviewDecisionChecklistResult>();
  for (const item of input.checklistResults) {
    if (!VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.includes(item.checkKey)) {
      errors.push(`preview_review_check_key_invalid:${item.checkKey}`);
      continue;
    }
    if (byKey.has(item.checkKey)) {
      errors.push(`preview_review_check_duplicate:${item.checkKey}`);
      continue;
    }
    if (!normalized(item.reviewerVisibleReason) || !normalized(item.userVisibleReason)) {
      errors.push(`preview_review_check_reason_missing:${item.checkKey}`);
    }
    byKey.set(item.checkKey, item);
  }
  for (const checkKey of VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS) {
    if (!byKey.has(checkKey)) errors.push(`preview_review_check_missing:${checkKey}`);
  }
  if (
    input.decisionType === "mark_review_ready" &&
    VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.some(
      (checkKey) => byKey.get(checkKey)?.status !== "acceptable_for_review_ready",
    )
  ) {
    errors.push("preview_review_ready_requires_all_checks_acceptable");
  }
  return Array.from(new Set(errors));
}

function decisionSummaries(decisionType: VoxyRenderPreviewReviewDecisionType) {
  if (decisionType === "mark_review_ready") {
    return {
      nextStep: "Review-ready dokumentieren; Publish-Freigabe bleibt ein separater menschlicher Schritt.",
      userVisibleSummary: "Das exakte private Preview wurde menschlich geprüft und als review-ready dokumentiert. Es wurde nichts veröffentlicht.",
      reviewerVisibleSummary: "Review-ready ist an den exakten Render-Hash gebunden und löst weder Upload noch Publish noch einen weiteren Render aus.",
      statusHint: "needs_human_review" as const,
    };
  }
  if (decisionType === "request_revision") {
    return {
      nextStep: "Draft bewusst bearbeiten und als neue Revision erneut durch Editorial Review und Render führen.",
      userVisibleSummary: "Für dieses exakte Preview wurde eine Revision angefordert. Ein Re-Render startet nicht automatisch.",
      reviewerVisibleSummary: "Die Revisionsanforderung ist output-spezifisch auditierbar und hat keine Runtime-Nebenwirkung.",
      statusHint: "needs_revision" as const,
    };
  }
  if (decisionType === "reject_preview") {
    return {
      nextStep: "Ablehnung prüfen; eine neue Draft-/Render-Revision nur bewusst anlegen.",
      userVisibleSummary: "Dieses exakte Preview wurde abgelehnt. Es wurde nichts gelöscht, hochgeladen oder veröffentlicht.",
      reviewerVisibleSummary: "Die Ablehnung bleibt eine persistente Preview-Review-Entscheidung ohne Medien- oder Publish-Nebenwirkung.",
      statusHint: "needs_human_review" as const,
    };
  }
  if (decisionType === "keep_as_script_only") {
    return {
      nextStep: "Script-only-Entscheidung beibehalten oder später bewusst eine neue Revision anlegen.",
      userVisibleSummary: "Dieses Preview bleibt bewusst Script-only. Es erfolgt keine Veröffentlichung.",
      reviewerVisibleSummary: "Script-only ist output-spezifisch dokumentiert und erzeugt keine Runtime- oder Publish-Aktion.",
      statusHint: "keep_as_script_only" as const,
    };
  }
  if (decisionType === "blocked") {
    return {
      nextStep: "Blocker klären; keine automatische Runtime- oder Publish-Aktion ausführen.",
      userVisibleSummary: "Das Preview-Review ist blockiert. Es wurde nichts weiter ausgeführt.",
      reviewerVisibleSummary: "Der Blocker ist am exakten Render dokumentiert; alle Runtime- und Publish-Effekte bleiben aus.",
      statusHint: "needs_human_review" as const,
    };
  }
  return {
    nextStep: "Kommentar prüfen; Review-Status bleibt unverändert, bis eine ausdrückliche Entscheidung folgt.",
    userVisibleSummary: "Ein Review-Kommentar zum exakten Preview wurde dokumentiert. Es wurde nichts weiter ausgeführt.",
    reviewerVisibleSummary: "Der Kommentar ist an den exakten Render gebunden und bleibt ohne Runtime-Nebenwirkung.",
    statusHint: "needs_human_review" as const,
  };
}

export function buildVoxyStudioPreviewReviewCommand(input: VoxyStudioPreviewReviewContext & {
  reviewerUserId: string;
  decisionType: VoxyRenderPreviewReviewDecisionType;
  reviewerComment: string;
  checklistResults: VoxyRenderPreviewReviewDecisionChecklistResult[];
}): VoxyRenderPreviewReviewDecisionPersistenceCommand {
  assertContext(input);
  const reviewerUserId = normalized(input.reviewerUserId);
  const reviewerComment = normalized(input.reviewerComment);
  if (!reviewerUserId) throw new Error("voxy_studio_preview_reviewer_missing");
  if (!reviewerComment) throw new Error("voxy_studio_preview_review_comment_required");
  const checklistErrors = validateVoxyStudioPreviewChecklist(input);
  if (checklistErrors.length) {
    throw new Error(`voxy_studio_preview_checklist_invalid:${checklistErrors.join(",")}`);
  }

  const renderDecisionId = buildVoxyStudioPreviewRenderDecisionId(input);
  const summary = decisionSummaries(input.decisionType);
  const concernLines = input.checklistResults
    .filter((item) => item.status !== "acceptable_for_review_ready")
    .map((item) => `${item.checkKey}:${item.status}`);

  return {
    previewReviewFlowId: input.job.previewReviewFlowId,
    decisionGateId: input.job.decisionGateId,
    enablementBacklogId: null,
    matrixId: null,
    requestDraftId: input.draft.draftId,
    renderDecisionId,
    scriptRef: {
      id: input.draft.storyPlan.storyPlanId,
      title: `${input.draft.title} · Story r${input.draft.storyPlan.revision}`,
      href: null,
    },
    contributionRef: null,
    dossierRef: input.draft.dossierId
      ? { id: input.draft.dossierId, title: input.draft.dossierId, href: null }
      : null,
    reviewerRef: { id: reviewerUserId, title: reviewerUserId, href: null },
    sourceLanguage: input.draft.storyPlan.originalLanguage,
    readingLanguage: input.draft.storyPlan.outputLanguage,
    scriptLanguage: input.draft.storyPlan.outputLanguage,
    renderLanguage: input.output.locale,
    subtitleLanguage: input.output.locale,
    originalPreserved: true,
    translationIsEvidence: false,
    rtlRequired: input.output.locale.toLowerCase().split("-")[0] === "ar",
    decisionType: input.decisionType,
    decisionPayload: {
      reviewerComment,
      revisionReason: input.decisionType === "request_revision" ? reviewerComment : null,
      rejectionReason: input.decisionType === "reject_preview" ? reviewerComment : null,
      reviewReadyReason: input.decisionType === "mark_review_ready" ? reviewerComment : null,
      checklistFindings: concernLines,
      languageNotes: `Render-Sprache ${input.output.locale}; Story-Ausgabe ${input.draft.storyPlan.outputLanguage}.`,
      sourceCaptionNotes: null,
      claimSafetyNotes: null,
      brandNotes: null,
      accessibilityNotes: null,
      legalSafetyNotes: null,
    },
    checklistResults: input.checklistResults,
    decisionEffects: buildVoxyRenderPreviewReviewDecisionEffects(),
    executionFlags: buildVoxyRenderPreviewReviewDecisionExecutionFlags(),
    nextStep: summary.nextStep,
    userVisibleSummary: summary.userVisibleSummary,
    reviewerVisibleSummary: summary.reviewerVisibleSummary,
    previewReviewStatusHint: summary.statusHint,
  };
}

export function matchVoxyStudioPreviewReviewRecord(input: VoxyStudioPreviewReviewContext & {
  record: VoxyRenderPreviewReviewDecisionRecord | null;
}): VoxyStudioPreviewReviewMatch {
  assertContext(input);
  if (!input.record) return { exact: false, reason: "decision_missing" };
  if (input.record.previewReviewFlowId !== input.job.previewReviewFlowId) {
    return { exact: false, reason: "flow_mismatch" };
  }
  if (input.record.decisionGateId !== input.job.decisionGateId) {
    return { exact: false, reason: "gate_mismatch" };
  }
  if (input.record.renderDecisionId !== buildVoxyStudioPreviewRenderDecisionId(input)) {
    return { exact: false, reason: "render_output_mismatch" };
  }
  if (input.record.requestDraftId !== input.draft.draftId) {
    return { exact: false, reason: "draft_mismatch" };
  }
  if (input.record.scriptRef?.id !== input.draft.storyPlan.storyPlanId) {
    return { exact: false, reason: "story_mismatch" };
  }
  if (!input.record.persistedAt || !input.record.persistedBy) {
    return { exact: false, reason: "actor_or_time_missing" };
  }
  return { exact: true, reason: "exact_output_decision" };
}
