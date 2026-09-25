import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const FPS = 24;
const exactHead = "6".repeat(40);
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  studioLockupDataUrl: "data:image/svg+xml;base64,AA==",
  lapelPinDataUrl: "data:image/svg+xml;base64,AA==",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,AA==",
};

function plan(
  filmId: "edebatte" | "voiceopengov",
  layoutProfile: "landscape_16_9" | "vertical_9_16" = "landscape_16_9",
) {
  const contextMode = filmId === "voiceopengov" ? "evergreen" : "election_window";
  const segments = filmSegments(filmId, contextMode);
  return contextualizeVoxyHomepageReferenceFilmPlan(
    buildVoxyHomepageReferenceFilmPlan({
      filmId,
      contextMode,
      exactHeadSha: exactHead,
      speechDurationsMs: Array.from({ length: segments.length }, () => 7_200),
      layoutProfile,
    }),
  );
}

function renderSegment(
  filmId: "edebatte" | "voiceopengov",
  segmentId: string,
  layoutProfile: "landscape_16_9" | "vertical_9_16" = "landscape_16_9",
) {
  const current = plan(filmId, layoutProfile);
  const segment = current.speakerTimeline.find((entry) => entry.id === segmentId);
  if (!segment) throw new Error(`missing_segment:${segmentId}`);
  return renderVoxyHomepageReferenceFilmFrameHtml({
    plan: current,
    assets,
    frameIndex: Math.floor((segment.start + 1) * FPS),
    amplitude: 0.35,
  });
}

describe("VOXY homepage V3.6 — microphone clearance lock", () => {
  it("moves every eDebatte primary-source card farther into the right information lane", () => {
    const html = renderSegment("edebatte", "edebatte-source-questions");

    expect(html).toContain('data-microphone-clearance-lock="v3-6"');
    expect(html).toContain(
      '.source-pull-scene .case-source-object{right:-48px;top:76px;transform:scale(.72);transform-origin:100% 0}',
    );
    expect(html).toContain(
      '.forensic-source-resolution .case-source-object{left:auto;right:-38px;top:76px;transform:scale(.72);transform-origin:100% 0}',
    );
  });

  it("moves and reduces the VOG participation core to leave a visible microphone gap", () => {
    const html = renderSegment("voiceopengov", "vog-participation-balance");

    expect(html).toContain('.participation-balance-scene{left:810px;width:220px}');
    expect(html).toContain(
      '.participation-balance-scene .balance-core{left:0;top:118px;width:220px;height:168px}',
    );
    expect(html).toContain('.participation-balance-scene .extreme{width:102px;padding:9px;opacity:.42}');
  });

  it("keeps the V3.6 source and participation geometry visible in the final 9:16 composition", () => {
    const source = renderSegment("edebatte", "edebatte-source-questions", "vertical_9_16");
    const participation = renderSegment("voiceopengov", "vog-participation-balance", "vertical_9_16");

    expect(source).toContain(
      '.source-pull-scene .case-source-object,.forensic-source-resolution .case-source-object{left:40px!important;right:auto!important;top:16px!important;width:820px!important;min-height:193px!important;transform:none!important}',
    );
    expect(participation).toContain('data-final-human-review-closing="v3-10-3"');
    expect(participation).toContain('width:220px!important;height:168px!important');
    expect(participation).toContain('WIRKSAME MITBESTIMMUNG');
    expect(participation).toContain(
      '.participation-balance-scene .extreme{display:block!important;top:58px!important;width:102px!important;padding:9px!important;opacity:.28!important}',
    );
  });

  it("preserves the V3.4 readability and V3.5 deterministic settle contracts", () => {
    const html = renderSegment("voiceopengov", "vog-current-offer");

    expect(html).toContain('data-min-readable-state-seconds="2"');
    expect(html).toContain('data-state-settle-seconds="0.25"');
    expect(html).toContain('data-presenter-transition-polish="v3-5"');
    expect(html).toContain('data-pause-hold="previous-segment"');
  });
});
