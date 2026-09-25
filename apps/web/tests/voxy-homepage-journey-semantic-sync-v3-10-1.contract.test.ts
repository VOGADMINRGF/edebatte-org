import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import type { HomepageFilmLayoutProfile } from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import {
  renderVoxyHomepageReferenceFilmFrameHtml,
  resolveVogJourneyStage,
} from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "a".repeat(40);
const profiles = [
  "landscape_16_9",
  "square_1_1",
  "feed_4_5",
  "vertical_9_16",
] as const satisfies readonly HomepageFilmLayoutProfile[];
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  studioLockupDataUrl: "data:image/svg+xml;base64,AA==",
  lapelPinDataUrl: "data:image/svg+xml;base64,AA==",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,AA==",
};

function plan(layoutProfile: HomepageFilmLayoutProfile) {
  const segments = filmSegments("voiceopengov", "evergreen");
  return contextualizeVoxyHomepageReferenceFilmPlan(
    buildVoxyHomepageReferenceFilmPlan({
      filmId: "voiceopengov",
      contextMode: "evergreen",
      layoutProfile,
      exactHeadSha: exactHead,
      speechDurationsMs: Array.from({ length: segments.length }, () => 7_500),
    }),
  );
}

function timeAtSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress: number,
): number {
  const segment = current.speakerTimeline.find((entry) => entry.id === segmentId);
  if (!segment) throw new Error(`missing_segment:${segmentId}`);
  return segment.start + (segment.end - segment.start) * progress;
}

function htmlAtSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress: number,
): string {
  const at = timeAtSegment(current, segmentId, progress);
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex: Math.floor(at * current.output.fps),
    amplitude: 0.35,
  });
}

function currentProcessLabel(html: string): string {
  const match = html.match(/<div class="mandate-step[^"]*" data-process-stage-state="current"[^>]*><i><\/i><b>([^<]+)<\/b><\/div>/);
  if (!match?.[1]) throw new Error("current_process_label_missing");
  return match[1];
}

function activeJourneyLabel(html: string): string {
  const match = html.match(/data-active-stage-label="([^"]+)"/);
  if (!match?.[1]) throw new Error("active_journey_label_missing");
  return match[1];
}

describe("VOXY homepage V3.10.1 — semantic journey sync", () => {
  it("01 resolves deterministic semantic stages", () => {
    const current = plan("vertical_9_16");
    const at = timeAtSegment(current, "vog-after-election", 0.55);
    expect(resolveVogJourneyStage(current, at)).toBe("decision");
    expect(resolveVogJourneyStage(current, at)).toBe("decision");
  });

  it.each([0.1, 0.3, 0.55, 0.7, 0.9])(
    "02 keeps process AKTUELL and global active stage equal at %s",
    (progress) => {
      const html = htmlAtSegment(plan("vertical_9_16"), "vog-after-election", progress);
      expect(activeJourneyLabel(html)).toBe(currentProcessLabel(html));
    },
  );

  it("03 maps programme and transition phases to PROGRAMM", () => {
    const current = plan("feed_4_5");
    expect(resolveVogJourneyStage(current, timeAtSegment(current, "vog-program-not-contract", 0.1))).toBe("programme");
    expect(resolveVogJourneyStage(current, timeAtSegment(current, "vog-program-not-contract", 0.5))).toBe("programme");
  });

  it("04 maps the explicit decision phase to BESCHLUSS", () => {
    const current = plan("feed_4_5");
    const html = htmlAtSegment(current, "vog-program-not-contract", 0.86);
    expect(resolveVogJourneyStage(current, timeAtSegment(current, "vog-program-not-contract", 0.86))).toBe("decision");
    expect(activeJourneyLabel(html)).toBe("BESCHLUSS");
  });

  it("05 does not advance merely because time passes without a newly introduced stage", () => {
    const current = plan("square_1_1");
    for (const segmentId of ["vog-demophobie", "vog-participation-balance"] as const) {
      expect(resolveVogJourneyStage(current, timeAtSegment(current, segmentId, 0.05))).toBe("decision");
      expect(resolveVogJourneyStage(current, timeAtSegment(current, segmentId, 0.95))).toBe("decision");
    }
  });

  it("06 keeps current-offer future intent from becoming achieved WIRKUNG", () => {
    const current = plan("vertical_9_16");
    const html = htmlAtSegment(current, "vog-current-offer", 0.9);
    expect(html).toContain('data-product-status="future-intent-not-current-capability"');
    expect(resolveVogJourneyStage(current, timeAtSegment(current, "vog-current-offer", 0.9))).toBe("decision");
    expect(activeJourneyLabel(html)).toBe("BESCHLUSS");
  });

  it("07 gives the final CTA no competing active stage label", () => {
    const html = htmlAtSegment(plan("vertical_9_16"), "vog-cta", 0.65);
    expect(html).toContain('data-visible-stage-label-count="0"');
    expect(html).not.toContain("data-active-stage-label=");
    expect(html).toContain('[data-segment-id="vog-cta"] .democratic-loop{opacity:.12!important}');
  });

  it("08 resolves identical semantics in all four layout profiles", () => {
    const stages = profiles.map((profile) => {
      const current = plan(profile);
      return resolveVogJourneyStage(
        current,
        timeAtSegment(current, "vog-after-election", 0.55),
      );
    });
    expect(stages).toEqual(["decision", "decision", "decision", "decision"]);
  });

  it("09 preserves V3.10 mobile metadata and further quiets only the square process journey", () => {
    const square = htmlAtSegment(plan("square_1_1"), "vog-after-election", 0.55);
    expect(square).toContain('data-mobile-readability-lock="v3-10"');
    expect(square).toContain('data-journey-semantic-sync="v3-10-1"');
    expect(square).toContain('[data-segment-id="vog-after-election"] .democratic-loop{opacity:0.18!important}');
    expect(square).toContain('data-caption-maximum-lines="2"');
  });

  it("10 keeps all release gates closed", () => {
    for (const profile of profiles) {
      expect(plan(profile)).toMatchObject({
        humanHomepageFilmAcceptance: "pending",
        humanNews5VisualAcceptance: "pending",
        productionEligible: false,
        autoPublish: false,
        homepageIntegrationIncluded: false,
      });
    }
  });
});
