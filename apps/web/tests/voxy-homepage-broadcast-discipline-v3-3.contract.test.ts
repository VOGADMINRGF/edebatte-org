import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageContextMode,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "e".repeat(40);
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  studioLockupDataUrl: "data:image/svg+xml;base64,AA==",
  lapelPinDataUrl: "data:image/svg+xml;base64,AA==",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,AA==",
};

function plan(filmId: VoxyHomepageFilmId, contextMode: VoxyHomepageContextMode) {
  const segments = filmSegments(filmId, contextMode);
  return contextualizeVoxyHomepageReferenceFilmPlan(
    buildVoxyHomepageReferenceFilmPlan({
      filmId,
      contextMode,
      exactHeadSha: exactHead,
      speechDurationsMs: Array.from(
        { length: segments.length },
        () => filmId === "edebatte" ? 6_600 : 7_200,
      ),
    }),
  );
}

function htmlAt(current: ReturnType<typeof plan>, atSeconds: number) {
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex: Math.floor(atSeconds * current.output.fps),
    amplitude: 0.35,
  });
}

function htmlAtSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress = 0.5,
) {
  const segment = current.speakerTimeline.find((entry) => entry.id === segmentId);
  if (!segment) throw new Error(`missing_segment:${segmentId}`);
  const at = segment.start + (segment.end - segment.start) * progress;
  return htmlAt(current, at);
}

function htmlInsidePauseAfter(current: ReturnType<typeof plan>, segmentId: string) {
  const index = current.speakerTimeline.findIndex((entry) => entry.id === segmentId);
  const segment = current.speakerTimeline[index];
  const next = current.speakerTimeline[index + 1];
  if (!segment || !next) throw new Error(`missing_pause_after:${segmentId}`);
  const at = segment.end + (next.start - segment.end) / 2;
  return htmlAt(current, at);
}

function rootSegmentId(html: string): string {
  const match = html.match(/<main class="viewport"[^>]*data-homepage-segment-id="([^"]+)"/);
  if (!match?.[1]) throw new Error("missing_root_segment_id");
  return match[1];
}

describe("VOXY homepage broadcast discipline — V3.7 continuity", () => {
  it("01 holds the previous scene and subtitle through narration pauses instead of flashing the final CTA", () => {
    const edebatte = plan("edebatte", "election_window");
    const vog = plan("voiceopengov", "evergreen");

    const edPause = htmlInsidePauseAfter(edebatte, "edebatte-source-questions");
    const vogPause = htmlInsidePauseAfter(vog, "vog-after-election");

    expect(rootSegmentId(edPause)).toBe("edebatte-source-questions");
    expect(edPause).toContain(edebatte.speakerTimeline.find((entry) => entry.id === "edebatte-source-questions")!.text);
    expect(rootSegmentId(vogPause)).toBe("vog-after-election");
    expect(vogPause).toContain(vog.speakerTimeline.find((entry) => entry.id === "vog-after-election")!.text);
    expect(edPause).toContain('data-pause-hold="previous-segment"');
  });

  it("02 declares the two-second readable-state policy and keeps blinking disabled", () => {
    for (const current of [
      plan("edebatte", "election_window"),
      plan("voiceopengov", "evergreen"),
    ]) {
      const html = htmlAtSegment(current, current.speakerTimeline[0]!.id);
      expect(html).toContain('data-broadcast-discipline="v3-4"');
      expect(html).toContain('data-min-readable-state-seconds="2"');
      expect(html).toContain('data-presenter-safe-policy="no-semantic-text-or-connector-lines"');
      expect(current.lowerThirdTimeline.every((entry) => !entry.blinking && !entry.wordByWordAnimation)).toBe(true);
    }
  });

  it("03 keeps process graphics right of the presenter and puts the living loop below the slide lane", () => {
    const current = plan("voiceopengov", "evergreen");
    const opening = htmlAtSegment(current, "vog-greeting");
    const path = htmlAtSegment(current, "vog-after-election");
    const balance = htmlAtSegment(current, "vog-participation-balance");

    expect(opening).toContain('.democratic-loop{position:absolute;left:735px;top:468px;');
    expect(opening).toContain("loop-heading");
    expect(path).toContain('.living-mandate-path{position:absolute;left:690px;top:125px;width:300px;height:390px}');
    expect(balance).toContain('.programme-gap-scene,.demophobie-space,.participation-balance-scene,.vog-offer-scene{position:absolute;left:690px;top:125px;width:300px;height:390px}');
    expect(balance).toContain('.participation-balance-scene{left:810px;width:220px}');
    expect(balance).not.toContain("balance-axis");
  });

  it("04 keeps the VOG bridge as a real readable phase rather than a short transition flash", () => {
    const current = plan("voiceopengov", "evergreen");
    const bridge = htmlAtSegment(current, "vog-current-offer", 0.5);
    const now = htmlAtSegment(current, "vog-current-offer", 0.15);
    const future = htmlAtSegment(current, "vog-current-offer", 0.85);

    expect(now).toContain('data-readable-state-id="vog-offer-current"');
    expect(bridge).toContain('data-readable-state-id="vog-offer-bridge"');
    expect(bridge).toContain("VON BETEILIGUNG ZU SUBSTANZ");
    expect(future).toContain('data-readable-state-id="vog-offer-future"');
  });

  it("05 reduces eDebatte synthesis to one supporting orbit at a time and removes the connector web", () => {
    const current = plan("edebatte", "election_window");
    const firstSynthesis = current.speakerTimeline.find((entry) => entry.id === "edebatte-next-generation");
    const lastSynthesis = current.speakerTimeline.find((entry) => entry.id === "edebatte-synthesis-questions");
    if (!firstSynthesis || !lastSynthesis) throw new Error("missing_edebatte_synthesis_range");

    const span = lastSynthesis.end - firstSynthesis.start;
    const source = htmlAt(current, firstSynthesis.start + span * 0.15);
    const context = htmlAt(current, firstSynthesis.start + span * 0.5);
    const counter = htmlAt(current, firstSynthesis.start + span * 0.85);

    expect(source).toContain('data-synthesis-phase="source"');
    expect(context).toContain('data-synthesis-phase="context"');
    expect(counter).toContain('data-synthesis-phase="counter"');
    expect(source).toContain('.case-synthesis-scene .synthesis-orbit{display:none;');
    expect(source).not.toContain('<svg viewBox="0 0 900 470"');
  });

  it("06 gives muted-first subtitles the lower reading lane instead of competing lower thirds", () => {
    const vog = htmlAtSegment(plan("voiceopengov", "evergreen"), "vog-synthesis");
    const edebatte = htmlAtSegment(plan("edebatte", "election_window"), "edebatte-synthesis-questions");

    expect(vog).toContain('[data-muted-first-captions="v3-7"] .broadcast-lower-third');
    expect(edebatte).toContain('[data-muted-first-captions="v3-7"] .broadcast-lower-third');
    expect(vog).toContain("homepage-voxy-subtitle");
    expect(vog).toContain("opacity:0!important;pointer-events:none!important");
  });

  it("07 keeps all human and release gates closed until the fresh render is reviewed", () => {
    for (const current of [
      plan("edebatte", "election_window"),
      plan("voiceopengov", "evergreen"),
    ]) {
      expect(current).toMatchObject({
        humanHomepageFilmAcceptance: "pending",
        humanNews5VisualAcceptance: "pending",
        productionEligible: false,
        autoPublish: false,
        homepageIntegrationIncluded: false,
      });
    }
  });
});
