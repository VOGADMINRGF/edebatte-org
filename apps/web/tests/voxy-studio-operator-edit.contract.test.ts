import { describe, expect, it } from "vitest";

import { VOXY_EDITORIAL_STORY_PLAN_VERSION } from "@/features/voxyVideo/editorialStoryPlan";
import {
  VOXY_STUDIO_DRAFT_GUARDRAILS,
  VOXY_STUDIO_DRAFT_VERSION,
  type VoxyStudioDraft,
} from "@/features/voxyVideo/studioDraft";
import { buildVoxyStudioOperatorEditablePatch } from "@/features/voxyVideo/studioOperatorEdit";

function draft(): VoxyStudioDraft {
  return {
    version: VOXY_STUDIO_DRAFT_VERSION,
    draftId: "studio-draft-1",
    revision: 3,
    sourceKind: "dossier",
    dossierId: "dossier-1",
    briefingId: "briefing-1",
    title: "Alter Titel",
    selectedFormat: "16:9",
    safeZoneProfile: "video",
    captionAdjustments: [],
    status: "approved_for_render",
    renderApproval: {
      reviewDecisionRecordId: "review-1",
      decisionGateId: "gate-1",
      approvedByUserId: "admin-1",
      approvedAt: "2026-09-22T03:00:00.000Z",
      studioDraftRevision: 3,
      storyPlanRevision: 7,
    },
    renderBinding: null,
    publishApproval: null,
    createdByUserId: "admin-1",
    updatedByUserId: "admin-1",
    createdAt: "2026-09-22T02:00:00.000Z",
    updatedAt: "2026-09-22T03:00:00.000Z",
    guardrails: VOXY_STUDIO_DRAFT_GUARDRAILS,
    storyPlan: {
      version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
      storyPlanId: "story-1",
      revision: 7,
      briefingId: "briefing-1",
      dossierId: "dossier-1",
      title: "Alter Titel",
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
          chapterId: "chapter-a",
          role: "what_happened",
          headline: "A alt",
          narration: "A alt Narration",
          claimBindings: [],
          sourceIds: [],
          findingIds: [],
          openQuestionIds: [],
          evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
          consequences: [],
          motion: "explaining",
        },
        {
          chapterId: "chapter-b",
          role: "source_evidence",
          headline: "B alt",
          narration: "B alt Narration",
          claimBindings: [],
          sourceIds: [],
          findingIds: [],
          openQuestionIds: [],
          evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
          consequences: [],
          motion: "highlighting_source",
        },
      ],
    },
  };
}

describe("Voxy Studio bounded operator edit adapter", () => {
  it("increments story revision exactly once for copy and ordering edits", () => {
    const patch = buildVoxyStudioOperatorEditablePatch({
      draft: draft(),
      command: {
        title: "Neuer Titel",
        chapterUpdates: [
          {
            chapterId: "chapter-b",
            headline: "B neu",
            narration: "B neue Narration",
          },
        ],
        chapterOrder: ["chapter-b", "chapter-a"],
      },
    });

    expect(patch.title).toBe("Neuer Titel");
    expect(patch.storyPlan?.revision).toBe(8);
    expect(patch.storyPlan?.title).toBe("Neuer Titel");
    expect(patch.storyPlan?.chapters.map((chapter) => chapter.chapterId)).toEqual([
      "chapter-b",
      "chapter-a",
    ]);
    expect(patch.storyPlan?.chapters[0]?.headline).toBe("B neu");
    expect(patch.storyPlan?.chapters[0]?.narration).toBe("B neue Narration");
  });

  it("allows only canonical bounded motion changes and advances story revision once", () => {
    const patch = buildVoxyStudioOperatorEditablePatch({
      draft: draft(),
      command: {
        chapterUpdates: [
          { chapterId: "chapter-a", motion: "listening" },
          { chapterId: "chapter-b", motion: "showing_contrast" },
        ],
      },
    });

    expect(patch.storyPlan?.revision).toBe(8);
    expect(patch.storyPlan?.chapters[0]?.motion).toBe("listening");
    expect(patch.storyPlan?.chapters[1]?.motion).toBe("showing_contrast");
  });

  it("keeps story revision untouched for format, safe-zone and bounded caption edits", () => {
    const patch = buildVoxyStudioOperatorEditablePatch({
      draft: draft(),
      command: {
        selectedFormat: "9:16",
        safeZoneProfile: "marketing",
        captionAdjustments: [
          {
            cueId: "cue-1",
            startDeltaMs: 250,
            endDeltaMs: -120,
            textOverride: "Korrigierter Untertitel",
          },
        ],
      },
    });

    expect(patch.storyPlan).toBeUndefined();
    expect(patch.selectedFormat).toBe("9:16");
    expect(patch.safeZoneProfile).toBe("marketing");
    expect(patch.captionAdjustments).toEqual([
      {
        cueId: "cue-1",
        startDeltaMs: 250,
        endDeltaMs: -120,
        textOverride: "Korrigierter Untertitel",
      },
    ]);
  });

  it("fails closed for unknown, duplicate or incomplete chapter ordering", () => {
    expect(() =>
      buildVoxyStudioOperatorEditablePatch({
        draft: draft(),
        command: { chapterUpdates: [{ chapterId: "missing", headline: "X" }] },
      }),
    ).toThrow("voxy_studio_operator_chapter_missing:missing");

    expect(() =>
      buildVoxyStudioOperatorEditablePatch({
        draft: draft(),
        command: { chapterOrder: ["chapter-a", "chapter-a"] },
      }),
    ).toThrow("voxy_studio_operator_chapter_order_invalid");

    expect(() =>
      buildVoxyStudioOperatorEditablePatch({
        draft: draft(),
        command: { chapterOrder: ["chapter-a"] },
      }),
    ).toThrow("voxy_studio_operator_chapter_order_invalid");
  });

  it("rejects empty edits instead of manufacturing a revision", () => {
    expect(() =>
      buildVoxyStudioOperatorEditablePatch({ draft: draft(), command: {} }),
    ).toThrow("voxy_studio_operator_patch_empty");
  });
});
