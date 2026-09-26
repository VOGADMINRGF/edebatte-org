import { describe, expect, it } from "vitest";

import {
  bindVoxyEditorialLanguageVariant,
  type VoxyEditorialLanguageVariantPlan,
} from "@/features/voxyVideo/editorialLanguageVariant";
import type { VoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
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
    const authority = createVoxyStudioLocalCompositionFreshnessAuthority({
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
});
