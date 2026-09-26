import { describe, expect, it } from "vitest";

import {
  bindVoxyEditorialLanguageVariant,
  type VoxyEditorialLanguageVariantPlan,
} from "@/features/voxyVideo/editorialLanguageVariant";
import type { VoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import {
  buildVoxyLocalCompositionInputFingerprint,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import { executeVoxyLocalComposition } from "@/features/voxyVideo/localCompositionRuntimeService";
import { createInMemoryVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import type { VoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import {
  createVoxyStudioLocalCompositionFreshnessAuthority,
  resolveVoxyStudioLanguageVariantFreshness,
} from "@/features/voxyVideo/studioLocalCompositionFreshness";

const FINGERPRINT = "a".repeat(64);
const SOURCE_PACK_ID = `voxy-studio-dossier:dossier-1:${FINGERPRINT.slice(0, 40)}`;

function plan(overrides: Partial<VoxyEditorialStoryPlan> = {}): VoxyEditorialStoryPlan {
  return {
    version: "voxy-editorial-story-plan-v1",
    storyPlanId: "story-master-1",
    revision: 4,
    briefingId: "brief-1",
    dossierId: "dossier-1",
    title: "Belegter Master",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "preview",
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "Ausgangslage",
        narration: "Die belegte Ausgangslage.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: [] },
        consequences: [],
        motion: "explaining",
      },
    ],
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    ...overrides,
  };
}

function frenchVariant(master: VoxyEditorialStoryPlan): VoxyEditorialLanguageVariantPlan {
  const translated = plan({
    storyPlanId: "story-fr-1",
    revision: 1,
    title: "Master vérifié",
    locale: "fr",
    originalLanguage: "de",
    outputLanguage: "fr",
    derivedFromStoryPlanId: master.storyPlanId,
    derivedFromRevision: master.revision,
    chapters: master.chapters.map((chapter) => ({
      ...chapter,
      headline: "Situation initiale",
      narration: "La situation vérifiée.",
    })),
  });
  return bindVoxyEditorialLanguageVariant({
    masterPlan: master,
    translatedPlan: translated,
    evidenceSourcePackId: SOURCE_PACK_ID,
    translationRevision: 1,
    translationStatus: "approved",
  });
}

function draft(draftId: string, storyPlan: VoxyEditorialStoryPlan): VoxyStudioDraft {
  return {
    draftId,
    revision: 1,
    dossierId: "dossier-1",
    briefingId: "brief-1",
    selectedFormat: "16:9",
    status: "approved_for_render",
    storyPlan,
  } as VoxyStudioDraft;
}

function repository(drafts: VoxyStudioDraft[]): VoxyStudioDraftRepository {
  return {
    async createOrGetDraft({ draft: value }) {
      return value;
    },
    async getDraft(draftId) {
      return drafts.find((item) => item.draftId === draftId) ?? null;
    },
    async listDrafts(params) {
      return drafts.filter(
        (item) =>
          (!params?.briefingId || item.briefingId === params.briefingId) &&
          (!params?.dossierId || item.dossierId === params.dossierId) &&
          (!params?.status || item.status === params.status),
      );
    },
    async replaceDraftIfRevision() {
      return false;
    },
    async appendAuditEvent() {},
    async listAuditEvents() {
      return [];
    },
    getPersistenceState() {
      return {
        mode: "persistent_primary",
        productionTruth: true,
        restartReconstructable: true,
        deploymentReconstructable: true,
      };
    },
  };
}

function masterDriftAuthority(variantDraft: VoxyStudioDraft, advancedMaster: VoxyStudioDraft) {
  return createVoxyStudioLocalCompositionFreshnessAuthority({
    draftRepository: repository([advancedMaster, variantDraft]),
    evidenceAuthority: {
      async resolveEvidenceContext() {
        return {
          sourcePack: {
            sourcePackId: SOURCE_PACK_ID,
            reviewState: "approved",
            sources: [],
            openGaps: [],
            reviewRequired: false,
            autoPublish: false,
          },
          claims: [],
          findings: [],
          openQuestions: [],
        } as any;
      },
    },
    editorialReviewAuthority: {
      async resolveEditorialReview() {
        throw new Error("review_resolution_must_not_be_reached_after_master_drift");
      },
    },
    loadEvidenceReviewState: async () =>
      ({
        snapshot: { fingerprint: FINGERPRINT },
        approved: true,
        reviewRecord: null,
        persistence: { mode: "persistent_primary" },
      }) as any,
  });
}

describe("Voxy language-variant master freshness at render/worker boundary", () => {
  it("keeps an approved variant current while its exact master revision is unchanged", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const result = await resolveVoxyStudioLanguageVariantFreshness({
      draft: variantDraft,
      draftRepository: repository([draft("draft-master", master), variantDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(result).toEqual({ current: true, blockers: [] });
  });

  it("fails closed when the current master revision advances after variant approval", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const advancedMaster = draft("draft-master", plan({ revision: 5 }));
    const result = await resolveVoxyStudioLanguageVariantFreshness({
      draft: variantDraft,
      draftRepository: repository([advancedMaster, variantDraft]),
      evidenceSourcePackId: SOURCE_PACK_ID,
    });
    expect(result.current).toBe(false);
    expect(result.blockers).toContain("language_variant_master_revision_changed");
  });

  it("makes the production worker freshness authority reject master-only drift", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const advancedMaster = draft("draft-master", plan({ revision: 5 }));
    const authority = masterDriftAuthority(variantDraft, advancedMaster);

    await expect(
      authority.assertCurrent({
        job: {} as VoxyLocalCompositionJob,
        request: {
          renderProfile: "editorial_v1",
          artifactId: variantDraft.draftId,
        } as VoxyLocalCompositionRequest,
      }),
    ).rejects.toThrow("language_variant_master_revision_changed");
  });

  it("blocks the real worker path before any executor call after master-only drift", async () => {
    const master = plan();
    const variantDraft = draft("draft-fr", frenchVariant(master));
    const advancedMaster = draft("draft-master", plan({ revision: 5 }));
    const freshnessAuthority = masterDriftAuthority(variantDraft, advancedMaster);
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
      attempt: 0,
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
    expect(executorCalls).toBe(0);
    expect(result.safeErrorMessage).toContain("language_variant_master_revision_changed");
  });
});
