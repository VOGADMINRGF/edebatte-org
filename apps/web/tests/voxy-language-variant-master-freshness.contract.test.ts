import { describe, expect, it } from "vitest";

import {
  buildVoxyLocalCompositionInputFingerprint,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import { executeVoxyLocalComposition } from "@/features/voxyVideo/localCompositionRuntimeService";
import { createInMemoryVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import {
  buildEditorialLanguageVariantDraft,
  type EditorialLanguageVariantDraft,
} from "@/features/voxyVideo/editorialLanguageVariant";
import { buildEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import {
  createVoxyStudioLocalCompositionFreshnessAuthority,
} from "@/features/voxyVideo/studioLocalCompositionFreshness";
import {
  createInMemoryVoxyStudioDraftStore,
} from "@/features/voxyVideo/studioDraftStore";
import {
  buildEvidenceWindow,
  buildVoxyStudioDraft,
} from "@/features/voxyVideo/studioDraft";

function sourceDraft() {
  const evidenceWindow = buildEvidenceWindow({
    dossierId: "dossier-1",
    claims: [
      {
        id: "claim-1",
        text: "The source says one thing.",
        verdict: "supported",
        sourceIds: ["source-1"],
      },
    ],
    sources: [
      {
        id: "source-1",
        title: "Primary source",
        url: "https://example.org/source",
        publisher: "Example",
        publishedAt: "2026-09-25T12:00:00.000Z",
        retrievedAt: "2026-09-25T12:05:00.000Z",
        excerpt: "Evidence excerpt",
      },
    ],
    findings: [],
    openQuestions: [],
  });
  const storyPlan = buildEditorialStoryPlan({
    dossierId: "dossier-1",
    evidenceWindow,
    locale: "de",
    targetDurationMs: 1_000,
  });
  return buildVoxyStudioDraft({
    draftId: "draft-source",
    dossierId: "dossier-1",
    briefingId: "brief-1",
    locale: "de",
    evidenceWindow,
    storyPlan,
    createdByUserId: "user-1",
    createdAt: "2026-09-26T05:00:00.000Z",
  });
}

function variantDraftFrom(source: ReturnType<typeof sourceDraft>): EditorialLanguageVariantDraft {
  return buildEditorialLanguageVariantDraft({
    sourceDraft: source,
    targetLocale: "fr",
    createdByUserId: "user-1",
    createdAt: "2026-09-26T05:10:00.000Z",
  });
}

describe("Voxy language-variant master freshness at render/worker boundary", () => {
  it("accepts the current language master binding", async () => {
    const source = sourceDraft();
    const variantDraft = variantDraftFrom(source);
    const store = createInMemoryVoxyStudioDraftStore({
      drafts: [source, variantDraft],
    });
    const freshnessAuthority = createVoxyStudioLocalCompositionFreshnessAuthority({
      draftStore: store,
    });

    await expect(
      freshnessAuthority.assertCurrent({
        job: {
          artifactId: variantDraft.draftId,
          renderProfile: "editorial_v1",
        } as VoxyLocalCompositionJob,
        request: {
          artifactId: variantDraft.draftId,
          renderProfile: "editorial_v1",
        } as VoxyLocalCompositionRequest,
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects a language variant after source master drift", async () => {
    const source = sourceDraft();
    const variantDraft = variantDraftFrom(source);
    const driftedSource = {
      ...source,
      revision: source.revision + 1,
      storyPlan: {
        ...source.storyPlan,
        revision: source.storyPlan.revision + 1,
      },
      updatedAt: "2026-09-26T05:20:00.000Z",
    };
    const store = createInMemoryVoxyStudioDraftStore({
      drafts: [driftedSource, variantDraft],
    });
    const freshnessAuthority = createVoxyStudioLocalCompositionFreshnessAuthority({
      draftStore: store,
    });

    await expect(
      freshnessAuthority.assertCurrent({
        job: {
          artifactId: variantDraft.draftId,
          renderProfile: "editorial_v1",
        } as VoxyLocalCompositionJob,
        request: {
          artifactId: variantDraft.draftId,
          renderProfile: "editorial_v1",
        } as VoxyLocalCompositionRequest,
      }),
    ).rejects.toThrow("language_variant_master_stale");
  });

  it("rejects a language variant after source evidence drift", async () => {
    const source = sourceDraft();
    const variantDraft = variantDraftFrom(source);
    const driftedSource = {
      ...source,
      evidenceWindow: {
        ...source.evidenceWindow,
        fingerprint: "changed-evidence-fingerprint",
      },
      updatedAt: "2026-09-26T05:20:00.000Z",
    };
    const store = createInMemoryVoxyStudioDraftStore({
      drafts: [driftedSource, variantDraft],
    });
    const freshnessAuthority = createVoxyStudioLocalCompositionFreshnessAuthority({
      draftStore: store,
    });

    await expect(
      freshnessAuthority.assertCurrent({
        job: {
          artifactId: variantDraft.draftId,
          renderProfile: "editorial_v1",
        } as VoxyLocalCompositionJob,
        request: {
          artifactId: variantDraft.draftId,
          renderProfile: "editorial_v1",
        } as VoxyLocalCompositionRequest,
      }),
    ).rejects.toThrow("language_variant_master_evidence_stale");
  });

  it("blocks the real worker path before any executor call after master-only drift", async () => {
    const source = sourceDraft();
    const variantDraft = variantDraftFrom(source);
    const driftedSource = {
      ...source,
      revision: source.revision + 1,
      storyPlan: {
        ...source.storyPlan,
        revision: source.storyPlan.revision + 1,
      },
      updatedAt: "2026-09-26T05:20:00.000Z",
    };
    const store = createInMemoryVoxyStudioDraftStore({
      drafts: [driftedSource, variantDraft],
    });
    const freshnessAuthority = createVoxyStudioLocalCompositionFreshnessAuthority({
      draftStore: store,
    });
    const request = {
      requestedByUserId: "user-1",
      artifactId: variantDraft.draftId,
      briefingId: "brief-1",
      scriptVersion: "script-v1",
      locale: "fr",
      format: "16:9",
      renderProfile: "editorial_v1",
      timelineVersion: "timeline-v1",
      audioAssetId: "audio-1",
      sceneContent: [],
      captionCues: [],
      editorialTimeline: { durationMs: 1_000 },
    } as unknown as VoxyLocalCompositionRequest;
    const inputFingerprint = buildVoxyLocalCompositionInputFingerprint(request);
    const queued = {
      jobId: "job-master-drift",
      outputId: "output-master-drift",
      identityKey: "identity-master-drift",
      inputFingerprint,
      reviewBindingHash: "review-binding-master-drift",
      requestedByUserId: "user-1",
      artifactId: variantDraft.draftId,
      briefingId: "brief-1",
      scriptVersion: "script-v1",
      locale: "fr",
      format: "16:9",
      renderProfile: "editorial_v1",
      timelineVersion: "timeline-v1",
      timelineHash: "timeline-hash",
      durationMs: 1_000,
      audioAssetId: "audio-1",
      previewReviewFlowId: "preview-review-flow",
      decisionGateId: "decision-gate",
      dossierRefId: "dossier-1",
      status: "queued",
      attempt: 1,
      approvalRef: "approval-ref",
      createdAt: "2026-09-26T06:00:00.000Z",
      updatedAt: "2026-09-26T06:00:00.000Z",
      startedAt: null,
      completedAt: null,
      safeErrorCode: null,
      safeErrorMessage: null,
      reviewRequired: true,
      autoPublish: false,
      uploadTriggered: false,
      publishTriggered: false,
      socialPostTriggered: false,
    } as VoxyLocalCompositionJob;
    const runtimeRepository = createInMemoryVoxyLocalCompositionRepository({ jobs: [queued] });
    let executorCalls = 0;

    const result = await executeVoxyLocalComposition({
      jobId: queued.jobId,
      request,
      deps: {
        repository: runtimeRepository,
        approvalAuthority: {
          async resolveApproval() {
            throw new Error("approval_resolution_not_expected_during_execution");
          },
        },
        freshnessAuthority,
        audioResolver: {
          async resolveAudioAsset() {
            throw new Error("audio_resolution_must_not_be_reached_after_master_drift");
          },
        },
        executor: {
          async execute() {
            executorCalls += 1;
            throw new Error("executor_must_not_run_after_master_drift");
          },
        },
        now: () => "2026-09-26T06:01:00.000Z",
      },
    });

    expect(result.status).toBe("failed");
    expect(result.safeErrorCode).toBe("voxy_local_composition_freshness_stale");
    expect(executorCalls).toBe(0);
  });
});
