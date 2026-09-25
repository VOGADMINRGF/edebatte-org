export const VOXY_LOCAL_TTS_SCHEMA_VERSION = "voxy-local-tts-v1" as const;

export const VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD =
  "58548d2a5f6e4a59e84464a5c4aea3875f38662c" as const;

export const VOXY_LOCAL_TTS_OUTPUT = {
  gateDirectory: "artifacts/voxy-local-tts-gate",
  voicedDirectory: "artifacts/voxy-voiced-explainer-v1",
  rawWav: "tts-sample.wav",
  normalizedWav: "tts-sample-normalized.wav",
  waveformPreview: "waveform-preview.png",
  mp4: "voxy-voiced-explainer-v1-16x9.mp4",
  webm: "voxy-voiced-explainer-v1-16x9.webm",
  audio: "audio.wav",
  captionsVtt: "captions.de.vtt",
  captionsSrt: "captions.de.srt",
  preview: "preview.png",
  contactSheet: "contact-sheet.png",
} as const;

export const VOXY_LOCAL_TTS_SCRIPT_SEGMENTS = [
  { id: "start", text: "Ich bin Voxy.", spokenText: "Ich bin Woxi.", pauseAfterMs: 420 },
  { id: "levels", text: "Ich verbinde drei Ebenen:", spokenText: "Ich verbinde drei Ebenen:", pauseAfterMs: 360 },
  { id: "vote4gov", text: "Vote4Gov stellt die Fragen hinter politischen Entscheidungen.", spokenText: "Wout-for-Goff stellt die Fragen hinter politischen Entscheidungen.", pauseAfterMs: 420 },
  { id: "voiceopengov", text: "VoiceOpenGov verbindet Menschen, die daraus Beteiligung machen wollen.", spokenText: "Woiss-Open-Goff verbindet Menschen, die daraus Beteiligung machen wollen.", pauseAfterMs: 420 },
  { id: "edebatte", text: "Und eDebatte macht Quellen, Argumente, Fragen und Abstimmungen nachvollziehbar.", spokenText: "Und eh Debatte macht Quellen, Argumente, Fragen und Abstimmungen nachvollziehbar.", pauseAfterMs: 420 },
  { id: "end", text: "Ich helfe dabei, den Überblick zu behalten.", spokenText: "Ich helfe dabei, den Überblick zu behalten.", pauseAfterMs: 280 },
] as const;

export const VOXY_LOCAL_TTS_SCRIPT = VOXY_LOCAL_TTS_SCRIPT_SEGMENTS.map(
  (segment) => segment.text,
).join("\n\n");

export const VOXY_LOCAL_TTS_MODEL = {
  repository: "rhasspy/piper-voices",
  sourceUrl: "https://huggingface.co/rhasspy/piper-voices",
  repositoryRevision: "f5a6e9094787fd865d65cb024472f977f9c542b5",
  repositoryLicense: "MIT",
  voiceId: "de_DE-mls-medium#speaker-20",
  modelId: "de_DE-mls-medium",
  speakerId: 20,
  datasetSpeakerKey: "3494",
  locale: "de-DE",
  language: "de_DE",
  sampleRate: 22_050,
  channels: 1,
  quality: "medium",
  modelPath: "models/de_DE-mls-medium/de_DE-mls-medium.onnx",
  configPath: "models/de_DE-mls-medium/de_DE-mls-medium.onnx.json",
  modelCardPath: "models/de_DE-mls-medium/MODEL_CARD",
  modelSha256: "69cd1d2aa5a35839a518966fcc4924b5f93e5f8c948ed0752b1a616ad53f65bf",
  configSha256: "b0af1c89ddfdc72d32e015729b0e89b99eec13c2c8caa1db7488d98e9e570b40",
  modelCardSha256: "ca1bf03a3c287fb6968acfa010e1917f85f0aa59db0f371efc3a2857f4035ffd",
  modelLicense: "MIT",
  dataset: "Multilingual LibriSpeech German (SLR94)",
  datasetLicense: "CC-BY-4.0",
  training: "trained_from_scratch",
  redistributionAllowed: true,
  commercialPublicUseAllowed: true,
  attributionRequired: true,
  offlineAfterProvisioning: true,
  runtimeDownloadRequired: false,
} as const;

export const VOXY_LOCAL_TTS_ENGINE = {
  selected: "OHF-Voice/piper1-gpl",
  sourceUrl: "https://github.com/OHF-Voice/piper1-gpl",
  version: "1.6.0",
  license: "GPL-3.0-or-later",
  integration: "isolated_local_cli_subprocess",
  historicalRepository: "rhasspy/piper",
  historicalSourceUrl: "https://github.com/rhasspy/piper",
  historicalVersionSelected: false,
  historicalLicense: "MIT",
  embeddedPhonemizer: "espeak-ng",
  embeddedPhonemizerLicense: "GPL-3.0-or-later",
  networkAccessDuringSynthesis: "forbidden",
  deterministicInference: {
    noiseScale: 0,
    noiseWidthScale: 0,
    lengthScale: 1.08,
    volume: 0.82,
  },
  wheelSha256: {
    darwinArm64: "b37ddd191b31995fbe981d5900df9c15888cccf427bff8e0b368cc95489fd60a",
    linuxX64: "3120d5cc45e07fb99bdede8feef85116fd45bf488aa1d89c7b1aefb657d38683",
  },
} as const;

export const VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES = [
  { name: "piper-tts", version: "1.6.0", license: "GPL-3.0-or-later" },
  { name: "espeak-ng (embedded)", version: "1.52.0", license: "GPL-3.0-or-later" },
  { name: "onnxruntime", version: "1.28.0", license: "MIT" },
  { name: "pathvalidate", version: "3.3.1", license: "MIT" },
  { name: "flatbuffers", version: "25.12.19", license: "Apache-2.0" },
  { name: "numpy", version: "2.5.2", license: "BSD-3-Clause" },
  { name: "packaging", version: "26.3", license: "Apache-2.0 OR BSD-2-Clause" },
  { name: "protobuf", version: "7.35.1", license: "BSD-3-Clause" },
] as const;

export const VOXY_LOCAL_TTS_LICENSE_MATRIX = {
  status: "pass",
  assessedAt: "2026-08-16",
  levels: {
    engineFramework: {
      status: "pass",
      selected: VOXY_LOCAL_TTS_ENGINE.selected,
      license: VOXY_LOCAL_TTS_ENGINE.license,
      integration: VOXY_LOCAL_TTS_ENGINE.integration,
      copyleftBoundary: "Piper runs as a separately provisioned local CLI subprocess; distribution must retain GPL source-and-notice obligations.",
    },
    concreteVoiceModelWeight: {
      status: "pass",
      voiceId: VOXY_LOCAL_TTS_MODEL.voiceId,
      modelLicense: VOXY_LOCAL_TTS_MODEL.modelLicense,
      datasetLicense: VOXY_LOCAL_TTS_MODEL.datasetLicense,
      training: VOXY_LOCAL_TTS_MODEL.training,
      modelSha256: VOXY_LOCAL_TTS_MODEL.modelSha256,
    },
    runtimeTransitiveDependencies: {
      status: "pass",
      dependencies: VOXY_LOCAL_TTS_RUNTIME_DEPENDENCIES,
      runtimeNetworkAllowed: false,
    },
    attributionThirdPartyNotices: {
      status: "pass",
      noticesFile: "THIRD_PARTY_NOTICES.md",
      attributionRequired: true,
    },
  },
  excludedCandidates: [
    { voiceId: "de_DE-thorsten-high", status: "fail_closed", reason: "fine-tuned from Lessac high; the documented Blizzard 2013 Lessac source dataset is research-only/non-commercial" },
    { voiceId: "de_DE-pavoque-low", status: "fail_closed", reason: "dataset is CC-BY-NC-SA-4.0" },
    { voiceId: "de_DE-karlsson-low", status: "fail_closed", reason: "fine-tuning base-weight rights chain is not sufficiently clear" },
    { voiceId: "de_DE-eva_k-x_low / de_DE-ramona-low", status: "fail_closed", reason: "dataset license is not explicit in the concrete model cards" },
  ],
} as const;

export type VoxyLocalTtsSegmentInput = Readonly<{ id: string; text: string; spokenText?: string; pauseAfterMs?: number }>;
export type VoxyLocalTtsRequest = Readonly<{
  text: string;
  locale: "de-DE";
  voiceId: typeof VOXY_LOCAL_TTS_MODEL.voiceId;
  outputPath: string;
  segments: readonly VoxyLocalTtsSegmentInput[];
  speed?: number;
}>;
export type VoxyLocalTtsSegmentTiming = Readonly<{ id: string; text: string; spokenText: string; startMs: number; endMs: number; pauseAfterMs: number }>;
export type VoxyLocalTtsResult = Readonly<{
  wavPath: string;
  durationMs: number;
  sampleRate: number;
  channels: number;
  segmentTiming: readonly VoxyLocalTtsSegmentTiming[];
  engineProvenance: typeof VOXY_LOCAL_TTS_ENGINE;
  voiceProvenance: typeof VOXY_LOCAL_TTS_MODEL;
  modelSha256: typeof VOXY_LOCAL_TTS_MODEL.modelSha256;
  licenseStatus: "pass";
  externalRequestCount: 0;
}>;
export interface VoxyLocalTtsAdapter {
  synthesize(request: VoxyLocalTtsRequest): Promise<VoxyLocalTtsResult>;
}

export function validateVoxyLocalTtsLicenseGate(): string[] {
  const errors: string[] = [];
  if (VOXY_LOCAL_TTS_LICENSE_MATRIX.status !== "pass") errors.push("license_gate_not_pass");
  if (Object.values(VOXY_LOCAL_TTS_LICENSE_MATRIX.levels).some((level) => level.status !== "pass")) errors.push("four_level_license_matrix_incomplete");
  if (!/^[0-9a-f]{64}$/.test(VOXY_LOCAL_TTS_MODEL.modelSha256)) errors.push("model_sha_invalid");
  if (VOXY_LOCAL_TTS_MODEL.training !== "trained_from_scratch") errors.push("training_chain_unclear");
  if (!VOXY_LOCAL_TTS_MODEL.redistributionAllowed || !VOXY_LOCAL_TTS_MODEL.commercialPublicUseAllowed) errors.push("model_or_dataset_rights_not_usable");
  if (VOXY_LOCAL_TTS_MODEL.runtimeDownloadRequired || !VOXY_LOCAL_TTS_MODEL.offlineAfterProvisioning) errors.push("runtime_network_contract_invalid");
  if (VOXY_LOCAL_TTS_ENGINE.integration !== "isolated_local_cli_subprocess") errors.push("gpl_isolation_contract_invalid");
  return errors;
}
