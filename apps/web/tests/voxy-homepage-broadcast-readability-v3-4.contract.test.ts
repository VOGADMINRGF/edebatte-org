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
const MIN_READABLE_FRAMES = 48;
const exactHead = "f".repeat(40);
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  studioLockupDataUrl: "data:image/svg+xml;base64,AA==",
  lapelPinDataUrl: "data:image/svg+xml;base64,AA==",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,AA==",
};

function plan(
  filmId: VoxyHomepageFilmId,
  contextMode: VoxyHomepageContextMode,
  durationMs: number,
) {
  const segments = filmSegments(filmId, contextMode);
  return contextualizeVoxyHomepageReferenceFilmPlan(
    buildVoxyHomepageReferenceFilmPlan({
      filmId,
      contextMode,
      exactHeadSha: exactHead,
      speechDurationsMs: Array.from({ length: segments.length }, () => durationMs),
    }),
  );
}

function renderAtFrame(current: ReturnType<typeof plan>, frameIndex: number) {
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex,
    amplitude: 0.35,
  });
}

function readableStateId(html: string): string {
  const match = html.match(/data-readable-state-id="([^"]+)"/);
  if (!match?.[1]) throw new Error("missing_readable_state_id");
  return match[1];
}

function segmentRange(current: ReturnType<typeof plan>, firstId: string, lastId = firstId) {
  const first = current.speakerTimeline.find((entry) => entry.id === firstId);
  const last = current.speakerTimeline.find((entry) => entry.id === lastId);
  if (!first || !last) throw new Error(`missing_range:${firstId}:${lastId}`);
  return { start: first.start, end: last.end };
}

function stateRunsInRange(
  current: ReturnType<typeof plan>,
  start: number,
  end: number,
): Array<{ state: string; frames: number }> {
  const startFrame = Math.ceil(start * FPS);
  const endFrameExclusive = Math.ceil(end * FPS);
  const runs: Array<{ state: string; frames: number }> = [];

  for (let frame = startFrame; frame < endFrameExclusive; frame += 1) {
    const state = readableStateId(renderAtFrame(current, frame));
    const previous = runs.at(-1);
    if (previous?.state === state) previous.frames += 1;
    else runs.push({ state, frames: 1 });
  }
  return runs;
}

function expectBroadcastReadableRuns(
  current: ReturnType<typeof plan>,
  firstId: string,
  lastId = firstId,
) {
  const range = segmentRange(current, firstId, lastId);
  const runs = stateRunsInRange(current, range.start, range.end);
  expect(runs.length).toBeGreaterThan(0);
  for (const run of runs) {
    expect(run.frames, `${run.state} rendered for only ${run.frames} frames`).toBeGreaterThanOrEqual(
      MIN_READABLE_FRAMES,
    );
  }
  return runs;
}

describe("VOXY homepage V3.4 — frame-level broadcast readability gate", () => {
  it("01 gives every eDebatte source and forensic state at least 48 frames", () => {
    const current = plan("edebatte", "election_window", 6_600);

    const sourceRuns = expectBroadcastReadableRuns(current, "edebatte-source-questions");
    const forensicRuns = expectBroadcastReadableRuns(current, "edebatte-media-forensics");

    expect(sourceRuns.map((entry) => entry.state)).toEqual([
      "ed-source-claim",
      "ed-source-link",
      "ed-source-primary",
    ]);
    expect(forensicRuns.map((entry) => entry.state)).toEqual([
      "ed-forensics-number",
      "ed-forensics-quote",
      "ed-forensics-study-source",
    ]);
  });

  it("02 distributes eDebatte synthesis phases across both synthesis segments instead of restarting them", () => {
    const current = plan("edebatte", "election_window", 6_600);
    const runs = expectBroadcastReadableRuns(
      current,
      "edebatte-next-generation",
      "edebatte-synthesis-questions",
    );

    expect(runs.map((entry) => entry.state)).toEqual([
      "ed-synthesis-source",
      "ed-synthesis-context",
      "ed-synthesis-counter",
    ]);
  });

  it("03 gives VOG programme, Demophobie and current/future states at least 48 frames", () => {
    const current = plan("voiceopengov", "evergreen", 7_200);

    const programmeRuns = expectBroadcastReadableRuns(current, "vog-program-not-contract");
    const demophobieRuns = expectBroadcastReadableRuns(current, "vog-demophobie");
    const offerRuns = expectBroadcastReadableRuns(current, "vog-current-offer");

    expect(programmeRuns.map((entry) => entry.state)).toEqual([
      "vog-programme-promise",
      "vog-programme-gap",
      "vog-programme-decision",
    ]);
    expect(demophobieRuns.map((entry) => entry.state)).toEqual([
      "vog-demophobie-source",
      "vog-demophobie-question",
      "vog-demophobie-guardrails",
    ]);
    expect(offerRuns.map((entry) => entry.state)).toEqual([
      "vog-offer-current",
      "vog-offer-bridge",
      "vog-offer-future",
    ]);
  });

  it("04 collapses optional middle states when a spoken segment is too short for three readable phases", () => {
    const current = plan("edebatte", "election_window", 4_200);

    const sourceRuns = expectBroadcastReadableRuns(current, "edebatte-source-questions");
    const forensicRuns = expectBroadcastReadableRuns(current, "edebatte-media-forensics");

    expect(sourceRuns.map((entry) => entry.state)).toEqual([
      "ed-source-claim",
      "ed-source-primary",
    ]);
    expect(sourceRuns.map((entry) => entry.state)).not.toContain("ed-source-link");
    expect(forensicRuns.map((entry) => entry.state)).toEqual([
      "ed-forensics-number",
      "ed-forensics-study-source",
    ]);
    expect(forensicRuns.map((entry) => entry.state)).not.toContain("ed-forensics-quote");
  });

  it("05 keeps narration gaps on the previous readable state instead of producing sub-second flashes", () => {
    const current = plan("voiceopengov", "evergreen", 7_200);
    const index = current.speakerTimeline.findIndex((entry) => entry.id === "vog-program-not-contract");
    const segment = current.speakerTimeline[index];
    const next = current.speakerTimeline[index + 1];
    if (!segment || !next) throw new Error("missing_vog_programme_pause");

    const lastSpokenFrame = Math.floor((segment.end - 1 / FPS) * FPS);
    const pauseFrame = Math.floor(((segment.end + next.start) / 2) * FPS);
    const spokenState = readableStateId(renderAtFrame(current, lastSpokenFrame));
    const pauseState = readableStateId(renderAtFrame(current, pauseFrame));

    expect(spokenState).toBe("vog-programme-decision");
    expect(pauseState).toBe(spokenState);
  });

  it("06 locks presenter-safe geometry and broadcast-sized semantic typography", () => {
    const current = plan("voiceopengov", "evergreen", 7_200);
    const html = renderAtFrame(
      current,
      Math.floor(segmentRange(current, "vog-participation-balance").start * FPS + FPS),
    );

    expect(html).toContain('data-host-presenter-safe-zone="x540-1030:y125-760"');
    expect(html).toContain('.participation-balance-scene,.vog-offer-scene{position:absolute;left:690px;top:125px;');
    expect(html).toContain('.loop-node{position:absolute;width:180px;height:84px;');
    expect(html).toContain('font-size:42px;line-height:1.02;font-weight:900');
    expect(html).toContain('.balance-core strong{font-size:22px;');
    expect(html).toContain('.balance-core span{max-width:230px;margin:11px auto 0;color:#b0c5d4;font-size:12px;');
  });
});
