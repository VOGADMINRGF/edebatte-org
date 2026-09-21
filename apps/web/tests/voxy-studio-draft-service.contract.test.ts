import { describe, expect, it } from "vitest";

import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionOutput,
} from "@/features/voxyVideo/localCompositionRuntime";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import {
  approveVoxyStudioDraftForRender,
  bindVoxyStudioVerifiedRender,
  buildVoxyStudioEditorialReviewItemId,
  createVoxyStudioDraft,
  editVoxyStudioDraft,
  requestVoxyStudioDraftChanges,
  submitVoxyStudioDraftForReview,
  type VoxyStudioDraftServiceDependencies,
} from "@/features/voxyVideo/studioDraftService";
import { createInMemoryVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import type {
  ReviewQueueOperationAuditEvent,
  ReviewQueueOperationRecord,
} from "@features/reviewQueueOperations";

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
        claimBindings: [{ claimId: "claim-fact", presentation: "confirmed_fact" }],
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
        claimBindings: [{ claimId: "claim-fact", presentation: "confirmed_fact" }],
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

function evidence(options?: {
  sourceReviewState?: "review_required" | "approved" | "rejected";
  sourceEvidenceState?: "source_needed" | "partial" | "contested" | "supported" | "context_missing" | "outdated";
}): VoxyEditorialEvidenceContext {
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
          evidenceState: options?.sourceEvidenceState ?? "supported",
          reviewState: options?.sourceReviewState ?? "approved",
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

function composition(draft: VoxyStudioDraft): {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
} {
  const approval = draft.renderApproval!;
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
    locale: draft.storyPlan.outputLanguage,
    format: draft.selectedFormat,
    renderProfile: "local_review_v1",
    timelineVersion: `story-plan-r${draft.storyPlan.revision}`,
    timelineHash: "t".repeat(64),
    audioAssetId: "audio-1",
    previewReviewFlowId: `voxy-studio-preview:${draft.draftId}:r${draft.revision}`,
    decisionGateId: approval.decisionGateId,
    dossierRefId: draft.dossierId,
    status: "review_ready",
    attempt: 1,
    approvalRef: approval.reviewDecisionRecordId,
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
    width: name.includes("caption") ? null : 1920,
    height: name.includes("caption") ? null : 1080,
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
      decisionGateId: job.decisionGateId,
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

type TestRuntime = VoxyStudioDraftServiceDependencies & {
  evidenceContext: VoxyEditorialEvidenceContext;
  compositionResult: { job: VoxyLocalCompositionJob; output: VoxyLocalCompositionOutput } | null;
  reviewRecord: ReviewQueueOperationRecord | null;
  reviewAuditEvents: ReviewQueueOperationAuditEvent[];
  reviewPersistenceMode: "persistent_primary" | "in_memory_fallback";
};

function deps(): TestRuntime {
  const state: TestRuntime = {
    repository: createInMemoryVoxyStudioDraftRepository(),
    evidenceContext: evidence(),
    compositionResult: null,
    reviewRecord: null,
    reviewAuditEvents: [],
    reviewPersistenceMode: "persistent_primary",
    evidenceAuthority: {
      async resolveEvidenceContext() {
        return state.evidenceContext;
      },
    },
    editorialReviewAuthority: {
      async resolveEditorialReview({ reviewItemId }) {
        return {
          persistenceMode: state.reviewPersistenceMode,
          record:
            state.reviewRecord?.itemId === reviewItemId ? state.reviewRecord : null,
          auditEvents: state.reviewAuditEvents.filter(
            (event) => event.itemId === reviewItemId,
          ),
        };
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
  return { runtime, draft: submitted.draft, submitted };
}

function markEditorialReady(
  runtime: TestRuntime,
  draft: VoxyStudioDraft,
  actor = "admin-2",
) {
  const reviewItemId = buildVoxyStudioEditorialReviewItemId(draft);
  const at = "2026-09-21T19:09:00.000Z";
  runtime.reviewRecord = {
    itemId: reviewItemId,
    operationalStatus: "ready",
    assignedToUserId: actor,
    assignedByUserId: actor,
    assignedAt: at,
    noteCount: 0,
    latestNote: null,
    latestNoteAt: null,
    latestAction: "mark_ready",
    latestActionAt: at,
    latestActionByUserId: actor,
    createdAt: at,
    updatedAt: at,
  };
  runtime.reviewAuditEvents = [
    {
      id: "review-queue-audit-voxy-ready",
      itemId: reviewItemId,
      action: "mark_ready",
      byUserId: actor,
      at,
      note: null,
      previousOperationalStatus: "in_review",
      nextOperationalStatus: "ready",
      previousAssignedToUserId: actor,
      nextAssignedToUserId: actor,
    },
  ];
}

async function approve(runtime: TestRuntime, draft: VoxyStudioDraft) {
  markEditorialReady(runtime, draft);
  return approveVoxyStudioDraftForRender(
    {
      draftId: draft.draftId,
      expectedRevision: draft.revision,
      approvedByUserId: "admin-2",
    },
    runtime,
  );
}

describe("Voxy Studio Draft Service", () => {
  it("binds render approval to the persisted unified review audit instead of preview-review truth", async () => {
    const { runtime, draft, submitted } = await createAndSubmit();
    expect(submitted.reviewItemId).toBe(
      buildVoxyStudioEditorialReviewItemId(draft),
    );
    markEditorialReady(runtime, draft);
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
      reviewDecisionRecordId: "review-queue-audit-voxy-ready",
      approvedByUserId: "admin-2",
      approvedAt: "2026-09-21T19:09:00.000Z",
      studioDraftRevision: draft.revision,
      storyPlanRevision: draft.storyPlan.revision,
    });
    expect(approved.renderBinding).toBeNull();
  });

  it("fails closed until the exact editorial review item is marked ready", async () => {
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
    ).rejects.toThrow("voxy_studio_editorial_review_missing");
  });

  it("rejects non-persistent editorial review truth in production mode", async () => {
    const { runtime, draft } = await createAndSubmit();
    markEditorialReady(runtime, draft);
    runtime.reviewPersistenceMode = "in_memory_fallback";
    await expect(
      approveVoxyStudioDraftForRender(
        {
          draftId: draft.draftId,
          expectedRevision: draft.revision,
          approvedByUserId: "admin-2",
        },
        runtime,
      ),
    ).rejects.toThrow("voxy_studio_editorial_review_not_persistent");
  });

  it("rejects an approval caller who did not perform the persisted mark_ready action", async () => {
    const { runtime, draft } = await createAndSubmit();
    markEditorialReady(runtime, draft, "admin-3");
    await expect(
      approveVoxyStudioDraftForRender(
        {
          draftId: draft.draftId,
          expectedRevision: draft.revision,
          approvedByUserId: "admin-2",
        },
        runtime,
      ),
    ).rejects.toThrow("voxy_studio_editorial_review_actor_mismatch");
  });

  it("fails closed when a confirmed fact does not have approved supported source truth", async () => {
    const runtime = deps();
    runtime.evidenceContext = evidence({ sourceReviewState: "review_required" });
    const { draft } = await createAndSubmit(runtime);
    markEditorialReady(runtime, draft);

    await expect(
      approveVoxyStudioDraftForRender(
        {
          draftId: draft.draftId,
          expectedRevision: draft.revision,
          approvedByUserId: "admin-2",
        },
        runtime,
      ),
    ).rejects.toThrow("voxy_studio_editorial_approval_blocked");
  });

  it("requests changes explicitly and requires a new submission afterwards", async () => {
    const { runtime, draft } = await createAndSubmit();
    const changed = await requestVoxyStudioDraftChanges(
      {
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        requestedByUserId: "admin-2",
        note: "Quellenhinweis sichtbarer machen.",
      },
      runtime,
    );
    expect(changed.status).toBe("needs_changes");
    await expect(approve(runtime, changed)).rejects.toThrow(
      "voxy_studio_render_approval_not_allowed:needs_changes",
    );
  });

  it("invalidates approval/output on edits and rejects forbidden patch fields", async () => {
    const { runtime, draft } = await createAndSubmit();
    const approved = await approve(runtime, draft);

    await expect(
      editVoxyStudioDraft(
        {
          draftId: approved.draftId,
          expectedRevision: approved.revision,
          patch: {
            title: "Unzulässige Form",
            status: "approved_for_publish",
          } as any,
          updatedByUserId: "admin-1",
        },
        runtime,
      ),
    ).rejects.toThrow("voxy_studio_patch_field_forbidden:status");

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

  it("binds rendered state only to a matching verified #568 composition", async () => {
    const { runtime, draft } = await createAndSubmit();
    const approved = await approve(runtime, draft);
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
    expect(rendered.renderBinding?.outputSha256).toBe("a".repeat(64));
    expect(rendered.renderBinding?.storyPlanRevision).toBe(1);
  });

  it("rejects stale or foreign composition approval bindings", async () => {
    const { runtime, draft } = await createAndSubmit();
    const approved = await approve(runtime, draft);
    const foreign = composition(approved);
    foreign.job.approvalRef = "review-queue-audit-foreign";
    runtime.compositionResult = foreign;

    await expect(
      bindVoxyStudioVerifiedRender(
        {
          draftId: approved.draftId,
          expectedRevision: approved.revision,
          jobId: foreign.job.jobId,
          outputId: foreign.output.outputId,
          boundByUserId: "admin-2",
        },
        runtime,
      ),
    ).rejects.toThrow("composition_approval_ref_mismatch");
  });
});
