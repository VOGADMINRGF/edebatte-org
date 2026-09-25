import { describe, expect, it } from "vitest";

import {
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  type VoxyHomepageContextMode,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { contextualizeVoxyHomepageReferenceFilmPlan } from "../src/features/voxyVideo/homepageReferenceFilmsContext";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "8".repeat(40);
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

describe("VOXY homepage V3.8 — narrative navigation and editorial simplification", () => {
  it("01 carries one plain-language VoiceOpenGov lead question in the persistent brand hierarchy", () => {
    const html = htmlAtSegment(plan("voiceopengov", "evergreen"), "vog-program-not-contract");

    expect(html).toContain('data-editorial-simplification="v3-8"');
    expect(html).toContain('data-narrative-navigation="v3-8"');
    expect(html).toContain("Was passiert mit deiner Stimme nach der Wahl?");
    expect(html).toContain("DEMOKRATIE IN BEWEGUNG");
  });

  it("02 makes the VoiceOpenGov journey carousel readable, dynamic and meaning-led", () => {
    const current = plan("voiceopengov", "evergreen");
    const early = htmlAtSegment(current, "vog-greeting", 0.1);
    const later = htmlAtSegment(current, "vog-current-offer", 0.75);

    expect(early).toContain("WAS PASSIERT DANACH?");
    expect(early).toContain("DER WEG GEHT WEITER");
    expect(early).toContain("DEINE STIMME");
    expect(early).toContain('data-journey-stage="0"');
    expect(later).toContain('data-journey-stage="3"');
    expect(later).toContain('data-journey-semantic-stage="decision"');
    expect(early).toContain('font-size:42px;line-height:1.02;font-weight:900');
  });

  it("03 replaces internal product jargon with simple viewer-facing labels while retaining truth metadata", () => {
    const current = plan("voiceopengov", "evergreen");
    const now = htmlAtSegment(current, "vog-current-offer", 0.15);
    const bridge = htmlAtSegment(current, "vog-current-offer", 0.5);
    const future = htmlAtSegment(current, "vog-current-offer", 0.85);

    expect(now).toContain('<small>HEUTE</small>');
    expect(now).toContain('data-contract-label="HEUTE · CURRENT CAPABILITY"');
    expect(bridge).toContain("DER NÄCHSTE SCHRITT");
    expect(bridge).toContain('data-contract-label="VON BETEILIGUNG ZU SUBSTANZ"');
    expect(future).toContain('<small>WIRKUNG</small>');
    expect(future).toContain("STIMME → FOLGE → WIRKUNG");
    expect(future).toContain('data-product-status="future-intent-not-current-capability"');
  });

  it("04 turns the participation comparison into one immediate question instead of a seminar diagram", () => {
    const html = htmlAtSegment(plan("voiceopengov", "evergreen"), "vog-participation-balance");

    expect(html).toContain("WIRKSAME MITBESTIMMUNG");
    expect(html).toContain("NUR WÄHLEN?");
    expect(html).toContain("ALLES DIREKT?");
    expect(html).toContain("Beteiligung braucht eine definierte Folge.");
    expect(html).toContain('data-contract-label="WIRKSAME MITBESTIMMUNG"');
  });

  it("05 uses sentence-level two-line caption cues while preserving the complete subtitle in metadata and sidecars", () => {
    const current = plan("voiceopengov", "evergreen");
    const segment = current.speakerTimeline.find((entry) => entry.id === "vog-program-not-contract")!;
    const early = htmlAtSegment(current, segment.id, 0.1);
    const late = htmlAtSegment(current, segment.id, 0.9);

    expect(early).toContain('data-caption-cues="sentence-level"');
    expect(early).toContain('data-caption-mode="sentence-cue"');
    expect(early).toContain(`data-full-subtitle="${segment.text}"`);
    expect(early).toContain("Was genau davon hast du eigentlich gewählt?");
    expect(late).toContain("Ein Wahlversprechen ist kein Gesetz.");
    expect(early).toContain('-webkit-line-clamp:2');
  });

  it("06 gives Voxy breathing-room moments and lands both films on their strongest brand statements", () => {
    const vogCta = htmlAtSegment(plan("voiceopengov", "evergreen"), "vog-cta", 0.5);
    const edCta = htmlAtSegment(plan("edebatte", "election_window"), "edebatte-cta", 0.5);

    expect(vogCta).toContain("DEINE STIMME IST MEHR ALS EIN KREUZ.");
    expect(vogCta).toContain("Mitmachen. Informiert bleiben.");
    expect(vogCta).toContain('[data-editorial-simplification="v3-8"][data-homepage-segment-id="vog-cta"] .homepage-motion-cue');
    expect(edCta).toContain("DU SOLLST ES PRÜFEN KÖNNEN.");
    expect(edCta).toContain("Lies die Schlagzeile. Dann geh einen Schritt weiter.");
    expect(edCta).toContain('[data-editorial-simplification="v3-8"][data-homepage-segment-id="edebatte-cta"] .homepage-motion-cue');
  });

  it("07 leaves every human and release gate closed for the fresh render review", () => {
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
