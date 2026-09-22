import { describe, expect, it } from "vitest";

import { renderVoxyEditorialCompositionFrameHtml } from "@/features/voxyVideo/editorialCompositionHtml";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
  type VoxyEditorialTimeline,
} from "@/features/voxyVideo/editorialStoryPlan";
import { VOXY_FINAL_CANON } from "@/features/voxyVideo/finalCanon";

function plan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story-1",
    revision: 4,
    briefingId: "briefing-1",
    dossierId: "dossier-1",
    title: "Nachvollziehbarer Erklärfilm",
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
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "Was ist passiert?",
        narration: "Der Ausgangspunkt bleibt nachvollziehbar.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: ["finding-1"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-1"],
          findingIds: ["finding-1"],
        },
        consequences: [],
        motion: "highlighting_source",
      },
    ],
  };
}

function timeline(): VoxyEditorialTimeline {
  return {
    storyPlanId: "story-1",
    storyPlanRevision: 4,
    durationClass: "explainer",
    durationMs: 120_000,
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        startMs: 0,
        endMs: 120_000,
        motion: "highlighting_source",
      },
    ],
  };
}

const assets = {
  canonStageDataUrl: "data:image/png;base64,Y2Fub24=",
  canonicalCleanStudioBackgroundDataUrl: "data:image/svg+xml;base64,c3R1ZGlv",
  studioLockupDataUrl: "data:image/svg+xml;base64,bG9ja3Vw",
  lapelPinDataUrl: "data:image/svg+xml;base64,cGlu",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,bWFyaw==",
} as const;

describe("Voxy editorial final-canon composition adapter", () => {
  it.each([
    ["16:9", 1920, 1080],
    ["9:16", 1080, 1920],
    ["1:1", 1080, 1080],
  ] as const)("uses canonical alpha compositing for %s", (format, width, height) => {
    const html = renderVoxyEditorialCompositionFrameHtml({
      plan: plan(),
      timeline: timeline(),
      captions: [
        {
          id: "caption-1",
          startMs: 0,
          endMs: 120_000,
          text: "Der Ausgangspunkt bleibt nachvollziehbar.",
        },
      ],
      assets,
      format,
      frameIndex: 24,
      amplitude: 0.4,
    });

    expect(html).toContain(`width:${width}px;height:${height}px`);
    expect(html).toContain('data-editorial-runtime="editorial_v1"');
    expect(html).toContain(`data-final-canon-id="${VOXY_FINAL_CANON.canonId}"`);
    expect(html).toContain(`data-final-canon-reference-head="${VOXY_FINAL_CANON.referenceRenderHeadSha}"`);
    expect(html).toContain('data-head-layer="canonical-alpha-head"');
    expect(html).toContain('data-head-alpha-outside-contribution="0"');
    expect(html).toContain('data-body-layer="canonical-master-with-static-head-removed"');
    expect(html).not.toContain('class="motion-plate neck-plate"');
    expect(html).not.toContain("voxy-standing-master.svg");
    expect(html).toContain("source-1");
    expect(html).toContain('data-evidence-window-kind="source"');
  });
});
