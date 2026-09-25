import { describe, expect, it } from "vitest";

import { VOXY_SIGNATURE } from "../src/features/voxyVideo/dualVoiceArchitecture";
import {
  VOXY_CURRENT_OFFER_INVENTORY,
  VOXY_HOMEPAGE_REFERENCE_FILMS,
  VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT,
  VOXY_HOMEPAGE_SOURCE_REGISTRY,
  buildVoxyHomepageFilmSrt,
  buildVoxyHomepageFilmVtt,
  buildVoxyHomepageReferenceFilmPlan,
  filmSegments,
  validateVoxyHomepageReferenceFilmPlan,
  type VoxyHomepageContextMode,
  type VoxyHomepageFilmId,
} from "../src/features/voxyVideo/homepageReferenceFilms";
import { renderVoxyHomepageReferenceFilmFrameHtml } from "../src/features/voxyVideo/homepageReferenceFilmsHtml";

const exactHead = "b".repeat(40);
const assets = {
  canonStageDataUrl: "data:image/png;base64,AA==",
  studioLockupDataUrl: "data:image/svg+xml;base64,AA==",
  lapelPinDataUrl: "data:image/svg+xml;base64,AA==",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,AA==",
};

function plan(
  filmId: VoxyHomepageFilmId,
  contextMode: VoxyHomepageContextMode = "election_window",
) {
  const count = filmSegments(filmId, contextMode).length;
  const duration =
    filmId === "edebatte" ? 6_000 : contextMode === "evergreen" ? 7_550 : 6_500;
  return buildVoxyHomepageReferenceFilmPlan({
    filmId,
    contextMode,
    exactHeadSha: exactHead,
    speechDurationsMs: Array.from({ length: count }, () => duration),
  });
}

describe("VOXY homepage reference films — contract gates", () => {
  it("01 produces exactly two independent films", () => {
    expect(Object.keys(VOXY_HOMEPAGE_REFERENCE_FILMS)).toEqual([
      "edebatte",
      "voiceopengov",
    ]);
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS.edebatte.proposition).toBe(
      "Prüfen statt glauben.",
    );
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS.voiceopengov.proposition).toBe(
      "Deine Stimme endet nicht am Wahltag.",
    );
  });

  it("02 uses the specified private output package names", () => {
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT.edebatte.mp4).toBe(
      "voxy-edebatte-homepage-reference-v1.mp4",
    );
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT.voiceopengov.mp4).toBe(
      "voxy-voiceopengov-homepage-reference-v1.mp4",
    );
    for (const output of [
      VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT.edebatte,
      VOXY_HOMEPAGE_REFERENCE_FILMS_OUTPUT.voiceopengov,
    ]) {
      expect(output).toMatchObject({
        captionsVtt: "captions.de.vtt",
        captionsSrt: "captions.de.srt",
        sourceManifest: "source-manifest.json",
        evidenceTimeline: "evidence-timeline.json",
        motionTimeline: "motion-timeline.json",
        lowerThirdTimeline: "lower-third-timeline.json",
      });
    }
  });

  it("03 binds every spoken segment to accepted D1 only", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(
        plan(filmId).speakerTimeline.every(
          (entry) =>
            entry.speakerRole === "voxy" && entry.voiceId === VOXY_SIGNATURE.voiceId,
        ),
      ).toBe(true);
      expect(Object.keys(plan(filmId).activeVoiceBindings)).toEqual(["voxy"]);
    }
  });

  it("04 parks W1 without changing its accepted canonical status", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(plan(filmId).canonicalEditorialVoice).toBe(
        "W1 Natural Editorial / parked optional layer",
      );
      expect(JSON.stringify(plan(filmId).speakerTimeline)).not.toContain(
        "ramona_deininger",
      );
    }
  });

  it("05 contains exactly one greeting in each film", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(
        plan(filmId).speakerTimeline.filter((entry) =>
          entry.text.includes("Hallo Nachbar"),
        ).length,
      ).toBe(1);
    }
  });

  it("06 follows the full NEWS 5.0 grammar twice before synthesis", () => {
    expect(plan("edebatte").visualStateTimeline.map((entry) => entry.state)).toEqual([
      "HOST",
      "FOCUS",
      "EXPLAIN",
      "DOCK",
      "HOST",
      "FOCUS",
      "EXPLAIN",
      "DOCK",
      "SYNTHESIS",
      "HOST",
    ]);
  });

  it("07 preserves same-object focus-to-dock continuity", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      const current = plan(filmId);
      expect(
        current.evidenceTimeline.filter(
          (entry) => entry.action === "continuous_scale_translation_to_memory",
        ),
      ).toHaveLength(2);
      expect(current.objectContinuity).toMatchObject({
        sameEvidenceId: true,
        sameVisualIdentity: true,
        scaleAndTranslation: true,
        hardSubstitution: false,
      });
    }
  });

  it("08 retains the canonical studio, VOG pin and exactly one eDebatte pocket mark", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(plan(filmId).broadcastLayout.jacketBranding).toEqual({
        lapelPin: "VOG",
        pocketMark: "eDebatte",
        pocketMarkCount: 1,
      });
    }
  });

  it("09 anchors dynamic evidence memory at the upper right", () => {
    expect(plan("edebatte").broadcastLayout).toMatchObject({
      memoryAnchor: { top: true, right: true, bottom: false },
      focusDockDestination: "upper_right_memory_slot",
      dynamicEvidence: { dataDriven: true, fixedEvidenceCount: false },
    });
  });

  it("10 keeps exactly one audio-reactive waveform", () => {
    expect(plan("voiceopengov").waveform).toEqual({
      count: 1,
      reactsToActiveVoice: true,
      secondWaveform: false,
    });
  });

  it("11 keeps Mouth v4.1 unchanged and active for every D1 segment", () => {
    expect(plan("edebatte").mouth).toMatchObject({
      profile: "voxy-mouth-v4-1-v1",
      shapesChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      syncSpeakerRole: "voxy",
      activeForEverySpokenSegment: true,
    });
  });

  it("12 burns stable Voxy captions into the homepage film while retaining caption sidecars", () => {
    const current = plan("edebatte");
    expect(current.captions).toMatchObject({
      sidecarsOnly: false,
      burnedIn: true,
      languages: ["de"],
    });
    expect(
      current.lowerThirdTimeline.every(
        (entry) => !entry.captionMirror && !entry.wordByWordAnimation && !entry.blinking,
      ),
    ).toBe(true);
    expect(buildVoxyHomepageFilmVtt(current.speakerTimeline)).toContain("WEBVTT");
    expect(buildVoxyHomepageFilmSrt(current.speakerTimeline)).toContain("[Voxy]");
  });

  it("13 makes motion adaptive, semantic and faster than the pilot", () => {
    const current = plan("voiceopengov");
    expect(current.motionPolicy).toEqual({
      adaptiveMotion: true,
      firstTwelveSecondsMaxGapSeconds: 2.5,
      laterMaxGapSeconds: 3.5,
      pilotEvidenceDwellTimesCanonical: false,
      slideshowMode: false,
      reducedMotionInformationEquivalent: true,
    });
    expect(
      current.motionTimeline.every(
        (entry) => !entry.decorativeOnly && entry.semanticPurpose.length > 0,
      ),
    ).toBe(true);
  });

  it("14 supports evergreen and election-window context modes", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      const evergreen = plan(filmId, "evergreen");
      const election = plan(filmId, "election_window");
      expect(evergreen.contextArchitecture.supportedModes).toEqual([
        "evergreen",
        "election_window",
      ]);
      expect(evergreen.speakerTimeline.length).toBeLessThan(election.speakerTimeline.length);
      expect(
        evergreen.speakerTimeline.some((entry) =>
          ["edebatte-election-noise", "vog-election-calendar", "vog-berlin-sixteen"].includes(
            entry.id,
          ),
        ),
      ).toBe(false);
    }
  });

  it("15 binds election claims to official 2026 sources", () => {
    const sources = plan("voiceopengov").sources;
    expect(
      sources.find((source) => source.id === "federal-election-calendar-2026")?.publisher,
    ).toBe("Die Bundeswahlleiterin");
    expect(
      sources.find((source) => source.id === "berlin-election-2026-faq")?.publisher,
    ).toBe("Die Landeswahlleiterin für Berlin");
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS.voiceopengov.evidence[0].shortSummary).toContain(
      "20.09. Berlin",
    );
  });

  it("16 keeps a complete source registry with stable https URLs", () => {
    expect(
      VOXY_HOMEPAGE_SOURCE_REGISTRY.every(
        (source) =>
          source.url.startsWith("https://") &&
          source.publisher &&
          source.retrievedAt === "2026-08-18" &&
          source.revision,
      ),
    ).toBe(true);
  });

  it("17 markets only evidence-backed current capabilities", () => {
    expect(VOXY_CURRENT_OFFER_INVENTORY.map((entry) => entry.classification)).toContain(
      "editorial_principle",
    );
    expect(VOXY_CURRENT_OFFER_INVENTORY.map((entry) => entry.classification)).toContain(
      "future_intent",
    );
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(
        plan(filmId).marketedOffers.every(
          (offer) =>
            offer.classification === "current_capability" &&
            offer.marketable &&
            offer.sourceIds.length > 0,
        ),
      ).toBe(true);
    }
  });

  it("18 forbids homepage integration and publication in this slice", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(plan(filmId)).toMatchObject({
        homepageIntegrationIncluded: false,
        humanHomepageFilmAcceptance: "pending",
        humanNews5VisualAcceptance: "pending",
        productionEligible: false,
        autoPublish: false,
        privacy: { publicArtifact: false, upload: false },
      });
    }
  });

  it("19 renders explicit semantic motion metadata with stable burned-in speech", () => {
    const current = plan("edebatte");
    const html = renderVoxyHomepageReferenceFilmFrameHtml({
      plan: current,
      assets,
      frameIndex: 48,
      amplitude: 0.5,
    });
    expect(html).toContain('data-homepage-film="edebatte"');
    expect(html).toContain('data-motion-event-id="motion-02"');
    expect(html).toContain('data-burned-in-captions="true"');
    expect(html).toContain("homepage-voxy-subtitle");
    expect(html).toContain(current.speakerTimeline[0]!.text);
  });

  it("20 gives the two brands genuinely different visual grammars", () => {
    const edebatte = plan("edebatte");
    const vog = plan("voiceopengov");
    expect(edebatte.visualLanguage).toBe("media_forensics");
    expect(vog.visualLanguage).toBe("democratic_journey");
    expect(new Set(edebatte.motionTimeline.map((entry) => entry.motion))).not.toEqual(
      new Set(vog.motionTimeline.map((entry) => entry.motion)),
    );
    const edebatteSource = edebatte.speakerTimeline.find((entry) => entry.id === "edebatte-source-questions")!;
    const edebatteHtml = renderVoxyHomepageReferenceFilmFrameHtml({
      plan: edebatte,
      assets,
      frameIndex: Math.floor((edebatteSource.start + edebatteSource.end) / 2 * edebatte.output.fps),
      amplitude: 0.4,
    });
    const vogHtml = renderVoxyHomepageReferenceFilmFrameHtml({
      plan: vog,
      assets,
      frameIndex: 240,
      amplitude: 0.4,
    });
    expect(edebatteHtml).toContain("edebatte-forensics");
    expect(edebatteHtml).toContain("ILLUSTRATIVER QUELLENCHECK");
    expect(edebatteHtml).not.toContain("vog-journey");
    expect(vogHtml).toContain("vog-journey");
    expect(vogHtml).toContain("DER WEG GEHT WEITER");
    expect(vogHtml).not.toContain("edebatte-forensics");
  });

  it("21 treats participation design as an editorial question rather than a named product claim", () => {
    const current = plan("voiceopengov");
    expect(current.speakerTimeline.some((entry) => entry.id === "vog-demophobie")).toBe(true);
    expect(current.speakerTimeline.map((entry) => entry.text).join(" ")).not.toMatch(
      /Gertrude|Lübbe-Wolff|Klostermann|Demophobie/,
    );
    expect(
      current.sources.some((source) => source.id === "luebbe-wolff-demophobie-2023"),
    ).toBe(false);
    expect(VOXY_HOMEPAGE_REFERENCE_FILMS.voiceopengov.evidence[2]).toMatchObject({
      type: "GESTALTUNGSFRAGE",
      provenance: "REDAKTIONELLES PRINZIP",
    });
    expect(
      VOXY_CURRENT_OFFER_INVENTORY.find((entry) => entry.id === "direct-democracy-question"),
    ).toMatchObject({ classification: "editorial_principle", marketable: false, sourceIds: [] });
  });

  it("22 passes every film/context contract without drift", () => {
    for (const filmId of ["edebatte", "voiceopengov"] as const) {
      expect(validateVoxyHomepageReferenceFilmPlan(plan(filmId, "evergreen"))).toEqual([]);
      expect(validateVoxyHomepageReferenceFilmPlan(plan(filmId, "election_window"))).toEqual([]);
    }
  });
});
