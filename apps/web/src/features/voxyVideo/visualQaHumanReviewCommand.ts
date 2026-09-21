import {
  buildVoxyRenderPreviewReviewDecisionEffects,
  buildVoxyRenderPreviewReviewDecisionExecutionFlags,
  type VoxyRenderPreviewReviewDecisionPersistenceCommand,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceContract";

export const VOXY_VISUAL_QA_HUMAN_DECISIONS = [
  "approved",
  "needs_changes",
  "rejected",
] as const;

export type VoxyVisualQaHumanDecision =
  (typeof VOXY_VISUAL_QA_HUMAN_DECISIONS)[number];

const DECISION_GATE_PATTERN =
  /^voxy-visual-qa:[a-f0-9]{40}:r([1-9]\d*):voxy-visual-qa-checkpoint-v4:r\1:[a-f0-9]{8}$/;

const DECISION_TYPE_BY_HUMAN_DECISION = {
  approved: "mark_review_ready",
  needs_changes: "request_revision",
  rejected: "reject_preview",
} as const;

const VISUAL_QA_CHECKS = [
  "brand_fit",
  "voxy_presence",
  "subtitle_readability",
  "accessibility",
  "publication_safety",
] as const;

export function isVoxyVisualQaReviewDecisionGateId(value: string): boolean {
  return DECISION_GATE_PATTERN.test(value.trim());
}

export function buildVoxyVisualQaHumanReviewCommand(input: {
  decisionGateId: string;
  decision: VoxyVisualQaHumanDecision;
  reviewerComment: string;
}): VoxyRenderPreviewReviewDecisionPersistenceCommand {
  const decisionGateId = input.decisionGateId.trim();
  if (!isVoxyVisualQaReviewDecisionGateId(decisionGateId)) {
    throw new Error("invalid_voxy_visual_qa_decision_gate_id");
  }

  const reviewerComment = input.reviewerComment.trim();
  if (!reviewerComment) {
    throw new Error("voxy_visual_qa_reviewer_comment_required");
  }

  const decisionType = DECISION_TYPE_BY_HUMAN_DECISION[input.decision];
  const acceptable = input.decision === "approved";
  const checklistStatus = acceptable
    ? "acceptable_for_review_ready"
    : "concern";
  const decisionLabel =
    input.decision === "approved"
      ? "menschlich freigegeben"
      : input.decision === "needs_changes"
        ? "mit Änderungsbedarf bewertet"
        : "menschlich abgelehnt";

  return {
    previewReviewFlowId: `voxy-visual-qa-review:${decisionGateId}`,
    decisionGateId,
    sourceLanguage: "de",
    readingLanguage: "de",
    scriptLanguage: "de",
    renderLanguage: "de",
    subtitleLanguage: null,
    originalPreserved: true,
    translationIsEvidence: false,
    rtlRequired: false,
    decisionType,
    decisionPayload: {
      reviewerComment,
      revisionReason: input.decision === "needs_changes" ? reviewerComment : null,
      rejectionReason: input.decision === "rejected" ? reviewerComment : null,
      reviewReadyReason: input.decision === "approved" ? reviewerComment : null,
      checklistFindings: [reviewerComment],
      languageNotes: null,
      sourceCaptionNotes: null,
      claimSafetyNotes: null,
      brandNotes: reviewerComment,
      accessibilityNotes: reviewerComment,
      legalSafetyNotes: null,
    },
    checklistResults: VISUAL_QA_CHECKS.map((checkKey) => ({
      checkKey,
      status: checklistStatus,
      reviewerVisibleReason: `Voxy 200-%-QA wurde ${decisionLabel}: ${reviewerComment}`,
      userVisibleReason:
        "Die Entscheidung betrifft ausschließlich den internen Voxy-Visual-QA-Checkpoint.",
    })),
    decisionEffects: buildVoxyRenderPreviewReviewDecisionEffects(),
    executionFlags: buildVoxyRenderPreviewReviewDecisionExecutionFlags(),
    nextStep:
      input.decision === "approved"
        ? "Revision-bound Visual-QA-Entscheidung gegen die aktuelle Evidence verifizieren."
        : "Visual-QA-Evidence korrigieren und eine neue revisionsgebundene Reviewrevision erzeugen.",
    userVisibleSummary:
      "Diese interne Entscheidung startet weder Render noch Upload, Scheduling oder Publishing.",
    reviewerVisibleSummary: `Voxy 200-%-Visual-QA ${decisionLabel}; Gate ${decisionGateId}.`,
    previewReviewStatusHint:
      input.decision === "needs_changes" ? "needs_revision" : "needs_human_review",
  };
}
