import { describe, expect, it } from "vitest";

import {
  VOXY_CURRENT_OFFER_INVENTORY,
  VOXY_HOMEPAGE_REFERENCE_FILMS,
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageContextMode,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "7".repeat(40);
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

describe("VOXY homepage V3.7 — editorial clarity and muted-first lock", () => {
  it("01 places the film descriptor directly under the primary brand", () => {
    const vog = htmlAtSegment(plan("voiceopengov", "evergreen"), "vog-greeting");
    const edebatte = htmlAtSegment(plan("edebatte", "election_window"), "edebatte-greeting");

    expect(vog).toContain('<strong>VoiceOpenGov</strong><b class="brand-descriptor">DEMOKRATIE IN BEWEGUNG</b>');
    expect(edebatte).toContain('<strong>eDebatte</strong><b class="brand-descriptor">PRÜFEN STATT GLAUBEN</b>');
    expect(vog).toContain('.homepage-brand-hierarchy .brand-descriptor{');
    expect(vog).toContain('font-size:19px;');
  });

  it("02 keeps the VoiceOpenGov loop below the slide lane and gives it deterministic semantic movement", () => {
    const current = plan("voiceopengov", "evergreen");
    const early = htmlAtSegment(current, "vog-greeting", 0.1);
    const later = htmlAtSegment(current, "vog-current-offer", 0.75);

    expect(early).toContain('.democratic-loop{position:absolute;left:735px;top:468px;');
    expect(early).toContain('<div class="loop-heading"><small>WAS PASSIERT DANACH?</small><strong>DER WEG GEHT WEITER</strong></div>');
    expect(early).toContain('data-journey-stage="0"');
    expect(later).toContain('data-journey-stage="3"');
    expect(later).toContain('data-journey-semantic-stage="decision"');
    expect(early).toContain('stroke-dashoffset:calc((1 - var(--loop))*80)');
  });

  it("03 burns one stable Voxy subtitle into both films and keeps caption sidecars available", () => {
    for (const current of [
      plan("edebatte", "election_window"),
      plan("voiceopengov", "evergreen"),
    ]) {
      const segment = current.speakerTimeline[0]!;
      const html = htmlAtSegment(current, segment.id, 0.5);
      expect(current.captions).toMatchObject({ sidecarsOnly: false, burnedIn: true, languages: ["de"] });
      expect(html).toContain('data-burned-in-captions="true"');
      expect(html).toContain('data-muted-first-captions="v3-7"');
      expect(html).toContain('<div class="homepage-voxy-subtitle"');
      expect(html).toContain('<b>VOXY</b>');
      expect(html).toContain(segment.text);
      expect(html).not.toContain('typewriter');
    }
  });

  it("04 removes named research references from the VoiceOpenGov public story", () => {
    const current = plan("voiceopengov", "evergreen");
    const visiblePlan = JSON.stringify({
      speakerText: current.speakerTimeline.map((entry) => entry.text),
      evidence: current.evidence,
      sources: current.sources,
      lowerThirdTimeline: current.lowerThirdTimeline,
    });
    const designFrame = htmlAtSegment(current, "vog-demophobie", 0.5);

    expect(visiblePlan).not.toMatch(/Gertrude|Lübbe-Wolff|Klostermann|Demophobie/);
    expect(designFrame).not.toMatch(/Gertrude|Lübbe-Wolff|Klostermann|DEMOPHOBIE/);
    expect(designFrame).toContain("Wie wird aus Beteiligung nachvollziehbare politische Wirkung?");
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS.voiceopengov.evidence[2]).toMatchObject({
      type: "GESTALTUNGSFRAGE",
      title: "Wie wird aus Beteiligung nachvollziehbare Wirkung?",
      provenance: "REDAKTIONELLES PRINZIP",
    });
  });

  it("05 preserves the distinction between current capability and democratic target design", () => {
    const current = plan("voiceopengov", "evergreen");
    const capability = htmlAtSegment(current, "vog-current-offer", 0.15);
    const target = htmlAtSegment(current, "vog-current-offer", 0.85);

    expect(capability).toContain("HEUTE · CURRENT CAPABILITY");
    expect(target).toContain("ZIELBILD · NICHT ALS PRODUKTFUNKTION BEHAUPTET");
    expect(
      VOXY_CURRENT_OFFER_INVENTORY.find((entry) => entry.id === "direct-democracy-question"),
    ).toMatchObject({ classification: "editorial_principle", marketable: false, sourceIds: [] });
  });

  it("06 leaves all release gates closed until fresh human review", () => {
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
