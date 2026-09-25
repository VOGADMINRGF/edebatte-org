import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import type { HomepageFilmLayoutProfile } from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";
import {
  VOXY_CANONICAL_HEAD_ALPHA,
  validateVoxyCanonicalHeadAlpha,
} from "../src/features/voxyVideo/headAlphaSilhouette";

const exactHead = "4".repeat(40);
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  canonicalCleanStudioBackgroundDataUrl: "data:image/svg+xml;base64,AA==",
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
  filmId: VoxyHomepageFilmId,
  layoutProfile: HomepageFilmLayoutProfile,
  segmentId: string,
): string {
  const current = plan(filmId, layoutProfile);
  const segment = current.speakerTimeline.find((entry) => entry.id === segmentId);
  if (!segment) throw new Error(`missing_segment:${segmentId}`);
  const at = segment.start + (segment.end - segment.start) * 0.55;
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex: Math.floor(at * current.output.fps),
    amplitude: 0.35,
  });
}

describe("VOXY homepage V3.10.5 — root-cause compositing correction", () => {
  it("01 gives both films and every format the same true-alpha canonical head layer", () => {
    expect(validateVoxyCanonicalHeadAlpha()).toEqual([]);
    expect(VOXY_CANONICAL_HEAD_ALPHA.source).toMatchObject({
      nativeWidth: 1672,
      nativeHeight: 941,
      alphaMinimum: 255,
      alphaMaximum: 255,
      containsTransparency: false,
    });
    expect(VOXY_CANONICAL_HEAD_ALPHA.outsideSilhouetteContribution).toBe(0);
    expect(VOXY_CANONICAL_HEAD_ALPHA.acceptedMotionSourceInRig).toEqual({
      x: -547.875,
      y: -84.515,
      width: 2064,
      height: 1161,
    });
    expect(VOXY_CANONICAL_HEAD_ALPHA.faceRigOffset).toEqual({ x: 0, y: 0 });

    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      for (const layoutProfile of [
        "vertical_9_16",
        "landscape_16_9",
        "square_1_1",
        "feed_4_5",
      ] as const) {
        const segmentId = filmId === "edebatte" ? "edebatte-greeting" : "vog-greeting";
        const html = htmlAtSegment(filmId, layoutProfile, segmentId);
        expect(html).toContain('data-root-cause-compositing-fix="v3-10-5"');
        expect(html).toContain(
          'data-head-body-separation="canonical-alpha-head-over-canonical-body"',
        );
        expect(html).toContain('data-head-alpha-schema="voxy-canonical-head-alpha-v1"');
        expect(html).toContain('data-head-alpha-outside-contribution="0"');
        expect(html).toContain('data-head-source-native-bounds="1672x941"');
        expect(html).toContain('data-head-source-has-alpha="false"');
        expect(html).toContain(
          'data-head-source-bounds-in-rig="x-547.875:y-84.515:w2064:h1161"',
        );
        expect(html).toContain(
          'data-head-source-registration-policy="accepted-motion-v4"',
        );
        expect(html).toContain('data-head-face-rig-offset="x0:y0"');
        expect(html).toContain('maskUnits="userSpaceOnUse"');
        expect(html).toContain('mask-type="alpha"');
        expect(html).toContain('class="head-alpha-canon-source"');
        expect(html).toContain(
          'data-body-layer="canonical-master-with-static-head-removed"',
        );
        expect(html).toContain('data-body-head-pixel-contribution="0"');
        expect(html).toContain(
          'data-body-under-head="canonical-turtleneck-continuation"',
        );
        expect(html).toContain(
          'data-character-lock="accepted_static_master_structurally_separated_head_body"',
        );
        expect(html).not.toContain('<div class="motion-plate neck-plate">');
        expect(html).not.toContain("head-source-clip");
        expect(html).not.toContain("homepage-canonical-body-gap");
        expect(html).not.toContain("homepage-shoulder-repair");
        expect(html).not.toContain("canonical-left-upper-arm-layer");
      }
    }
  });

  it("02 gives the vertical VOG process groups more air without changing copy", () => {
    const html = htmlAtSegment(
      "voiceopengov",
      "vertical_9_16",
      "vog-after-election",
    );

    expect(html).toContain(
      '[data-segment-id="vog-after-election"] .living-mandate-path{height:208px!important;gap:16px!important}',
    );
    expect(html).toContain(
      '[data-segment-id="vog-after-election"] .mandate-step{height:208px!important;padding:16px!important;row-gap:10px!important}',
    );
    expect(html).toContain("font-size:34px!important;line-height:1.08!important");
    expect(html).toContain("font-size:20px!important;line-height:1.1!important");
    expect(html).toContain("VERHANDLUNG");
    expect(html).toContain("BESCHLUSS");
    expect(html).toContain("UMSETZUNG");
    expect(html).toContain("DER WEG GEHT WEITER");
  });

  it("03 keeps WIRKSAME MITBESTIMMUNG quiet inside the accepted 220 × 168 core", () => {
    const html = htmlAtSegment(
      "voiceopengov",
      "vertical_9_16",
      "vog-participation-balance",
    );

    expect(html).toContain("width:220px!important;height:168px!important");
    expect(html).toContain(
      ".participation-balance-scene .balance-core strong{font-size:22px!important;line-height:1.08!important;padding:0 18px!important}",
    );
    expect(html).toContain(
      ".participation-balance-scene .balance-core span{max-width:174px!important;margin-top:9px!important;font-size:13px!important;line-height:1.3!important}",
    );
    expect(html).toContain("WIRKSAME MITBESTIMMUNG");
    expect(html).toContain("opacity:.28!important");
    expect(html).toContain('data-min-readable-state-seconds="2"');
    expect(html).toContain('data-state-settle-seconds="0.25"');
  });

  it("04 leaves the accepted Weg spoken alias and all release gates unchanged", () => {
    const segment = filmSegments("edebatte", "evergreen").find(
      (entry) => entry.id === "edebatte-product-model",
    );
    expect(segment?.text).toContain("den Weg zurück zum Beleg");
    expect(segment?.spokenText).toContain("den Weeg zurück zum Beleg");

    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(plan(filmId, "vertical_9_16")).toMatchObject({
        humanHomepageFilmAcceptance: "pending",
        humanNews5VisualAcceptance: "pending",
        productionEligible: false,
        autoPublish: false,
        homepageIntegrationIncluded: false,
      });
    }
  });

  it("05 exposes a fail-closed byte-identical audio reuse path for the visual-only render", () => {
    const renderer = readFileSync(
      path.resolve(import.meta.dirname, "../scripts/render-voxy-homepage-reference-films.ts"),
      "utf8",
    );

    expect(renderer).toContain('mode: "byte_identical_accepted_master"');
    expect(renderer).toContain("synthesisInvoked: false");
    expect(renderer).toContain("processingInvoked: false");
    expect(renderer).toContain("accepted_master_audio_copy_not_byte_identical");
    expect(renderer).toContain("accepted_audio_reuse_output_must_not_overlap_source");
    expect(renderer).toContain("validateVoxyCanonicalHeadAlpha");
    expect(renderer).toContain("head_alpha_compositing_gate_failed");
    expect(renderer).not.toContain(
      '"apps/web/src/features/voxyVideo/headRelativeFaceRigHtml.ts",',
    );
    expect(renderer).toContain('const requestedFilmId = argument("film")');
    expect(renderer).toContain("unsupported_homepage_film");
    expect(renderer).toContain("for (const filmId of filmIds)");
  });
});
