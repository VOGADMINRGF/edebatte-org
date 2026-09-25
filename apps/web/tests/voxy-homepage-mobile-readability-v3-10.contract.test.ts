import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  homepageFilmRectsOverlap,
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
  const segments = filmSegments(filmId, contextMode);
  return contextualizeVoxyHomepageReferenceFilmPlan(
    buildVoxyHomepageReferenceFilmPlan({
      filmId,
      contextMode,
      layoutProfile,
      exactHeadSha: exactHead,
      speechDurationsMs: Array.from(
        { length: segments.length },
        () => filmId === "edebatte" ? 6_600 : 7_500,
      ),
    }),
  );
}

function htmlAtSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress = 0.5,
) {
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

function activeStageLabel(html: string): string {
  const match = html.match(/data-active-stage-label="([^"]+)"/);
  if (!match?.[1]) throw new Error("active_stage_label_missing");
  return match[1];
}

function publicOverlayText(html: string): string {
  const overlay = html.match(/<div class="homepage-profile-overlay"[\s\S]*<\/main>/)?.[0] ?? html;
  return overlay
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("VOXY homepage V3.10 — mobile readability and information density lock", () => {
  it("01 freezes the V3.9 landscape layout and full broadcast journey", () => {
    expect(VOXY_HOMEPAGE_FILM_LAYOUTS.landscape_16_9).toEqual({
      id: "landscape_16_9",
      label: "Homepage / YouTube landscape",
      output: { width: 1920, height: 1080, aspectRatio: "16:9" },
      stageGeometry: { width: 1920, height: 1080, scale: 1, translateX: 0 },
      safeArea: { top: 48, right: 48, bottom: 54, left: 48 },
      regions: {
        presenter: { x: 540, y: 125, width: 490, height: 635 },
        microphone: { x: 900, y: 430, width: 160, height: 390 },
        brand: { x: 56, y: 118, width: 420, height: 180 },
        evidence: { x: 1060, y: 165, width: 320, height: 400 },
        navigation: { x: 1095, y: 600, width: 280, height: 175 },
        caption: { x: 360, y: 876, width: 1090, height: 108 },
      },
      typography: {
        brandPx: 40,
        descriptorPx: 19,
        statementPx: 25,
        captionPx: 21,
        navigationPx: 13,
      },
      maximumSimultaneousObjects: 4,
      evidenceMemory: "full_column",
      conservativePlatformPreset: "broadcast-title-safe",
    });
    const html = htmlAtSegment(plan("voiceopengov", "landscape_16_9"), "vog-after-election");
    expect(html).toContain('data-mobile-readability-lock="v3-10"');
    expect(html).toContain('data-mobile-navigation-mode="broadcast-full-journey"');
    expect(html).toContain('data-visible-stage-label-count="6"');
    expect(html).toContain('.democratic-loop{position:absolute;left:735px;top:468px;');
  });

  it.each(["feed_4_5", "vertical_9_16"] as const)(
    "02 reduces %s navigation to progress dots and one active label",
    (layoutProfile) => {
      const html = htmlAtSegment(plan("voiceopengov", layoutProfile), "vog-program-not-contract", 0.8);
      expect(html).toContain('data-mobile-navigation-mode="progress-dots-active-label"');
      expect(html).toContain('data-visible-stage-label-count="1"');
      expect(html).toContain('.loop-node span{display:none!important}');
      expect(html).toContain('.loop-active-label{display:block!important;position:absolute!important');
      expect(html.match(/data-stage-label="/g)).toHaveLength(6);
    },
  );

  it("03 keeps square social-native by limiting both process representations", () => {
    const html = htmlAtSegment(plan("voiceopengov", "square_1_1"), "vog-after-election", 0.55);
    expect(html).toContain('data-mobile-process-mode="previous-current-next"');
    expect(html).toContain('data-mobile-navigation-mode="progress-dots-active-label"');
    expect(html).toContain('data-visible-stage-label-count="1"');
    expect(html).toContain('.mandate-step{display:none!important;position:relative!important');
    expect(html).toContain('.mandate-step.previous,.mandate-step.current,.mandate-step.next{display:grid!important}');
    expect(html.match(/data-process-stage-state="/g)).toHaveLength(5);
  });

  it("04 keeps the active journey stage deterministic while retaining all six semantic stages", () => {
    const current = plan("voiceopengov", "vertical_9_16");
    const early = htmlAtSegment(current, "vog-greeting", 0.1);
    const earlyRepeat = htmlAtSegment(current, "vog-greeting", 0.1);
    const late = htmlAtSegment(current, "vog-current-offer", 0.8);
    expect(activeStageLabel(earlyRepeat)).toBe(activeStageLabel(early));
    expect(activeStageLabel(late)).not.toBe(activeStageLabel(early));
    expect(late.match(/data-stage-index="[1-6]"/g)).toHaveLength(6);
    for (const label of ["PROGRAMM", "VERHANDLUNG", "BESCHLUSS", "UMSETZUNG", "WIRKUNG", "RÜCKKOPPLUNG"]) {
      expect(late).toContain(`data-stage-label="${label}"`);
    }
  });

  it.each(["square_1_1", "feed_4_5", "vertical_9_16"] as const)(
    "05 gives %s eDebatte a two-by-three non-colliding trace",
    (layoutProfile) => {
      const html = htmlAtSegment(plan("edebatte", layoutProfile), "edebatte-product-model", 0.55);
      expect(html).toContain('data-mobile-trace-layout="two-by-three"');
      expect(html).toContain('grid-template-columns:repeat(2,minmax(0,1fr))!important');
      expect(html).toContain('grid-template-rows:repeat(3,minmax(0,1fr))!important');
      expect(html.match(/data-trace-index="[0-5]"/g)).toHaveLength(6);
    },
  );

  it("06 enforces production typography floors for every social profile", () => {
    expect(VOXY_HOMEPAGE_FILM_LAYOUTS.square_1_1.typography).toMatchObject({
      brandPx: 46,
      descriptorPx: 23,
      statementPx: 30,
      captionPx: 26,
      navigationPx: 18,
    });
    expect(VOXY_HOMEPAGE_FILM_LAYOUTS.feed_4_5.typography).toMatchObject({
      brandPx: 48,
      descriptorPx: 23,
      statementPx: 32,
      captionPx: 28,
      navigationPx: 20,
    });
    expect(VOXY_HOMEPAGE_FILM_LAYOUTS.vertical_9_16.typography).toMatchObject({
      brandPx: 56,
      descriptorPx: 28,
      statementPx: 38,
      captionPx: 31,
      navigationPx: 22,
    });
  });

  it("07 numerically protects portrait ordering, captions, presenter and microphone", () => {
    for (const layoutProfile of ["feed_4_5", "vertical_9_16"] as const) {
      const { regions } = VOXY_HOMEPAGE_FILM_LAYOUTS[layoutProfile];
      expect(regions.presenter.y + regions.presenter.height).toBeLessThanOrEqual(regions.evidence.y);
      expect(regions.evidence.y + regions.evidence.height).toBeLessThanOrEqual(regions.navigation.y);
      expect(regions.navigation.y + regions.navigation.height).toBeLessThanOrEqual(regions.caption.y);
      expect(homepageFilmRectsOverlap(regions.evidence, regions.presenter)).toBe(false);
      expect(homepageFilmRectsOverlap(regions.evidence, regions.microphone)).toBe(false);
      expect(homepageFilmRectsOverlap(regions.navigation, regions.presenter)).toBe(false);
      expect(homepageFilmRectsOverlap(regions.navigation, regions.microphone)).toBe(false);
      expect(homepageFilmRectsOverlap(regions.navigation, regions.caption)).toBe(false);
      expect(homepageFilmRectsOverlap(regions.evidence, regions.caption)).toBe(false);
    }
  });

  it("08 preserves two-line semantic captions in every social profile", () => {
    for (const layoutProfile of ["square_1_1", "feed_4_5", "vertical_9_16"] as const) {
      const current = plan("voiceopengov", layoutProfile);
      const html = htmlAtSegment(current, "vog-after-election", 0.55);
      expect(current.captions).toMatchObject({
        burnedIn: true,
        sidecarsOnly: false,
        cueMode: "semantic_sentence_chunks",
        maximumVisualLines: 2,
        stablePositionPerProfile: true,
      });
      expect(html).toContain('data-caption-maximum-lines="2"');
      expect(html).toContain('-webkit-line-clamp:2!important');
    }
  });

  it("09 makes the VOG final CTA dominant and suppresses a new mobile stage label", () => {
    const html = htmlAtSegment(plan("voiceopengov", "vertical_9_16"), "vog-cta", 0.65);
    const copy = publicOverlayText(html);
    expect(copy).toContain("DEINE STIMME IST MEHR ALS EIN KREUZ.");
    expect(copy).toContain("Mitmachen. Informiert bleiben.");
    expect(html).toContain('[data-segment-id="vog-cta"] .democratic-loop{opacity:.12!important}');
    expect(html).toContain('[data-segment-id="vog-cta"] .loop-active-label{display:none!important}');
    expect(html).toContain('[data-homepage-segment-id="vog-cta"] .homepage-profile-memory{opacity:.16!important}');
  });

  it("10 preserves public-language and release-gate locks", () => {
    const guardrails = htmlAtSegment(plan("voiceopengov", "vertical_9_16"), "vog-demophobie", 0.86);
    const copy = publicOverlayText(guardrails);
    expect(copy).toContain("ÜBERPRÜFUNG");
    expect(copy).not.toMatch(/CURRENT CAPABILITY|ZIELBILD|NICHT ALS PRODUKTFUNKTION|Gertrude|Lübbe-Wolff|Demophobie/i);
    for (const filmId of ["voiceopengov", "edebatte"] as const) {
      expect(plan(filmId, "vertical_9_16")).toMatchObject({
        humanHomepageFilmAcceptance: "pending",
        humanNews5VisualAcceptance: "pending",
        productionEligible: false,
        autoPublish: false,
        homepageIntegrationIncluded: false,
      });
    }
  });
});
