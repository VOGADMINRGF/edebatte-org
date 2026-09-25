import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  homepageFilmRectInsideSafeArea,
  type HomepageFilmLayoutProfile,
} from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "a".repeat(40);
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  studioLockupDataUrl: "data:image/svg+xml;base64,AA==",
  lapelPinDataUrl: "data:image/svg+xml;base64,AA==",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,AA==",
};

function plan(filmId: VoxyHomepageFilmId, layoutProfile: HomepageFilmLayoutProfile) {
  const contextMode = filmId === "voiceopengov" ? "evergreen" : "election_window";
  return contextualizeVoxyHomepageReferenceFilmPlan(
    buildVoxyHomepageReferenceFilmPlan({
      filmId,
      contextMode,
      layoutProfile,
      exactHeadSha: exactHead,
      speechDurationsMs: Array.from(
        { length: filmSegments(filmId, contextMode).length },
        () => filmId === "voiceopengov" ? 7_500 : 6_600,
      ),
    }),
  );
}

function htmlAtSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress = 0.5,
): string {
  const segment = current.speakerTimeline.find((entry) => entry.id === segmentId);
  if (!segment) throw new Error(`missing_segment:${segmentId}`);
  const at = segment.start + (segment.end - segment.start) * progress;
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex: Math.floor(at * current.output.fps),
    amplitude: 0.35,
  });
}

describe("VOXY homepage V3.10.2 — social chrome cleanup", () => {
  it.each([
    ["voiceopengov", "vog-greeting"],
    ["edebatte", "edebatte-greeting"],
  ] as const)("01 hides the empty inherited portrait title in 4:5 and 9:16 for %s", (filmId, segmentId) => {
    for (const layoutProfile of ["feed_4_5", "vertical_9_16"] as const) {
      const html = htmlAtSegment(plan(filmId, layoutProfile), segmentId);
      expect(html).toContain('<div class="portrait-title"><strong></strong><small></small></div>');
      expect(html).toContain(
        `[data-layout-profile="${layoutProfile}"]>.portrait-title{display:none!important}`,
      );
      expect(html).toContain('data-social-chrome-cleanup="v3-10-2"');
    }
  });

  it("02 keeps brand and caption geometry inside both portrait safe areas", () => {
    for (const layoutProfile of ["feed_4_5", "vertical_9_16"] as const) {
      const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[layoutProfile];
      expect(homepageFilmRectInsideSafeArea(layout.regions.brand, layout)).toBe(true);
      expect(homepageFilmRectInsideSafeArea(layout.regions.caption, layout)).toBe(true);
      expect(layout.regions.brand.y).toBe(layout.safeArea.top);
      const html = htmlAtSegment(plan("voiceopengov", layoutProfile), "vog-greeting");
      expect(html).toContain(
        `data-platform-safe-zone="top:${layout.safeArea.top};right:${layout.safeArea.right};bottom:${layout.safeArea.bottom};left:${layout.safeArea.left}"`,
      );
      expect(html).toContain('data-caption-maximum-lines="2"');
    }
  });

  it("03 preserves the V3.10.1 semantic process sync", () => {
    const html = htmlAtSegment(plan("voiceopengov", "vertical_9_16"), "vog-after-election", 0.55);
    expect(html).toContain('data-journey-semantic-sync="v3-10-1"');
    const active = html.match(/data-active-stage-label="([^"]+)"/)?.[1];
    const current = html.match(
      /data-process-stage-state="current"[^>]*><i><\/i><b>([^<]+)<\/b>/,
    )?.[1];
    expect(active).toBe("BESCHLUSS");
    expect(current).toBe(active);
  });

  it.each(["square_1_1", "landscape_16_9"] as const)(
    "04 leaves %s outside the targeted chrome cleanup",
    (layoutProfile) => {
      const html = htmlAtSegment(plan("voiceopengov", layoutProfile), "vog-after-election", 0.55);
      expect(html).not.toContain(
        `[data-layout-profile="${layoutProfile}"]>.portrait-title{display:none!important}`,
      );
      expect(html).toContain('data-social-chrome-cleanup="v3-10-2"');
    },
  );

  it("05 keeps all release gates closed", () => {
    for (const filmId of ["voiceopengov", "edebatte"] as const) {
      for (const layoutProfile of ["landscape_16_9", "square_1_1", "feed_4_5", "vertical_9_16"] as const) {
        expect(plan(filmId, layoutProfile)).toMatchObject({
          humanHomepageFilmAcceptance: "pending",
          humanNews5VisualAcceptance: "pending",
          productionEligible: false,
          autoPublish: false,
          homepageIntegrationIncluded: false,
        });
      }
    }
  });
});
