import type { VoxyLocalTtsResult, VoxyLocalTtsSegmentTiming } from "./localTts";
import { VOXY_LOCAL_TTS_MODEL, VOXY_LOCAL_TTS_SCRIPT, VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD } from "./localTts";
import { VOXY_MOTION_V4_TIMELINE } from "./motionV4";
import { buildVoxyMotionV41Plan } from "./motionV41";

export const VOXY_VOICED_EXPLAINER_V1_SCHEMA_VERSION = "voxy-voiced-explainer-v1" as const;
export const VOXY_VOICED_EXPLAINER_V1_FPS = 24 as const;
export const VOXY_VOICED_EXPLAINER_V1_RESOLUTION = { width: 1920, height: 1080 } as const;

export function buildVoxyVoicedExplainerV1Plan(exactHeadSha: string, tts: VoxyLocalTtsResult) {
  const baseMotionPlan = buildVoxyMotionV41Plan(exactHeadSha);
  return {
    schemaVersion: VOXY_VOICED_EXPLAINER_V1_SCHEMA_VERSION,
    exactHeadSha,
    visualMasterHeadSha: VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD,
    baseMotionPlan,
    output: {
      durationMs: tts.durationMs,
      fps: VOXY_VOICED_EXPLAINER_V1_FPS,
      frameCount: Math.ceil((tts.durationMs * VOXY_VOICED_EXPLAINER_V1_FPS) / 1_000),
      ...VOXY_VOICED_EXPLAINER_V1_RESOLUTION,
    },
    script: VOXY_LOCAL_TTS_SCRIPT,
    timeline: tts.segmentTiming,
    tts: {
      engine: tts.engineProvenance.selected,
      engineVersion: tts.engineProvenance.version,
      engineLicense: tts.engineProvenance.license,
      voiceId: tts.voiceProvenance.voiceId,
      modelSha256: tts.modelSha256,
      modelLicense: tts.voiceProvenance.modelLicense,
      datasetLicense: tts.voiceProvenance.datasetLicense,
      licenseGateStatus: tts.licenseStatus,
    },
    mouth: {
      ...baseMotionPlan.mouth,
      shapesChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      syncSource: "audio",
      syncMethod: "local_wav_smoothed_rms_quantized_existing_v4_1_shapes",
    },
    waveform: {
      count: 1,
      placement: "behind_voxy",
      audioReactive: true,
      reaction: "subtle_local_wav_smoothed_rms_height_brightness",
      positionChanged: false,
    },
    visualMasterMutated: false,
    externalVisualUploadUsed: false,
    paidProviderUsed: false,
    externalProviderUsed: false,
    runtimeNetworkAllowed: false,
    humanAudioAcceptance: "pending" as const,
    humanVisualAcceptance: "accepted" as const,
    productionEligible: false,
    autoPublish: false,
  } as const;
}

export type VoxyVoicedExplainerV1Plan = ReturnType<typeof buildVoxyVoicedExplainerV1Plan>;

export function validateVoxyVoicedExplainerV1Plan(plan: VoxyVoicedExplainerV1Plan): string[] {
  const errors: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) errors.push("exact_head_invalid");
  if (plan.visualMasterHeadSha !== VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD) errors.push("visual_master_head_drift");
  if (plan.output.fps !== 24 || plan.output.width !== 1920 || plan.output.height !== 1080 || plan.output.durationMs < 10_000) errors.push("media_contract_invalid");
  if (plan.script !== VOXY_LOCAL_TTS_SCRIPT || plan.timeline.map((segment) => segment.text).join("\n\n") !== VOXY_LOCAL_TTS_SCRIPT) errors.push("caption_script_drift");
  if (plan.tts.voiceId !== VOXY_LOCAL_TTS_MODEL.voiceId || plan.tts.modelSha256 !== VOXY_LOCAL_TTS_MODEL.modelSha256 || plan.tts.licenseGateStatus !== "pass") errors.push("voice_provenance_invalid");
  if (plan.mouth.shapesChanged || plan.mouth.anchorChanged || plan.mouth.pivotChanged || plan.mouth.syncSource !== "audio") errors.push("mouth_freeze_or_sync_invalid");
  if (plan.waveform.count !== 1 || plan.waveform.placement !== "behind_voxy" || !plan.waveform.audioReactive || plan.waveform.positionChanged) errors.push("waveform_contract_invalid");
  if (plan.visualMasterMutated || plan.externalVisualUploadUsed || plan.paidProviderUsed || plan.externalProviderUsed || plan.runtimeNetworkAllowed) errors.push("local_frozen_master_contract_invalid");
  if (plan.humanVisualAcceptance !== "accepted" || plan.humanAudioAcceptance !== "pending" || plan.productionEligible || plan.autoPublish) errors.push("release_gate_invalid");
  return errors;
}

function captionTime(ms: number, separator: "." | ","): string {
  const rounded = Math.max(0, Math.round(ms));
  const hours = Math.floor(rounded / 3_600_000);
  const minutes = Math.floor((rounded % 3_600_000) / 60_000);
  const seconds = Math.floor((rounded % 60_000) / 1_000);
  const milliseconds = rounded % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(milliseconds).padStart(3, "0")}`;
}

export function buildVoxyVoicedExplainerV1Vtt(timeline: readonly VoxyLocalTtsSegmentTiming[]): string {
  return `WEBVTT\n\n${timeline.map((segment) => `${captionTime(segment.startMs, ".")} --> ${captionTime(segment.endMs, ".")}\n${segment.text}`).join("\n\n")}\n`;
}

export function buildVoxyVoicedExplainerV1Srt(timeline: readonly VoxyLocalTtsSegmentTiming[]): string {
  return `${timeline.map((segment, index) => `${index + 1}\n${captionTime(segment.startMs, ",")} --> ${captionTime(segment.endMs, ",")}\n${segment.text}`).join("\n\n")}\n`;
}

export function mapAudioTimeToV41Frame(plan: VoxyVoicedExplainerV1Plan, atMs: number): number {
  const audioSegment = plan.timeline.find((segment, index) => {
    const next = plan.timeline[index + 1];
    return atMs >= segment.startMs && (!next || atMs < next.startMs);
  }) ?? plan.timeline.at(-1)!;
  const sourceSegment = VOXY_MOTION_V4_TIMELINE.find((segment) => segment.id === audioSegment.id) ?? VOXY_MOTION_V4_TIMELINE.at(-1)!;
  const speechDuration = Math.max(1, audioSegment.endMs - audioSegment.startMs);
  const progress = Math.max(0, Math.min(1, (atMs - audioSegment.startMs) / speechDuration));
  const sourceAtMs = sourceSegment.startMs + progress * (sourceSegment.endMs - sourceSegment.startMs - 1);
  return Math.max(0, Math.min(plan.baseMotionPlan.output.frameCount - 1, Math.floor((sourceAtMs * plan.baseMotionPlan.output.fps) / 1_000)));
}
