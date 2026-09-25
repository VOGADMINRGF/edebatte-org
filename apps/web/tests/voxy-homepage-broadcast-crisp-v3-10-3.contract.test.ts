import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  type HomepageFilmLayoutProfile,
} from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "b".repeat(40);
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
        () => filmId === "edebatte" ? 6_600 : 7_500,
      ),
    }),
  );
}

function htmlAtSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress = 0.55,
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

describe("VOXY homepage V3.10.3 — broadcast crisp polish", () => {
  it.each([
    ["feed_4_5", 784, 1000, 116, 16, 20, 16, 4],
    ["vertical_9_16", 740, 1360, 146, 19, 23, 19, 29],
  ] as const)(
    "01 enlarges and sharpens the %s semantic memory card without collisions",
    (layoutProfile, left, top, height, kickerPx, titlePx, metaPx, captionGap) => {
      const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[layoutProfile];
      const html = htmlAtSegment(plan("edebatte", layoutProfile), "edebatte-product-model");
      const cardRight = left + 200;
      const cardBottom = top + height;

      expect(200 / 180).toBeCloseTo(1.111, 3);
      expect(Number.isInteger(left)).toBe(true);
      expect(Number.isInteger(top)).toBe(true);
      expect(Number.isInteger(height)).toBe(true);
      expect(cardRight).toBe(layout.output.width - layout.safeArea.right);
      expect(layout.regions.caption.y - cardBottom).toBe(captionGap);
      expect(html).toContain('data-broadcast-crisp-polish="v3-10-3"');
      expect(html).toContain('data-mobile-card-rasterization="whole-pixel"');
      expect(html).toContain(
        `[data-layout-profile="${layoutProfile}"] .homepage-profile-memory{left:${left}px;top:${top}px;width:200px;height:${height}px;min-height:0;padding:${layoutProfile === "vertical_9_16" ? 16 : 12}px 18px;`,
      );
      expect(html).toContain("border-color:rgba(100,177,235,.64)");
      expect(html).toContain("background:linear-gradient(145deg,rgba(4,20,44,.985),rgba(3,15,34,.985))");
      expect(html).toContain("filter:none!important;backdrop-filter:none!important;text-shadow:none;transform:none!important");
      expect(html).toContain(
        `[data-layout-profile="${layoutProfile}"] .homepage-profile-memory small{color:#8cf4ed;font-size:${kickerPx}px;`,
      );
      expect(html).toContain(
        `[data-layout-profile="${layoutProfile}"] .homepage-profile-memory b{margin-top:${layoutProfile === "vertical_9_16" ? 9 : 6}px;color:#f4f9ff;font-size:${titlePx}px;`,
      );
      expect(html).toContain(
        `[data-layout-profile="${layoutProfile}"] .homepage-profile-memory span{margin-top:${layoutProfile === "vertical_9_16" ? 9 : 6}px;color:#c5d9e7;font-size:${metaPx}px;font-weight:750;`,
      );
    },
  );

  it("02 leaves the square card on its frozen V3.10.2 geometry and styling", () => {
    const html = htmlAtSegment(plan("edebatte", "square_1_1"), "edebatte-product-model");

    expect(html).toContain(
      ".homepage-profile-memory{position:absolute;z-index:9;left:890px;top:480px;width:118px;min-height:180px;display:flex;flex-direction:column;justify-content:center;padding:12px 14px;border:1px solid rgba(83,158,224,.38);border-radius:14px;background:rgba(4,19,42,.92)}",
    );
    expect(html).toContain(
      ".homepage-profile-memory small{color:#72ddd7;font-size:13px;font-weight:900;letter-spacing:.08em}.homepage-profile-memory b{margin-top:7px;font-size:17px;line-height:1.05}.homepage-profile-memory span{margin-top:7px;color:#91aabd;font-size:13px}",
    );
    expect(html).not.toContain(
      '[data-layout-profile="square_1_1"] .homepage-profile-memory{left:',
    );
  });

  it("03 replaces fractional source-card scaling with a taller 16:9 evidence document", () => {
    const html = htmlAtSegment(plan("edebatte", "landscape_16_9"), "edebatte-source-questions", 0.86);

    expect(html).toContain(
      '[data-layout-profile="landscape_16_9"] .case-source-object{width:360px;height:300px;padding:23px 24px;',
    );
    expect(html).toContain(
      '[data-layout-profile="landscape_16_9"] .source-pull-scene .case-source-object{right:-72px;top:55px;transform:none}',
    );
    expect(html).toContain(
      '[data-layout-profile="landscape_16_9"] .case-source-object header,[data-layout-profile="landscape_16_9"] .case-source-object footer{font-size:12px;font-weight:800;',
    );
    expect(html).toContain(
      '[data-layout-profile="landscape_16_9"] .source-passage span{font-size:12px;letter-spacing:.08em;color:#005f64}',
    );
  });

  it("04 uses a spoken-only long-vowel alias while preserving all visible Weg copy", () => {
    const segment = filmSegments("edebatte", "evergreen").find(
      (entry) => entry.id === "edebatte-product-model",
    );
    const edebatteHtml = htmlAtSegment(
      plan("edebatte", "landscape_16_9"),
      "edebatte-product-model",
    );
    const vogHtml = htmlAtSegment(
      plan("voiceopengov", "landscape_16_9"),
      "vog-after-election",
    );

    expect(segment?.text).toContain("den Weg zurück zum Beleg");
    expect(segment?.spokenText).toContain("den Weeg zurück zum Beleg");
    expect(edebatteHtml).toContain("den Weg zurück zum Beleg");
    expect(edebatteHtml).not.toContain("den Weeg zurück zum Beleg");
    expect(vogHtml).toContain("DER WEG GEHT WEITER");
    expect(vogHtml).not.toContain("DER WEEG GEHT WEITER");
  });

  it("05 keeps every release gate closed", () => {
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
