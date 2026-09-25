import { describe, expect, it } from "vitest";

import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import {
  approveVoxyStudioDraftForRender,
  createVoxyStudioDraft,
  submitVoxyStudioDraftForReview,
  type VoxyStudioDraftServiceDependencies,
} from "@/features/voxyVideo/studioDraftService";
import { createInMemoryVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";

function evidence(): VoxyEditorialEvidenceContext {
  return {
    sourcePack: buildCanonicalSourcePack({
      sourcePackId: "layout-approval-pack",
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
    claims: [],
    findings: [],
    openQuestions: [],
  };
}

function storyPlan(headline: string): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "layout-approval-story",
    revision: 1,
    briefingId: "layout-approval-briefing",
    dossierId: "layout-approval-dossier",
    title: "Layout approval contract",
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
        headline,
        narration: "Der belegte Ausgangspunkt bleibt erhalten.",
        claimBindings: [],
        sourceIds: ["source-primary"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: [],
        },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "source-evidence",
        role: "source_evidence",
        headline: "Worauf stützt sich das?",
        narration: "Die freigegebene Quelle bleibt sichtbar.",
        claimBindings: [],
        sourceIds: ["source-primary"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: [],
        },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

function dependencies(): VoxyStudioDraftServiceDependencies {
  const context = evidence();
  return {
    repository: createInMemoryVoxyStudioDraftRepository(),
    evidenceAuthority: {
      async resolveEvidenceContext() {
        return context;
      },
    },
    editorialReviewAuthority: {
      async resolveEditorialReview() {
        return {
          persistenceMode: "persistent_primary",
          record: null,
          auditEvents: [],
        };
      },
    },
    compositionAuthority: {
      async resolveComposition() {
        return { job: null, output: null };
      },
    },
    now: () => "2026-09-22T19:30:00.000Z",
  };
}

describe("Voxy Studio all-format layout approval gate", () => {
  it("preserves oversized copy but blocks approved_for_render before review truth is consumed", async () => {
    const deps = dependencies();
    const headline = "Sehr lange Headline ".repeat(12).trim();
    const created = await createVoxyStudioDraft(
      {
        clientRequestId: "layout-approval-request",
        sourceKind: "dossier",
        dossierId: "layout-approval-dossier",
        briefingId: "layout-approval-briefing",
        title: "Layout approval contract",
        storyPlan: storyPlan(headline),
        selectedFormat: "16:9",
        safeZoneProfile: "video",
        createdByUserId: "admin-layout-author",
      },
      deps,
    );

    const submitted = await submitVoxyStudioDraftForReview(
      {
        draftId: created.draftId,
        expectedRevision: created.revision,
        submittedByUserId: "admin-layout-author",
      },
      deps,
    );

    expect(submitted.draft.storyPlan.chapters[0]?.headline).toBe(headline);
    expect(submitted.validation.renderEligible).toBe(false);
    expect(submitted.validation.approvalBlockers).toEqual(
      expect.arrayContaining([
        "layout:16:9:chapter_headline_overflow_risk",
        "layout:9:16:chapter_headline_overflow_risk",
        "layout:1:1:chapter_headline_overflow_risk",
      ]),
    );

    await expect(
      approveVoxyStudioDraftForRender(
        {
          draftId: submitted.draft.draftId,
          expectedRevision: submitted.draft.revision,
          approvedByUserId: "admin-layout-reviewer",
        },
        deps,
      ),
    ).rejects.toThrow(/voxy_studio_editorial_approval_blocked:.*layout:/);

    const persisted = await deps.repository.getDraft(submitted.draft.draftId);
    expect(persisted?.status).toBe("needs_review");
    expect(persisted?.storyPlan.chapters[0]?.headline).toBe(headline);
    expect(persisted?.renderApproval).toBeNull();
  });
});
