import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageContextMode,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import {
  contextualizeVoxyHomepageReferenceFilmPlan,
  validateVoxyHomepageContextIsolation,
} from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "d".repeat(40);
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  studioLockupDataUrl: "data:image/svg+xml;base64,AA==",
  lapelPinDataUrl: "data:image/svg+xml;base64,VOXY_LEGACY_PIN",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,AA==",
};

function plan(filmId: VoxyHomepageFilmId, contextMode: VoxyHomepageContextMode) {
  const segments = filmSegments(filmId, contextMode);
  const raw = buildVoxyHomepageReferenceFilmPlan({
    filmId,
    contextMode,
    exactHeadSha: exactHead,
    speechDurationsMs: Array.from(
      { length: segments.length },
      () => filmId === "edebatte" ? 6_600 : 7_200,
    ),
  });
  return contextualizeVoxyHomepageReferenceFilmPlan(raw);
}

function frameInsideSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress = 0.5,
): number {
  const segment = current.speakerTimeline.find((entry) => entry.id === segmentId);
  if (!segment) throw new Error(`missing_segment:${segmentId}`);
  const at = segment.start + (segment.end - segment.start) * progress;
  return Math.floor(at * current.output.fps);
}

function htmlAtSegment(
  current: ReturnType<typeof plan>,
  segmentId: string,
  progress = 0.5,
) {
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex: frameInsideSegment(current, segmentId, progress),
    amplitude: 0.35,
  });
}

describe("VOXY homepage reference V3.7 — preserved geometry and context locks", () => {
  it("01 strips election-only evidence and sources from the evergreen VOG render plan", () => {
    const current = plan("voiceopengov", "evergreen");
    const serialized = JSON.stringify(current);

    expect(validateVoxyHomepageContextIsolation(current)).toEqual([]);
    expect(serialized).toContain("vog-evergreen-impact-loop");
    expect(serialized).toContain("Stimme → Folge → Wirkung");
    expect(serialized).not.toContain("vog-election-calendar");
    expect(serialized).not.toContain("WAHLTERMINE 2026");
    expect(serialized).not.toContain("Vier Termine im September");
    expect(serialized).not.toContain("Bundeswahlleiterin");
    expect(serialized).not.toContain("Landeswahlleiterin");
    expect(current.broadcastMeta.displayDate).toBe("ZWISCHEN DEN WAHLEN");
  });

  it("02 keeps election evidence available in the separate election-window plan", () => {
    const election = contextualizeVoxyHomepageReferenceFilmPlan(
      buildVoxyHomepageReferenceFilmPlan({
        filmId: "voiceopengov",
        contextMode: "election_window",
        exactHeadSha: exactHead,
        speechDurationsMs: Array.from(
          { length: filmSegments("voiceopengov", "election_window").length },
          () => 6_500,
        ),
      }),
    );

    expect(election.evidence.some((entry) => entry.id === "vog-election-calendar")).toBe(true);
    expect(election.sources.some((source) => source.id === "federal-election-calendar-2026")).toBe(true);
  });

  it("03 renders the visible lapel pin as VOG instead of the legacy VOXY artwork", () => {
    const current = plan("edebatte", "election_window");
    const html = htmlAtSegment(current, "edebatte-greeting");

    expect(html).toContain("homepage-vog-lapel-pin");
    expect(html).toContain(">VOG</text>");
    expect(html).not.toContain('alt="VOXY"');
    expect(html).not.toContain("VOXY_LEGACY_PIN");
  });

  it("04 declares presenter-safe exclusion zones and keeps eDebatte semantic objects outside them", () => {
    const current = plan("edebatte", "election_window");
    const source = htmlAtSegment(current, "edebatte-source-questions");
    const trace = htmlAtSegment(current, "edebatte-product-model");
    const synthesis = htmlAtSegment(current, "edebatte-synthesis-questions");

    expect(source).toContain('data-host-face-safe-zone="x560-1030:y135-535"');
    expect(source).toContain('data-host-presenter-safe-zone="x540-1030:y125-760"');
    expect(source).toContain('data-presenter-safe-policy="no-semantic-text-or-connector-lines"');
    expect(source).toContain('.information-stage{left:1060px!important;top:165px!important;width:320px!important;height:92px!important');
    expect(trace).toContain('.case-trace-scene{position:absolute;left:770px;top:125px;width:260px;height:390px}');
    expect(trace).toContain('grid-template-columns:1fr');
    expect(synthesis).toContain('data-face-safe-route="outside-host-corridor"');
    expect(synthesis).toContain('.case-synthesis-scene{position:absolute;left:690px;top:125px;width:300px;height:390px}');
    expect(synthesis).not.toContain('data-face-safe-routes="left-and-right-only"');
  });

  it("05 drops the legacy lower third so burned-in subtitles own the muted-first reading lane", () => {
    const current = plan("voiceopengov", "evergreen");
    const programme = htmlAtSegment(current, "vog-program-not-contract");
    const offer = htmlAtSegment(current, "vog-current-offer");

    expect(programme).toContain('data-pilot-version="homepage-reference-v3-4-broadcast-readability"');
    expect(programme).toContain('data-broadcast-discipline="v3-4"');
    expect(programme).toContain('data-muted-first-captions="v3-7"');
    expect(programme).toContain('[data-muted-first-captions="v3-7"] .broadcast-lower-third{opacity:0!important;pointer-events:none!important}');
    expect(offer).toContain("homepage-voxy-subtitle");
  });

  it("06 keeps process panels right of the presenter while moving the democratic loop to the bottom-right", () => {
    const current = plan("voiceopengov", "evergreen");
    const opening = htmlAtSegment(current, "vog-greeting");
    const programme = htmlAtSegment(current, "vog-program-not-contract");
    const participation = htmlAtSegment(current, "vog-participation-balance");
    const offer = htmlAtSegment(current, "vog-current-offer");

    expect(opening).toContain('.democratic-loop{position:absolute;left:735px;top:468px;');
    expect(programme).toContain('.programme-gap-scene,.demophobie-space,.participation-balance-scene,.vog-offer-scene{position:absolute;left:690px;top:125px;');
    expect(participation).toContain('.participation-balance-scene{left:810px;width:220px}');
    expect(participation).toContain('.guardrail{padding:9px 11px;');
    expect(offer).toContain('.current-layer span,.future-layer span{display:block;margin-top:9px;color:#b1c5d4;font-size:11px;');
    expect(offer).toContain('.bridge{position:absolute;left:0;top:150px;width:280px;');
  });

  it("07 keeps the evergreen VOG HTML free of election-calendar artifacts", () => {
    const current = plan("voiceopengov", "evergreen");
    const html = htmlAtSegment(current, "vog-after-election");

    expect(html).toContain("ZWISCHEN DEN WAHLEN");
    expect(html).toContain("Stimme → Folge → Wirkung");
    expect(html).not.toContain("WAHLTERMINE 2026");
    expect(html).not.toContain("Vier Termine im September");
    expect(html).not.toContain("Bundeswahlleiterin");
  });

  it("08 makes the private renderer fail closed on context isolation", () => {
    const renderer = readFileSync(
      new URL("../scripts/render-voxy-homepage-reference-films.ts", import.meta.url),
      "utf8",
    );

    expect(renderer).toContain("contextualizeVoxyHomepageReferenceFilmPlan(rawPlan)");
    expect(renderer).toContain("validateVoxyHomepageContextIsolation(plan)");
    expect(renderer).toContain('contextIsolationGate: "passed"');
  });

  it("09 preserves the release gates pending a fresh human review", () => {
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
