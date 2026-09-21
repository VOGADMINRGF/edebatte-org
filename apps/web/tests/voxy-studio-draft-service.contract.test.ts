import { describe, expect, it } from "vitest";

import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import type { VoxyRenderPreviewReviewDecisionRecord } from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceContract";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionOutput,
} from "@/features/voxyVideo/localCompositionRuntime";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import {
  buildVoxyStudioRenderReviewGateId,
  type VoxyStudioDraft,
} from "@/features/voxyVideo/studioDraft";
import {
  approveVoxyStudioDraftForRender,
  bindVoxyStudioVerifiedRender,
  createVoxyStudioDraft,
  editVoxyStudioDraft,
  submitVoxyStudioDraftForReview,
  type VoxyStudioDraftServiceDependencies,
} from "@/features/voxyVideo/studioDraftService";
import { createInMemoryVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";

function storyPlan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story-plan-1",
    revision: 1,
    briefingId: "briefing-1",
    dossierId: "dossier-1",
    title: "Belegter Ausgangspunkt",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "explainer",
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    chapters: [
      {
        chapterId: "what-happened",
        role: "what_happened",
        headline: "Was ist passiert?",
        narration: "Der belegte Ausgangspunkt.",
        claimBindings: [
          { claimId: "claim-fact", presentation: "confirmed_fact" },
        ],
        sourceIds: ["source-primary"],
        findingIds: ["finding-fact"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: ["finding-fact"],
        },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "evidence",
        role: "source_evidence",
        headline: "Worauf stützt sich das?",
        narration: "Die Quelle bleibt sichtbar.",
        claimBindings: [
          { claimId: "claim-fact", presentation: "confirmed_fact" },
        ],
        sourceIds: ["source-primary"],
        findingIds: ["finding-fact"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: ["finding-fact"],
        },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

function evidence(): VoxyEditorialEvidenceContext {
  return {
    sourcePack: buildCanonicalSourcePack({
      sourcePackId: "pack",
      reviewState: "approved",
      sources: [
        {
          sourceId: "source-primary",
          title: "Primary",
          sourceType: "official",
          reliabilityHint: "primary",
          translationStatus: "not_needed",
          evidenceState: "supported",
          reviewState: "approved",
        },
      ],
    }),
    claims: [
      {
        claimId: "claim-fact",
        dossierId: "dossier-1",
        text: "Belegter Fakt",
        kind: "fact",
        status: "supported",
        createdByRole: "editor",
      },
    ],
    findings: [
      {
        findingId: "finding-fact",
        dossierId: "dossier-1",
        claimId: "claim-fact",
        verdict: "supports",
        rationale: ["supported"],
        citations: [{ sourceId: "source-primary", locator: "section 1" }],
        producedBy: "editor",
      },
    ],
    openQuestions: [],
  };
}

function reviewRecord(draft: VoxyStudioDraft): VoxyRenderPreviewReviewDecisionRecord {
  return {
    decisionRecordId: "review-record-1",
    previewReviewFlowId: `voxy-studio-review:${draft.draftId}`,
    decisionGateId: buildVoxyStudioRenderReviewGateId(draft),
    requestDraftId: draft.draftId,
    scriptRef: {
      id: draft.storyPlan.storyPlanId,
      title: `Story r${draft.storyPlan.revision}`,
    },
    reviewerRef: { id: "reviewer-1", title: "Reviewer" },
    createdAt: "2026-09-21T19:00:00.000Z",
    updatedAt: "2026-09-21T19:00:00.000Z",
    sourceLanguage: "de",
    readingLanguage: "de",
    scriptLanguage: "de",
    renderLanguage: "de",
    subtitleLanguage: "de",
    originalPreserved: true,
    translationIsEvidence: false,
    rtlRequired: false,
    decisionType: "mark_review_ready",
    decisionStatus: "persisted_audit_only",
    decisionPayload: {
      reviewerComment: "Alle Evidenzbindungen geprüft.",
      revisionReason: null,
      rejectionReason: null,
      reviewReadyReason: "Review abgeschlossen.",
      checklistFindings: [],
      languageNotes: null,
      sourceCaptionNotes: null,
      claimSafetyNotes: null,
      brandNotes: null,
      accessibilityNotes: null,
      legalSafetyNotes: null,
    },
    checklistResults: [],
    decisionEffects: {
      createsRenderJob: false,
      triggersRerender: false,
      triggersProvider: false,
      createsQueueJob: false,
      createsMediaFile: false,
      createsUpload: false,
      triggersPublish: false,
      costDebitAllowed: false,
      creditDebitAllowed: false,
      runtimeClaimAllowed: false,
    },
    executionFlags: {
      previewRendered: false,
      renderAllowed: false,
      rerenderAllowed: false,
      queueAllowed: false,
      workerAllowed: false,
      providerExecutionAllowed: false,
      secretsAccessed: false,
      mediaFileCreationAllowed: false,
      previewFileAvailable: false,
      uploadAllowed: false,
      publishAllowed: false,
      socialPostAllowed: false,
      schedulingAllowed: false,
      runtimeClaimAllowed: false,
    },
    nextStep: "Admin may explicitly approve render.",
    userVisibleSummary: "review ready",
    reviewerVisibleSummary: "review ready only",
    persistedAt: "2026-09-21T19:00:00.000Z",
    persistedBy: "reviewer-1",
    idempotencyKey: "review-idempotency-1",
    previousDecisionRecordRef: null,
    supersedesDecisionRecordRef: null,
    decisionVersion: 1,
    enablementBacklogId: null,
    matrixId: null,
    renderDecisionId: null,
    contributionRef: null,
    dossierRef: null,
    previewReviewStatusHint: "needs_human_review",
  };
}

function composition(draft: VoxyStudioDraft): {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
} {
  const gate = draft.renderApproval!.decisionGateId;
  const job: VoxyLocalCompositionJob = {
    jobId: "voxy-local-job:studio-test",
    outputId: "voxy-local-output:studio-test",
    identityKey: "identity",
    inputFingerprint: "f".repeat(64),
    reviewBindingHash: "b".repeat(64),
    requestedByUserId: "admin-1",
    artifactId: draft.draftId,
    briefingId: draft.briefingId,
    scriptVersion: `story-r${draft.storyPlan.revision}`,
    locale: draft.storyPlan.locale,
    format: draft.selectedFormat,
    renderProfile: "local_review_v1",
    timelineVersion: `story-plan-r${draft.storyPlan.revision}`,
    timelineHash: "t".repeat(64),
    audioAssetId: "audio-1",
    previewReviewFlowId: `voxy-studio-review:${draft.draftId}`,
    decisionGateId: gate,
    dossierRefId: draft.dossierId,
    status: "review_ready",
    attempt: 1,
    approvalRef: draft.renderApproval!.reviewDecisionRecordId,
    createdAt: "2026-09-21T19:01:00.000Z",
    updatedAt: "2026-09-21T19:02:00.000Z",
    startedAt: "2026-09-21T19:01:00.000Z",
    completedAt: "2026-09-21T19:02:00.000Z",
    safeErrorCode: null,
    safeErrorMessage: null,
    reviewRequired: true,
    autoPublish: false,
    uploadTriggered: false,
    publishTriggered: false,
    socialPostTriggered: false,
  };
  const media = (name: string, mimeType: string) => ({
    storageKey: `private/${name}`,
    sha256: "a".repeat(64),
    sizeBytes: 100,
    durationMs: name.includes("caption") ? null : 180_000,
    width: name.includes("caption") ? null : 1280,
    height: name.includes("caption") ? null : 720,
    mimeType,
  });
  return {
    job,
    output: {
      outputId: job.outputId,
      jobId: job.jobId,
      identityKey: job.identityKey,
      inputFingerprint: job.inputFingerprint,
      reviewBindingHash: job.reviewBindingHash,
      timelineHash: job.timelineHash,
      format: job.format,
      renderProfile: job.renderProfile,
      locale: job.locale,
      previewReviewFlowId: job.previewReviewFlowId,
      decisionGateId: gate,
      dossierRefId: draft.dossierId,
      masterMp4: media("master.mp4", "video/mp4"),
      previewWebm: media("preview.webm", "video/webm"),
      captionsVtt: media("captions.vtt", "text/vtt"),
      captionsSrt: media("captions.srt", "application/x-subrip"),
      createdAt: job.completedAt!,
      reviewStatus: "needs_review",
      reviewRequired: true,
      publicAsset: false,
      uploaded: false,
      scheduled: false,
      socialPosted: false,
      published: false,
    },
  };
}

function deps(): VoxyStudioDraftServiceDependencies & {
  reviewRecord: VoxyRenderPreviewReviewDecisionRecord | null;
  reviewMode: "persistent_primary" | "in_memory_fallback";
  compositionResult: { job: VoxyLocalCompositionJob; output: VoxyLocalCompositionOutput } | null;
} {
  const state = {
    repository: createInMemoryVoxyStudioDraftRepository(),
    evidenceAuthority: {
      async resolveEvidenceContext() {
        return evidence();
      },
    },
    reviewRecord: null as VoxyRenderPreviewReviewDecisionRecord | null,
    reviewMode: "persistent_primary" as const,
    compositionResult: null as { job: VoxyLocalCompositionJob; output: VoxyLocalCompositionOutput } | null,
    reviewAuthority: {
      async resolveLatestDecision() {
        return { persistenceMode: state.reviewMode, record: state.reviewRecord };
      },
    },
    compositionAuthority: {
      async resolveComposition() {
        return state.compositionResult ?? { job: null, output: null };
      },
    },
    now: () => "2026-09-21T19:10:00.000Z",
  };
  return state;
}

async function createAndSubmit(runtime = deps()) {
  const draft = await createVoxyStudioDraft(
    {
      clientRequestId: "request-1",
      sourceKind: "dossier",
      dossierId: "dossier-1",
      briefingId: "briefing-1",
      title: "Video",
      storyPlan: storyPlan(),
      selectedFormat: "16:9",
      safeZoneProfile: "video",
      createdByUserId: "admin-1",
    },
    runtime,
  );
  const submitted = await submitVoxyStudioDraftForReview(
    {
      draftId: draft.draftId,
      expectedRevision: draft.revision,
      submittedByUserId: "admin-1",
    },
    runtime,
  );
  return { runtime, draft: submitted.draft };
}

describe("Voxy Studio Draft Service", () => {
  it("requires an existing persistent review-ready decision before explicit render approval", async () => {
    const { runtime, draft } = await createAndSubmit();
    await expect(
      approveVoxyStudioDraftForRender(
        {
          draftId: draft.draftId,
          expectedRevision: draft.revision,
          approvedByUserId: "admin-2",
        },
        runtime,
      ),
    ).rejects.toThrow("voxy_studio_review_decision_missing");

    runtime.reviewRecord = reviewRecord(draft);
    const approved = await approveVoxyStudioDraftForRender(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        approvedByUserId: "admin-2",
      },
      runtime,
    );
    expect(approved.status).toBe("approved_for_render");
    expect(approved.renderApproval).toMatchObject({
      reviewDecisionRecordId: "review-record-1",
      approvedByUserId: "admin-2",
      studioDraftRevision: draft.revision,
      storyPlanRevision: draft.storyPlan.revision,
    });
  });

  it("does not accept in-memory review truth for production approval", async () => {
    const { runtime, draft } = await createAndSubmit();
    runtime.reviewMode = "in_memory_fallback";
    runtime.reviewRecord = reviewRecord(draft);
    await expect(
      approveVoxyStudioDraftForRender(
        {
          draftId: draft.draftId,
          expectedRevision: draft.revision,
          approvedByUserId: "admin-2",
        },
        runtime,
      ),
    ).rejects.toThrow("voxy_studio_review_not_persistent");
  });

  it("invalidates render approval and output currency on every editable revision", async () => {
    const { runtime, draft } = await createAndSubmit();
    runtime.reviewRecord = reviewRecord(draft);
    const approved = await approveVoxyStudioDraftForRender(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        approvedByUserId: "admin-2",
      },
      runtime,
    );

    const edited = await editVoxyStudioDraft(
      {
        draftId: approved.draftId,
        expectedRevision: approved.revision,
        patch: { title: "Korrigierter Titel" },
        updatedByUserId: "admin-1",
      },
      runtime,
    );
    expect(edited.revision).toBe(approved.revision + 1);
    expect(edited.status).toBe("needs_review");
    expect(edited.renderApproval).toBeNull();
    expect(edited.renderBinding).toBeNull();
    expect(edited.publishApproval).toBeNull();
  });

  it("ignores request-shaped approval fields because they are not editable state", async () => {
    const { runtime, draft } = await createAndSubmit();
    const edited = await editVoxyStudioDraft(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        patch: {
          title: "Legitime Änderung",
          status: "approved_for_publish",
          renderApproval: { fake: true },
        } as never,
        updatedByUserId: "admin-1",
      },
      runtime,
    );
    expect(edited.status).toBe("needs_review");
    expect(edited.renderApproval).toBeNull();
    expect(edited.publishApproval).toBeNull();
  });

  it("binds rendered state only to a verified #568 review-ready output on the exact gate", async () => {
    const { runtime, draft } = await createAndSubmit();
    runtime.reviewRecord = reviewRecord(draft);
    const approved = await approveVoxyStudioDraftForRender(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        approvedByUserId: "admin-2",
      },
      runtime,
    );
    runtime.compositionResult = composition(approved);
    const rendered = await bindVoxyStudioVerifiedRender(
      {
        draftId: approved.draftId,
        expectedRevision: approved.revision,
        jobId: runtime.compositionResult.job.jobId,
        outputId: runtime.compositionResult.output.outputId,
        boundByUserId: "admin-2",
      },
      runtime,
    );
    expect(rendered.status).toBe("rendered");
    expect(rendered.renderBinding).toMatchObject({
      jobId: runtime.compositionResult.job.jobId,
      outputId: runtime.compositionResult.output.outputId,
      outputSha256: "a".repeat(64),
      studioDraftRevision: approved.revision,
    });
    expect(rendered.publishApproval).toBeNull();
  });

  it("rejects a #568 output bound to another review gate", async () => {
    const { runtime, draft } = await createAndSubmit();
    runtime.reviewRecord = reviewRecord(draft);
    const approved = await approveVoxyStudioDraftForRender(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        approvedByUserId: "admin-2",
      },
      runtime,
    );
    const wrong = composition(approved);
    wrong.job.decisionGateId = "other-gate";
    wrong.output.decisionGateId = "other-gate";
    runtime.compositionResult = wrong;
    await expect(
      bindVoxyStudioVerifiedRender(
        {
          draftId: approved.draftId,
          expectedRevision: approved.revision,
          jobId: wrong.job.jobId,
          outputId: wrong.output.outputId,
          boundByUserId: "admin-2",
        },
        runtime,
      ),
    ).rejects.toThrow("composition_review_gate_mismatch");
  });
});
