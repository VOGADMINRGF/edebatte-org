import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageContextMode,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const FPS = 24;
const exactHead = "5".repeat(40);
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
      speechDurationsMs: Array.from({ length: segments.length }, () =>
        filmId === "edebatte" ? 6_600 : 7_200,
      ),
    }),
  );
}

function renderAt(current: ReturnType<typeof plan>, at: number) {
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex: Math.floor(at * FPS),
    amplitude: 0.35,
  });
}

function segment(current: ReturnType<typeof plan>, id: string) {
  const value = current.speakerTimeline.find((entry) => entry.id === id);
  if (!value) throw new Error(`missing_segment:${id}`);
  return value;
}

function stateEnter(html: string): number {
  const match = html.match(/--state-enter:([0-9.]+)/);
  if (!match?.[1]) throw new Error("missing_state_enter");
  return Number(match[1]);
}

describe("VOXY homepage V3.5 — presenter and transition polish", () => {
  it("01 moves the eDebatte evidence beam and research trace fully out of the presenter corridor", () => {
    const current = plan("edebatte", "election_window");
    const source = segment(current, "edebatte-source-questions");
    const trace = segment(current, "edebatte-product-model");
    const sourceHtml = renderAt(current, source.start + 3.3);
    const traceHtml = renderAt(current, trace.start + 1);

    expect(sourceHtml).toContain(
      ".evidence-beam{position:absolute;left:700px;top:350px;width:230px",
    );
    expect(traceHtml).toContain(
      ".case-trace-scene{position:absolute;left:770px;top:125px;width:260px",
    );
    expect(360 + 20 + 700).toBeGreaterThan(1030);
    expect(360 + 770).toBeGreaterThan(1030);
  });

  it("02 gives the VOG participation graphic more breathing room from Voxy and the microphone", () => {
    const current = plan("voiceopengov", "evergreen");
    const balance = segment(current, "vog-participation-balance");
    const html = renderAt(current, balance.start + 1);

    expect(html).toContain(".participation-balance-scene{left:810px;width:220px}");
    expect(html).toContain(
      ".participation-balance-scene .balance-core{left:0;top:118px;width:220px;height:168px}",
    );
    expect(360 + 810).toBeGreaterThan(1030);
  });

  it("03 uses deterministic 250 ms state settling instead of browser-time animations", () => {
    const current = plan("voiceopengov", "evergreen");
    const programme = segment(current, "vog-program-not-contract");

    const atStart = stateEnter(renderAt(current, programme.start + 1 / FPS));
    const atHalf = stateEnter(renderAt(current, programme.start + 0.125));
    const atSettled = stateEnter(renderAt(current, programme.start + 0.25));

    expect(atStart).toBeLessThanOrEqual(0.1);
    expect(atHalf).toBeGreaterThanOrEqual(0.4);
    expect(atHalf).toBeLessThanOrEqual(0.55);
    expect(atSettled).toBeGreaterThanOrEqual(0.9);
  });

  it("04 preserves the two-second readability lock while exposing the V3.5 polish metadata", () => {
    const current = plan("edebatte", "election_window");
    const greeting = segment(current, "edebatte-greeting");
    const html = renderAt(current, greeting.start + 1);

    expect(html).toContain('data-presenter-transition-polish="v3-5"');
    expect(html).toContain('data-state-settle-seconds="0.25"');
    expect(html).toContain('data-min-readable-state-seconds="2"');
    expect(html).toContain(
      ".homepage-distinctive-stage>:not(.scene-kicker){opacity:calc(.72 + var(--state-enter)*.28)}",
    );
  });

  it("05 quiets Evidence Memory during VOG synthesis and especially during the final CTA", () => {
    const current = plan("voiceopengov", "evergreen");
    const synthesis = segment(current, "vog-synthesis");
    const cta = segment(current, "vog-cta");
    const synthesisHtml = renderAt(current, synthesis.start + 1);
    const ctaHtml = renderAt(current, cta.start + 1);

    expect(synthesisHtml).toContain(
      '[data-presenter-transition-polish="v3-5"][data-homepage-segment-id="vog-synthesis"] .memory-card{opacity:.62!important}',
    );
    expect(ctaHtml).toContain(
      '[data-presenter-transition-polish="v3-5"][data-homepage-segment-id="vog-cta"] .memory-card{opacity:.38!important}',
    );
  });
});
