import { describe, expect, it } from "vitest";

import {
  VOXY_HOMEPAGE_REFERENCE_FILMS,
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import {
  VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS,
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  homepageFilmRectInsideSafeArea,
  homepageFilmRectsOverlap,
  type HomepageFilmLayoutProfile,
} from "../src/features/voxyVideo/homepageReferenceFilmLayouts";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "9".repeat(40);
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

function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function publicOverlayText(html: string): string {
  const overlay = html.match(/<div class="homepage-profile-overlay"[\s\S]*<\/main>/)?.[0] ?? html;
  return visibleText(overlay);
}

function readableStateId(html: string): string {
  const match = html.match(/data-readable-state-id="([^"]+)"/);
  if (!match?.[1]) throw new Error("missing_readable_state_id");
  return match[1];
}

describe("VOXY homepage V3.9 — true multi-format broadcast system", () => {
  it("01 defines all four standard output profiles and binds the plan to their exact dimensions", () => {
    expect(VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS).toEqual([
      "landscape_16_9",
      "square_1_1",
      "feed_4_5",
      "vertical_9_16",
    ]);
    expect(Object.fromEntries(
      VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS.map((id) => [
        id,
        [VOXY_HOMEPAGE_FILM_LAYOUTS[id].output.width, VOXY_HOMEPAGE_FILM_LAYOUTS[id].output.height],
      ]),
    )).toEqual({
      landscape_16_9: [1920, 1080],
      square_1_1: [1080, 1080],
      feed_4_5: [1080, 1350],
      vertical_9_16: [1080, 1920],
    });
    for (const layoutProfile of VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS) {
      expect(plan("voiceopengov", layoutProfile).output).toMatchObject(
        VOXY_HOMEPAGE_FILM_LAYOUTS[layoutProfile].output,
      );
    }
  });

  it("02 uses profile-specific composition, typography and density instead of only scaling 16:9", () => {
    const landscape = plan("voiceopengov", "landscape_16_9");
    const vertical = plan("voiceopengov", "vertical_9_16");
    const html = htmlAtSegment(vertical, "vog-program-not-contract", 0.8);

    expect(vertical.layout.regions).not.toEqual(landscape.layout.regions);
    expect(vertical.layout.typography).not.toEqual(landscape.layout.typography);
    expect(vertical.layout.maximumSimultaneousObjects).toBeLessThan(
      landscape.layout.maximumSimultaneousObjects,
    );
    expect(html).toContain('data-layout-profile="vertical_9_16"');
    expect(html).toContain('data-layout-scale-only="false"');
    expect(html).toContain('data-compositional-layout="profile-specific"');
    expect(html).toContain(".homepage-distinctive-stage{left:80px!important;top:1110px!important;width:860px!important;height:225px!important");
  });

  it("03 keeps semantic regions inside conservative safe areas and clear of presenter and microphone", () => {
    for (const layout of Object.values(VOXY_HOMEPAGE_FILM_LAYOUTS)) {
      for (const region of [layout.regions.brand, layout.regions.evidence, layout.regions.navigation, layout.regions.caption]) {
        expect(homepageFilmRectInsideSafeArea(region, layout), `${layout.id} region outside safe area`).toBe(true);
      }
      expect(homepageFilmRectsOverlap(layout.regions.evidence, layout.regions.presenter)).toBe(false);
      expect(homepageFilmRectsOverlap(layout.regions.evidence, layout.regions.microphone)).toBe(false);
      expect(homepageFilmRectsOverlap(layout.regions.navigation, layout.regions.presenter)).toBe(false);
      expect(homepageFilmRectsOverlap(layout.regions.navigation, layout.regions.microphone)).toBe(false);
      expect(layout.conservativePlatformPreset).toMatch(/safe/);
    }
  });

  it("04 keeps captions burned in, semantic, stable and bounded to two visual lines in every profile", () => {
    for (const layoutProfile of VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS) {
      const current = plan("edebatte", layoutProfile);
      const html = htmlAtSegment(current, "edebatte-media-forensics", 0.7);
      expect(current.captions).toMatchObject({
        burnedIn: true,
        sidecarsOnly: false,
        cueMode: "semantic_sentence_chunks",
        maximumVisualLines: 2,
        stablePositionPerProfile: true,
      });
      expect(html).toContain('data-caption-mode="sentence-cue"');
      expect(html).toContain('data-caption-maximum-lines="2"');
      expect(html).toContain("-webkit-line-clamp:2");
      expect(html).not.toContain("typewriter");
    }
  });

  it("05 compacts portrait Evidence Memory and limits portrait information density", () => {
    for (const layoutProfile of ["feed_4_5", "vertical_9_16"] as const) {
      const current = plan("edebatte", layoutProfile);
      const html = htmlAtSegment(current, "edebatte-product-model", 0.5);
      expect(current.layout.evidenceMemory).toBe("active_card_and_compact_marker");
      expect(current.broadcastLayout.dynamicEvidence.maximumFullCards).toBe(1);
      expect(current.layout.maximumSimultaneousObjects).toBe(2);
      expect(html).toContain("homepage-profile-memory");
      expect(html).toContain('data-maximum-simultaneous-objects="2"');
      expect(html).toContain(".master .broadcast-chrome{display:none!important}");
    }
  });

  it("06 gives VOG a deterministic dedicated journey region with completed, active and upcoming states", () => {
    const current = plan("voiceopengov", "landscape_16_9");
    const early = htmlAtSegment(current, "vog-greeting", 0.1);
    const late = htmlAtSegment(current, "vog-current-offer", 0.8);
    const navigation = current.layout.regions.navigation;

    expect(homepageFilmRectsOverlap(navigation, current.layout.regions.presenter)).toBe(false);
    expect(homepageFilmRectsOverlap(navigation, current.layout.regions.microphone)).toBe(false);
    expect(early).toContain('.democratic-loop{position:absolute;left:735px;top:468px;');
    expect(early).toContain("DEINE STIMME");
    expect(early).toContain("PROGRAMM");
    expect(early).toContain("VERHANDLUNG");
    expect(early).toContain("BESCHLUSS");
    expect(early).toContain("UMSETZUNG");
    expect(early).toContain("WIRKUNG");
    expect(early).toContain("RÜCKKOPPLUNG");
    expect(early).toContain('data-journey-stage="0"');
    expect(late).toContain('data-journey-stage="3"');
    expect(late).toContain('data-journey-semantic-stage="decision"');
    expect(late).toContain("loop-node n1");
    expect(late).toContain("complete");
    expect(late).toContain("upcoming");
    expect(early).toContain("stroke-dashoffset:calc((1 - var(--loop))*80)");
  });

  it("07 keeps internal product truth in metadata while public VOG language stays human", () => {
    const current = plan("voiceopengov", "vertical_9_16");
    const currentHtml = htmlAtSegment(current, "vog-current-offer", 0.15);
    const futureHtml = htmlAtSegment(current, "vog-current-offer", 0.85);
    const guardrailsHtml = htmlAtSegment(current, "vog-demophobie", 0.85);
    const publicCopy = [currentHtml, futureHtml, guardrailsHtml]
      .map(publicOverlayText)
      .join(" ");

    expect(currentHtml).toContain('data-contract-label="HEUTE · CURRENT CAPABILITY"');
    expect(futureHtml).toContain('data-product-status="future-intent-not-current-capability"');
    expect(publicCopy).not.toMatch(/CURRENT CAPABILITY|ZIELBILD|NICHT ALS PRODUKTFUNKTION|VON BETEILIGUNG ZU SUBSTANZ/);
    expect(publicCopy).not.toMatch(/Gertrude|Lübbe-Wolff|Klostermann|Demophobie/i);
    expect(publicCopy).toContain("ÜBERPRÜFUNG");
    expect(publicCopy).not.toContain("REVISION");
  });

  it("08 simplifies participation and lands both films on their dominant final statements", () => {
    const participation = publicOverlayText(
      htmlAtSegment(plan("voiceopengov", "feed_4_5"), "vog-participation-balance"),
    );
    const vogCta = publicOverlayText(htmlAtSegment(plan("voiceopengov", "vertical_9_16"), "vog-cta"));
    const edCta = publicOverlayText(htmlAtSegment(plan("edebatte", "vertical_9_16"), "edebatte-cta"));

    expect(participation).toContain("WIRKSAME MITBESTIMMUNG");
    expect(participation).toContain("Beteiligung braucht eine definierte Folge.");
    expect(participation).toContain("NUR WÄHLEN?");
    expect(participation).toContain("ALLES DIREKT?");
    expect(vogCta).toContain("DEINE STIMME IST MEHR ALS EIN KREUZ.");
    expect(vogCta).toContain("Mitmachen. Informiert bleiben.");
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS.voiceopengov.segments.at(-1)?.text).toBe(
      "Deine Stimme ist mehr als ein Kreuz. Mitmachen. Informiert bleiben.",
    );
    expect(edCta).toContain("DU MUSST MIR NICHTS GLAUBEN.");
    expect(edCta).toContain("DU SOLLST ES PRÜFEN KÖNNEN.");
  });

  it("09 preserves the 48-frame readability and previous-state pause hold", () => {
    const current = plan("voiceopengov", "vertical_9_16");
    const segment = current.speakerTimeline.find((entry) => entry.id === "vog-program-not-contract");
    const next = current.speakerTimeline.find((entry) => entry.id === "vog-demophobie");
    if (!segment || !next) throw new Error("missing_pause_fixture");
    const firstState = readableStateId(htmlAtSegment(current, segment.id, 0.01));
    const middleState = readableStateId(htmlAtSegment(current, segment.id, 0.5));
    const finalFrame = Math.floor((segment.end - 1 / current.output.fps) * current.output.fps);
    const pauseFrame = Math.floor(((segment.end + next.start) / 2) * current.output.fps);
    const renderFrame = (frameIndex: number) => renderVoxyHomepageReferenceFilmFrameHtml({
      plan: current,
      assets,
      frameIndex,
      amplitude: 0.35,
    });

    expect(firstState).not.toBe(middleState);
    expect((segment.end - segment.start) * current.output.fps / 3).toBeGreaterThanOrEqual(48);
    expect(readableStateId(renderFrame(pauseFrame))).toBe(readableStateId(renderFrame(finalFrame)));
    expect(renderFrame(pauseFrame)).toContain('data-pause-hold="previous-segment"');
    expect(renderFrame(pauseFrame)).toContain('data-min-readable-state-seconds="2"');
  });

  it("10 leaves every human, integration and release gate closed", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      for (const layoutProfile of VOXY_HOMEPAGE_FILM_LAYOUT_PROFILE_IDS) {
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
