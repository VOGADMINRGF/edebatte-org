import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { VOXY_LOCAL_TTS_ENGINE, VOXY_LOCAL_TTS_LICENSE_MATRIX, VOXY_LOCAL_TTS_MODEL, VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES, VOXY_LOCAL_TTS_SCRIPT, VOXY_LOCAL_TTS_SCRIPT_SEGMENTS, VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD, validateVoxyLocalTtsLicenseGate, type VoxyLocalTtsResult } from "@/features/voxyVideo/localTts";
import { VOXY_MOUTH_V41_SHAPES } from "@/features/voxyVideo/mouthV41";
import { buildVoxyVoicedExplainerV1Plan, buildVoxyVoicedExplainerV1Srt, buildVoxyVoicedExplainerV1Vtt, validateVoxyVoicedExplainerV1Plan } from "@/features/voxyVideo/voicedExplainerV1";
import { buildVoxyAudioMouthFrame, renderVoxyVoicedExplainerV1FrameHtml } from "@/features/voxyVideo/voicedExplainerV1Html";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const TIMING = VOXY_LOCAL_TTS_SCRIPT_SEGMENTS.map((segment, index) => ({ ...segment, startMs: index * 4_000, endMs: index * 4_000 + 3_500 }));
const TTS_RESULT = { wavPath: "/tmp/audio.wav", durationMs: 24_000, sampleRate: 22_050, channels: 1, segmentTiming: TIMING, engineProvenance: VOXY_LOCAL_TTS_ENGINE, voiceProvenance: VOXY_LOCAL_TTS_MODEL, modelSha256: VOXY_LOCAL_TTS_MODEL.modelSha256, licenseStatus: "pass", externalRequestCount: 0 } as const satisfies VoxyLocalTtsResult;
const ASSETS = { canonStageDataUrl: "data:image/png;base64,canon", studioLockupDataUrl: "data:image/svg+xml;base64,lockup", lapelPinDataUrl: "data:image/svg+xml;base64,lapel", edebattePocketMarkDataUrl: "data:image/svg+xml;base64,pocket" };

describe("Voxy fully local TTS and voiced explainer v1", () => {
  it("passes a separate four-level license matrix and fails closed for unclear candidates", () => {
    expect(Object.keys(VOXY_LOCAL_TTS_LICENSE_MATRIX.levels)).toEqual(["engineFramework", "concreteVoiceModelWeight", "runtimeTransitiveDependencies", "attributionThirdPartyNotices"]);
    expect(Object.values(VOXY_LOCAL_TTS_LICENSE_MATRIX.levels).every((level) => level.status === "pass")).toBe(true);
    expect(VOXY_LOCAL_TTS_LICENSE_MATRIX.excludedCandidates.every((candidate) => candidate.status === "fail_closed")).toBe(true);
    expect(validateVoxyLocalTtsLicenseGate()).toEqual([]);
  });

  it("pins exact engine, voice, model, dataset, dependencies, and model SHA provenance", () => {
    expect(VOXY_LOCAL_TTS_ENGINE).toMatchObject({ selected: "OHF-Voice/piper1-gpl", version: "1.6.0", license: "GPL-3.0-or-later", integration: "isolated_local_cli_subprocess", historicalVersionSelected: false, networkAccessDuringSynthesis: "forbidden", deterministicInference: { noiseScale: 0, noiseWidthScale: 0, lengthScale: 1.08, volume: 0.82 } });
    expect(VOXY_LOCAL_TTS_MODEL).toMatchObject({ voiceId: "de_DE-mls-medium#speaker-20", datasetSpeakerKey: "3494", modelLicense: "MIT", datasetLicense: "CC-BY-4.0", training: "trained_from_scratch", runtimeDownloadRequired: false, offlineAfterProvisioning: true });
    expect(VOXY_LOCAL_TTS_MODEL.modelSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES.map((entry) => entry.name)).toContain("espeak-ng (embedded)");
  });

  it("keeps the exact visible German script while isolating pronunciation aliases", () => {
    expect(VOXY_LOCAL_TTS_SCRIPT).toBe("Ich bin Voxy.\n\nIch verbinde drei Ebenen:\n\nVote4Gov stellt die Fragen hinter politischen Entscheidungen.\n\nVoiceOpenGov verbindet Menschen, die daraus Beteiligung machen wollen.\n\nUnd eDebatte macht Quellen, Argumente, Fragen und Abstimmungen nachvollziehbar.\n\nIch helfe dabei, den Überblick zu behalten.");
    expect(buildVoxyVoicedExplainerV1Vtt(TIMING)).toContain("VoiceOpenGov verbindet Menschen, die daraus Beteiligung machen wollen.");
    expect(buildVoxyVoicedExplainerV1Srt(TIMING)).toContain("Und eDebatte macht Quellen, Argumente, Fragen und Abstimmungen nachvollziehbar.");
    expect(buildVoxyVoicedExplainerV1Vtt(TIMING)).not.toContain("Woiss-Open-Goff");
  });

  it("builds a duration-bound voiced plan while freezing visual and release truth", () => {
    const plan = buildVoxyVoicedExplainerV1Plan(HEAD, TTS_RESULT);
    expect(plan.output).toMatchObject({ durationMs: 24_000, fps: 24, frameCount: 576, width: 1920, height: 1080 });
    expect(plan.visualMasterHeadSha).toBe(VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD);
    expect(plan.mouth).toMatchObject({ shapesChanged: false, anchorChanged: false, pivotChanged: false, syncSource: "audio", shapeProfile: VOXY_MOUTH_V41_SHAPES });
    expect(plan.waveform).toMatchObject({ count: 1, placement: "behind_voxy", audioReactive: true, positionChanged: false });
    expect(plan).toMatchObject({ visualMasterMutated: false, externalVisualUploadUsed: false, paidProviderUsed: false, externalProviderUsed: false, runtimeNetworkAllowed: false, humanAudioAcceptance: "pending", humanVisualAcceptance: "accepted", productionEligible: false, autoPublish: false });
    expect(validateVoxyVoicedExplainerV1Plan(plan)).toEqual([]);
  });

  it("derives only existing v4.1 mouth states and one subtle waveform from audio amplitude", () => {
    const plan = buildVoxyVoicedExplainerV1Plan(HEAD, TTS_RESULT);
    expect(buildVoxyAudioMouthFrame(0)).toMatchObject({ mouthState: "neutral", mouthNextState: "closed", mouthMix: 0 });
    expect(buildVoxyAudioMouthFrame(0.18).mouthNextState).toBe("slightOpen");
    expect(buildVoxyAudioMouthFrame(0.8).mouthNextState).toBe("speakingOpen");
    const html = renderVoxyVoicedExplainerV1FrameHtml({ plan, assets: ASSETS, frameIndex: 120, amplitude: 0.55 });
    expect(html).toContain('data-mouth-profile="v4.1"');
    expect(html).toContain('data-waveform-count="1"');
    expect(html).toContain('data-waveform-placement="behind_voxy"');
    expect(html).toContain('data-waveform-audio-reactive="true"');
    expect(html.match(/class="audio-waveform-reactive"/g)).toHaveLength(1);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("keeps provisioning separate and the adapter/render path network-free after provisioning", () => {
    const adapter = readFileSync(resolve(process.cwd(), "scripts/lib/voxyLocalTtsAdapter.ts"), "utf8");
    const renderer = readFileSync(resolve(process.cwd(), "scripts/render-voxy-voiced-explainer-v1.ts"), "utf8");
    const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows/voxy-local-tts-voiced-explainer-v1-evidence.yml"), "utf8");
    expect(adapter).toContain("PIP_NO_INDEX");
    expect(adapter).toContain("HF_HUB_OFFLINE");
    expect(adapter).toContain("model_sha_mismatch");
    expect(adapter).toContain("deterministicInference.noiseScale");
    expect(adapter).toContain("durationMs: outputProbe.durationMs");
    expect(readFileSync(resolve(process.cwd(), "scripts/render-voxy-local-tts-gate.ts"), "utf8")).toMatch(/raw_audio_clips.*normalized_audio_clips/s);
    expect(adapter).not.toMatch(/fetch\(|axios|openai|replicate|fal\.ai/i);
    expect(renderer).not.toMatch(/fetch\(|axios|openai|replicate|fal\.ai/i);
    expect(workflow).toContain("unshare --net");
    expect(workflow).toContain("retention-days: 14");
    expect(workflow).not.toMatch(/uses:.*deploy|run:.*publish|ready[-_]for[-_]review/i);
  });
});
