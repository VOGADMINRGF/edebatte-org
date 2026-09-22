import { describe, expect, it } from "vitest";

import { VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS } from "../src/features/create/voxyRenderPreviewReviewFlowContract";
import type { VoxyRenderPreviewReviewDecisionRecord } from "../src/features/create/voxyRenderPreviewReviewDecisionPersistenceContract";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionOutput,
} from "../src/features/voxyVideo/localCompositionRuntime";
import type { VoxyStudioDraft } from "../src/features/voxyVideo/studioDraft";
import {
  buildVoxyStudioPreviewRenderDecisionId,
  buildVoxyStudioPreviewReviewCommand,
  matchVoxyStudioPreviewReviewRecord,
  validateVoxyStudioPreviewChecklist,
} from "../src/features/voxyVideo/studioPreviewReview";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);

function buildDraft(): VoxyStudioDraft {
  return {
    version: "voxy-studio-draft-v1",
    draftId: "studio-draft-1",
    revision: 3,
    sourceKind: "dossier",
    dossierId: "dossier-1",
    briefingId: "briefing-1",
    title: "Voxy Preview Review",
    storyPlan: {
      version: "voxy-editorial-story-plan-v1",
      storyPlanId: "story-plan-1",
      revision: 2,
      briefingId: "briefing-1",
      dossierId: "dossier-1",
      title: "Voxy Preview Review",
      locale: "de",
      originalLanguage: "de",
      outputLanguage: "de",
      archetype: "explainer",
      durationClass: "explainer",
      chapters: [],
      derivedFromStoryPlanId: null,
      derivedFromRevision: null,
      reviewRequired: true,
      autoRender: false,
      autoPublish: false,
    },
    selectedFormat: "16:9",
    safeZoneProfile: "video",
    captionAdjustments: [],
    status: "rendered",
    renderApproval: {
      approvalSource: "human",
      reviewDecisionRecordId: "review-audit-1",
      decisionGateId: "voxy-studio-render:studio-draft-1:r3:story-r2",
      approvedByUserId: "admin-1",
      councilArtifactId: null,
      approvedAt: "2026-09-22T08:00:00.000Z",
      studioDraftRevision: 3,
      storyPlanRevision: 2,
    },
    renderBinding: {
      jobId: "voxy-local-job:test",
      outputId: "voxy-local-output:test",
      outputSha256: SHA_A,
      format: "16:9",
      studioDraftRevision: 3,
      storyPlanRevision: 2,
      renderedAt: "2026-09-22T08:30:00.000Z",
    },
    publishApproval: null,
    createdByUserId: "admin-1",
    updatedByUserId: "admin-1",
    createdAt: "2026-09-22T07:00:00.000Z",
    updatedAt: "2026-09-22T08:30:00.000Z",
    guardrails: {
      reviewRequired: true,
      requestCannotSetApproval: true,
      noAutoRender: true,
      noAutoPublish: true,
      noUpload: true,
      noScheduling: true,
      noSocialPost: true,
    },
  };
}

function buildJob(): VoxyLocalCompositionJob {
  return {
    jobId: "voxy-local-job:test",
    outputId: "voxy-local-output:test",
    identityKey: "identity-1",
    inputFingerprint: "input-fingerprint-1",
    reviewBindingHash: "review-binding-1",
    requestedByUserId: "admin-1",
    artifactId: "studio-draft-1",
    briefingId: "briefing-1",
    scriptVersion: "story-r2",
    locale: "de",
    format: "16:9",
    renderProfile: "editorial_v1",
    timelineVersion: "timeline-1",
    timelineHash: "timeline-hash-1",
    durationMs: 120_000,
    audioAssetId: "audio-1",
    previewReviewFlowId: "voxy-preview:test",
    decisionGateId: "voxy-studio-render:studio-draft-1:r3:story-r2",
    dossierRefId: "dossier-1",
    status: "review_ready",
    attempt: 1,
    approvalRef: "review-audit-1",
    createdAt: "2026-09-22T08:10:00.000Z",
    updatedAt: "2026-09-22T08:30:00.000Z",
    startedAt: "2026-09-22T08:11:00.000Z",
    completedAt: "2026-09-22T08:30:00.000Z",
    safeErrorCode: null,
    safeErrorMessage: null,
    reviewRequired: true,
    autoPublish: false,
    uploadTriggered: false,
    publishTriggered: false,
    socialPostTriggered: false,
  };
}

function mediaFile(input: { sha256: string; storageKey: string; mimeType: string; video?: boolean }) {
  return {
    storageKey: input.storageKey,
    sha256: input.sha256,
    sizeBytes: 1_000_000,
    durationMs: input.video ? 120_000 : null,
    width: input.video ? 1920 : null,
    height: input.video ? 1080 : null,
    mimeType: input.mimeType,
  };
}

function buildOutput(previewSha = SHA_B): VoxyLocalCompositionOutput {
  return {
    outputId: "voxy-local-output:test",
    jobId: "voxy-local-job:test",
    identityKey: "identity-1",
    inputFingerprint: "input-fingerprint-1",
    reviewBindingHash: "review-binding-1",
    timelineHash: "timeline-hash-1",
    format: "16:9",
    renderProfile: "editorial_v1",
    locale: "de",
    previewReviewFlowId: "voxy-preview:test",
    decisionGateId: "voxy-studio-render:studio-draft-1:r3:story-r2",
    dossierRefId: "dossier-1",
    masterMp4: mediaFile({ sha256: SHA_A, storageKey: "job/master.mp4", mimeType: "video/mp4", video: true }),
    previewWebm: mediaFile({ sha256: previewSha, storageKey: "job/preview.webm", mimeType: "video/webm", video: true }),
    captionsVtt: mediaFile({ sha256: SHA_C, storageKey: "job/captions.vtt", mimeType: "text/vtt" }),
    captionsSrt: mediaFile({ sha256: SHA_C, storageKey: "job/captions.srt", mimeType: "application/x-subrip" }),
    createdAt: "2026-09-22T08:30:00.000Z",
    reviewStatus: "needs_review",
    reviewRequired: true,
    publicAsset: false,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
  };
}

function acceptableChecklist() {
  return VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.map((checkKey) => ({
    checkKey,
    status: "acceptable_for_review_ready" as const,
    reviewerVisibleReason: `${checkKey} geprüft`,
    userVisibleReason: `${checkKey} geprüft`,
  }));
}

function buildRecord(command: ReturnType<typeof buildVoxyStudioPreviewReviewCommand>): VoxyRenderPreviewReviewDecisionRecord {
  return {
    ...command,
    decisionRecordId: "preview-decision-1",
    decisionStatus: "persisted_audit_only",
    persistedAt: "2026-09-22T09:00:00.000Z",
    persistedBy: "admin-1",
    idempotencyKey: "idempotency-1",
    previousDecisionRecordRef: null,
    supersedesDecisionRecordRef: null,
    decisionVersion: 1,
  };
}

describe("Voxy Studio exact-output preview review", () => {
  it("changes the decision binding when the rendered preview hash changes", () => {
    const draft = buildDraft();
    const job = buildJob();
    const first = buildVoxyStudioPreviewRenderDecisionId({ draft, job, output: buildOutput(SHA_B) });
    const second = buildVoxyStudioPreviewRenderDecisionId({ draft, job, output: buildOutput(SHA_C) });
    expect(first).not.toBe(second);
  });

  it("requires all canonical checks to be explicitly acceptable before review-ready", () => {
    const checklist = acceptableChecklist();
    checklist[0] = { ...checklist[0]!, status: "concern" };
    expect(
      validateVoxyStudioPreviewChecklist({
        decisionType: "mark_review_ready",
        checklistResults: checklist,
      }),
    ).toContain("preview_review_ready_requires_all_checks_acceptable");
  });

  it("builds an audit-only decision command with no runtime or publish side effects", () => {
    const draft = buildDraft();
    const job = buildJob();
    const output = buildOutput();
    const command = buildVoxyStudioPreviewReviewCommand({
      draft,
      job,
      output,
      reviewerUserId: "admin-1",
      decisionType: "mark_review_ready",
      reviewerComment: "Preview vollständig menschlich geprüft.",
      checklistResults: acceptableChecklist(),
    });

    expect(command.renderDecisionId).toBe(
      buildVoxyStudioPreviewRenderDecisionId({ draft, job, output }),
    );
    expect(command.requestDraftId).toBe(draft.draftId);
    expect(command.scriptRef?.id).toBe(draft.storyPlan.storyPlanId);
    expect(Object.values(command.decisionEffects).every((value) => value === false)).toBe(true);
    expect(Object.values(command.executionFlags).every((value) => value === false)).toBe(true);
  });

  it("rejects a persisted decision from a different rendered output", () => {
    const draft = buildDraft();
    const job = buildJob();
    const output = buildOutput(SHA_B);
    const command = buildVoxyStudioPreviewReviewCommand({
      draft,
      job,
      output,
      reviewerUserId: "admin-1",
      decisionType: "mark_review_ready",
      reviewerComment: "Preview vollständig geprüft.",
      checklistResults: acceptableChecklist(),
    });
    const staleRecord = buildRecord({
      ...command,
      renderDecisionId: "voxy-studio-preview-output:stale",
    });
    expect(matchVoxyStudioPreviewReviewRecord({ draft, job, output, record: staleRecord })).toEqual({
      exact: false,
      reason: "render_output_mismatch",
    });
  });
});
