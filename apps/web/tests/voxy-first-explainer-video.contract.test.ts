import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildVoxyFirstExplainerPlan,
  buildVoxyFirstExplainerSrt,
  buildVoxyFirstExplainerVtt,
  findVoxyFirstExplainerSegment,
  validateVoxyFirstExplainerPlan,
  VOXY_FIRST_EXPLAINER_DETECTOR_HEAD,
  VOXY_FIRST_EXPLAINER_BRAND,
  VOXY_FIRST_EXPLAINER_OUTPUT,
  VOXY_FIRST_EXPLAINER_STATIC_MASTER_HEAD,
  VOXY_FIRST_EXPLAINER_TIMELINE,
} from "@/features/voxyVideo/firstExplainerVideo";
import {
  buildVoxyFirstExplainerFrameState,
  renderVoxyFirstExplainerFrameHtml,
  VOXY_FIRST_EXPLAINER_MOTION_QUANTIZATION_STEPS,
} from "@/features/voxyVideo/firstExplainerVideoHtml";

const HEAD = "9cb25e91ae6fe04f7e532e8116cf0f500ee30ddb";
const ASSETS = {
  canonStageDataUrl: "data:image/png;base64,canon",
  studioLockupDataUrl: "data:image/svg+xml;base64,lockup",
  lapelPinDataUrl: "data:image/svg+xml;base64,lapel",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,pocket",
};

describe("Voxy first explainer video v2 contract", () => {
  it("binds the accepted static A/C decision and unchanged #588 detector head", () => {
    const plan = buildVoxyFirstExplainerPlan(HEAD);
    expect(plan.staticMaster).toEqual({
      exactHeadSha: VOXY_FIRST_EXPLAINER_STATIC_MASTER_HEAD,
      primaryMaster: "A",
      editorialVariant: "C",
      rejectedVariant: "B",
      humanVisualAcceptance: "accepted",
    });
    expect(VOXY_FIRST_EXPLAINER_DETECTOR_HEAD).toHaveLength(40);
    expect(validateVoxyFirstExplainerPlan(plan)).toEqual([]);
  });

  it("defines a contiguous 17-second 1080p five-beat timeline", () => {
    const plan = buildVoxyFirstExplainerPlan(HEAD);
    expect(plan.schemaVersion).toBe("voxy-first-explainer-video-v2");
    expect(plan.output).toMatchObject({ durationMs: 17_000, fps: 24, frameCount: 408, width: 1920, height: 1080 });
    expect(plan.output).toBe(VOXY_FIRST_EXPLAINER_OUTPUT);
    expect(plan.timeline).toHaveLength(5);
    expect(plan.timeline.map((segment) => segment.id)).toEqual(["voxy_intro", "vote4gov_why", "edebatte_what", "voiceopengov_how", "voxy_connects"]);
    expect(findVoxyFirstExplainerSegment(4_500).id).toBe("vote4gov_why");
    expect(findVoxyFirstExplainerSegment(15_500).id).toBe("voxy_connects");
  });

  it("uses the human-decided brand roles and compact explainer copy", () => {
    expect(VOXY_FIRST_EXPLAINER_BRAND).toEqual({
      lapelPin: "VOXY",
      pocketMark: "eDebatte",
      pocketMarkStyle: "wordmark_no_badge",
      studioPrimary: "VoiceOpenGov",
      studioSecondary: "eDebatte",
      vote4GovPlacement: "contextual_only",
      voxyRole: "digital_moderator",
    });
    expect(VOXY_FIRST_EXPLAINER_TIMELINE.map((segment) => segment.caption)).toEqual([
      "Ich bin Voxy – dein digitaler Moderator.",
      "Vote4Gov stellt die Fragen hinter unserer Demokratie.",
      "eDebatte macht Argumente, Quellen und Beteiligung nachvollziehbar.",
      "VoiceOpenGov verbindet Menschen, die daraus echte Beteiligung machen wollen.",
      "Und ich? Ich helfe euch, den Überblick zu behalten.",
    ]);
    expect(VOXY_FIRST_EXPLAINER_TIMELINE[1].editorialKicker).toBe("VOTE4GOV · WARUM");
    expect(VOXY_FIRST_EXPLAINER_TIMELINE[2].editorialKicker).toBe("eDEBATTE · WAS");
    expect(VOXY_FIRST_EXPLAINER_TIMELINE[3].editorialKicker).toBe("VOICEOPENGOV · WIE");
    const serialized = JSON.stringify(VOXY_FIRST_EXPLAINER_TIMELINE);
    expect(serialized).not.toMatch(/Partei|Kandidat|Wahlplattform/i);
    expect(serialized).not.toMatch(/^Hallo Nachbarn,/i);
  });

  it("keeps identity and publication gates fail-closed", () => {
    const plan = buildVoxyFirstExplainerPlan(HEAD);
    expect(plan.timeline.every((segment) => segment.handGesture === "none_flattened_master_identity_lock")).toBe(true);
    expect(plan.motionBoundary).toMatchObject({ flattenedMaster: true, independentHeadMotionAvailable: false, independentBodyMotionAvailable: false, independentHandMotionAvailable: false });
    expect(plan.audioProvenance.audioIncluded).toBe(false);
    expect(plan.externalProviderUsed).toBe(false);
    expect(plan.externalUploadUsed).toBe(false);
    expect(plan.generativeRedrawUsed).toBe(false);
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
  });

  it("rejects invented animation audio and publication readiness", () => {
    const drift = structuredClone(buildVoxyFirstExplainerPlan(HEAD));
    drift.timeline[1].handGesture = "invented_hand_gesture" as never;
    drift.audioProvenance.audioIncluded = true as false;
    drift.productionEligible = true as false;
    expect(validateVoxyFirstExplainerPlan(drift)).toEqual(expect.arrayContaining(["flattened_identity_lock_broken", "audio_provenance_must_fail_closed", "human_and_production_gates_must_fail_closed"]));
  });

  it("renders deterministic local 16:9 9:16 and 1:1 frames", () => {
    const plan = buildVoxyFirstExplainerPlan(HEAD);
    for (const format of ["16:9", "9:16", "1:1"] as const) {
      const html = renderVoxyFirstExplainerFrameHtml({ plan, assets: ASSETS, frameIndex: 192, format });
      expect(html).toContain(`data-format="${format}"`);
      expect(html).toContain('data-waveform-count="1"');
      expect(html).toContain('data-waveform-placement="behind_voxy"');
      expect(html).toContain(
        'data-character-marks="canon-geometry-reconstructed-vector-wordmarks"',
      );
      expect(html).toContain("reconstructed-lapel-pin");
      expect(html).toContain("reconstructed-pocket-mark");
      expect(html).toContain('alt="VOXY"');
      expect(html).toContain('alt="eDebatte"');
      expect(html).toContain('alt="VoiceOpenGov eDebatte"');
      expect(html).toContain(">eDEBATTE · WAS<");
      expect(html).toContain(
        `.editorial-cue{display:${format === "16:9" ? "block" : "none"}}`,
      );
      expect(html).not.toContain("rail-levels");
      expect(html).not.toMatch(/https?:\/\//);
      expect(html).not.toContain("<video");
      expect(html).not.toContain("<canvas");
      expect(html).not.toContain("@keyframes");
    }
  });

  it("keeps bounded deterministic eased motion states", () => {
    const plan = buildVoxyFirstExplainerPlan(HEAD);
    const states = Array.from({ length: plan.output.frameCount }, (_, frameIndex) => buildVoxyFirstExplainerFrameState({ plan, frameIndex }));
    const uniqueStates = new Set(states.map((state) => state.visualStateKey));
    expect(VOXY_FIRST_EXPLAINER_MOTION_QUANTIZATION_STEPS).toBe(8);
    expect(uniqueStates.size).toBeGreaterThanOrEqual(30);
    expect(uniqueStates.size).toBeLessThanOrEqual(90);
    expect(new Set(states.map((state) => state.opacity)).size).toBeGreaterThan(3);
    expect(new Set(states.map((state) => state.blink)).size).toBeGreaterThan(3);
    expect(Math.max(...states.map((state) => Math.abs(state.gazeX)))).toBe(2);
    expect(states.at(-1)?.gazeX).toBe(0);
  });

  it("emits matching German VTT and SRT sidecars", () => {
    const vtt = buildVoxyFirstExplainerVtt();
    const srt = buildVoxyFirstExplainerSrt();
    expect(vtt).toContain("WEBVTT");
    expect(vtt).toContain("00:00:06.000 --> 00:00:10.000");
    expect(srt).toContain("00:00:06,000 --> 00:00:10,000");
    for (const segment of VOXY_FIRST_EXPLAINER_TIMELINE) {
      expect(vtt).toContain(segment.caption);
      expect(srt).toContain(segment.caption);
    }
  });

  it("keeps the exact-head artifact manifest fields explicit", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-first-explainer-video.ts"),
      "utf8",
    );
    for (const field of [
      "renderSize",
      "clipSha256",
      "webmSha256",
      "captionSha256",
      "externalVisualUploadUsed",
    ]) {
      expect(source).toContain(field);
    }
    expect(source).toContain("motion_is_limited_to_five_sparse_blinks_micro_gaze_highlight_cues");
  });

  it("binds exact reconstructed jacket text and the studio lockup", () => {
    const lapelPin = readFileSync(
      resolve(process.cwd(), "public/brands/voxy/overlays/voxy-lapel-pin.svg"),
      "utf8",
    );
    const pocketMark = readFileSync(
      resolve(
        process.cwd(),
        "public/brands/voxy/overlays/edebatte-pocket-mark.svg",
      ),
      "utf8",
    );
    const studioLockup = readFileSync(
      resolve(process.cwd(), "public/brands/voxy/overlays/voiceopengov-edebatte-lockup.svg"),
      "utf8",
    );
    expect(studioLockup).toContain(">VoiceOpenGov</text>");
    expect(studioLockup).toContain(">eDebatte</text>");
    expect(studioLockup).not.toContain(">VOXY</text>");
    expect(studioLockup).not.toContain(">Vote4Gov</text>");
    expect(lapelPin).toContain(">VOXY</text>");
    expect(lapelPin).not.toContain(">VOG</text>");
    expect(pocketMark).toContain(">eDebatte</text>");
    expect(pocketMark).not.toContain(">eDebotte</text>");
    expect(pocketMark).not.toContain("<rect");
  });
});
