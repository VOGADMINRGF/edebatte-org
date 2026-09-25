import { VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD } from "./localTts";
import { VOXY_MOUTH_V41_PROFILE_VERSION, VOXY_MOUTH_V41_SHAPES } from "./mouthV41";

export const VOXY_FIRST_PARTY_VOICE_CLONE_SCHEMA_VERSION =
  "voxy-first-party-voice-clone-v1" as const;

export const VOXY_FIRST_PARTY_VISIBLE_SEGMENTS = [
  { id: "identity", visibleText: "Ich bin Voxy.", spokenText: "Ich bin Woxi." },
  {
    id: "decisions",
    visibleText:
      "Manchmal wirken politische Entscheidungen einfacher, als sie tatsächlich sind.\nUnd manchmal passiert genau das Gegenteil.",
    spokenText:
      "Manchmal wirken politische Entscheidungen einfacher, als sie tatsächlich sind. Und manchmal passiert genau das Gegenteil.",
  },
  {
    id: "complexity",
    visibleText:
      "Ein Thema wird so kompliziert erklärt, dass am Ende kaum noch jemand weiß,\nworum es eigentlich geht.",
    spokenText:
      "Ein Thema wird so kompliziert erklärt, dass am Ende kaum noch jemand weiß, worum es eigentlich geht.",
  },
  { id: "help", visibleText: "Genau da möchte ich helfen.", spokenText: "Genau da möchte ich helfen." },
  {
    id: "vote4gov",
    visibleText: "Vote4Gov stellt Fragen.",
    spokenText: "Wout-for-Goff stellt Fragen.",
  },
  {
    id: "voiceopengov",
    visibleText: "VoiceOpenGov bringt Menschen zusammen.",
    spokenText: "Woiss-Open-Goff bringt Menschen zusammen.",
  },
  {
    id: "edebatte",
    visibleText:
      "Und eDebatte hilft dabei, Argumente, Quellen und unterschiedliche Positionen\nnachvollziehbar zu machen.",
    spokenText:
      "Und eh Debatte hilft dabei, Argumente, Quellen und unterschiedliche Positionen nachvollziehbar zu machen.",
  },
  {
    id: "no_instruction",
    visibleText: "Ich möchte dir nicht sagen, was du denken sollst.",
    spokenText: "Ich möchte dir nicht sagen, was du denken sollst.",
  },
  {
    id: "understanding",
    visibleText: "Ich möchte dir helfen, besser zu verstehen, worüber wir eigentlich entscheiden.",
    spokenText: "Ich möchte dir helfen, besser zu verstehen, worüber wir eigentlich entscheiden.",
  },
  {
    id: "verify_belief",
    visibleText: "Du musst mir dabei nichts glauben.",
    spokenText: "Du musst mir dabei nichts glauben.",
  },
  {
    id: "verify_close",
    visibleText: "Du sollst es prüfen können.",
    spokenText: "Du sollst es prüfen können.",
  },
] as const;

export const VOXY_FIRST_PARTY_VISIBLE_SCRIPT = VOXY_FIRST_PARTY_VISIBLE_SEGMENTS.map(
  (segment) => segment.visibleText,
).join("\n\n");

export const VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES = {
  Voxy: "Woxi",
  Vote4Gov: "Wout-for-Goff",
  VoiceOpenGov: "Woiss-Open-Goff",
  eDebatte: "eh Debatte",
} as const;

export const VOXY_FIRST_PARTY_IDENTITY = {
  voiceOwner: "Ricky Gerd Fleischer",
  voiceConsent: "explicit",
  voiceReferenceSource: "first_party_recording",
  thirdPartySpeakerRights: "none",
} as const;

export const VOXY_FIRST_PARTY_PRIVACY = {
  rawVoiceCommittedToGit: false,
  rawVoiceUploadedToPublicArtifact: false,
  rawVoiceIncludedInPR: false,
  rawVoiceIncludedInProductionBundle: false,
  referencePathsInPublicEvidence: false,
  referenceSegmentsInWorktree: false,
  synthesizedIdentityAudioPublicByDefault: false,
} as const;

export const VOXY_CHATTERBOX_ENGINE = {
  name: "Chatterbox Multilingual",
  package: "chatterbox-tts",
  version: "0.1.7",
  sourceRepository: "https://github.com/resemble-ai/chatterbox",
  sourceRevision: "5de7a54aa4e5e2baadb0182dde554908b48b85c2",
  engineLicense: "MIT",
  packageArtifactSha256: "83782500e3ad4e7c919132e9d7eb8755f29f57c5bde5ec48c655ca23a4eb113c",
  language: "de",
  mode: "zero_shot_reference_conditioned",
  devicePreference: "mps_then_cpu",
  offlineAfterProvisioning: true,
  runtimeNetworkRequests: 0,
  watermark: {
    implementation: "Resemble AI PerTh implicit watermark",
    package: "resemble-perth",
    version: "1.0.1",
    license: "MIT",
    required: true,
    extractionRequiredForGate: true,
  },
} as const;

export const VOXY_CHATTERBOX_MODEL = {
  repository: "ResembleAI/chatterbox",
  sourceUrl: "https://huggingface.co/ResembleAI/chatterbox",
  revision: "5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18",
  model: "Chatterbox-Multilingual V3",
  t3Model: "t3_mtl23ls_v3.safetensors",
  modelLicense: "MIT",
  languages: 23,
  files: [
    { path: "t3_mtl23ls_v3.safetensors", sha256: "5abca8321ede76f8e61f1cc0d19aea6c946b28871017ce8726f8a69203f05953" },
    { path: "s3gen.pt", sha256: "9b9ff07e60b20c136e2b1b3d7563a24604e8d2c4c267888d1ee929dd0151d2a3" },
    { path: "ve.pt", sha256: "4b16d836bc598509860f6fa068165a8bb5e9ac84f05582dfcf278a5a372879f1" },
    { path: "conds.pt", sha256: "6552d70568833628ba019c6b03459e77fe71ca197d5c560cef9411bee9d87f4e" },
    { path: "grapheme_mtl_merged_expanded_v1.json", sha256: "69632f47220a788a52ce2661d096453c5655e9bf25289d89a8d832c46ee07dbf" },
    { path: "Cangjie5_TC.json", sha256: "7073fd9de919443ae88e0bd2449917a65fe54898a4413ed1edcc4b67f28bce8c" },
  ],
} as const;

export const VOXY_CHATTERBOX_RUNTIME_LICENSES = [
  { name: "torch", version: "2.6.0", license: "BSD-3-Clause" },
  { name: "torchaudio", version: "2.6.0", license: "BSD-3-Clause" },
  { name: "transformers", version: "5.2.0", license: "Apache-2.0" },
  { name: "diffusers", version: "0.29.0", license: "Apache-2.0" },
  { name: "resemble-perth", version: "1.0.1", license: "MIT" },
  { name: "s3tokenizer", version: "0.3.0", license: "Apache-2.0" },
  { name: "conformer", version: "0.3.2", license: "MIT" },
  { name: "safetensors", version: "0.5.3", license: "Apache-2.0" },
  { name: "librosa", version: "0.11.0", license: "ISC" },
  { name: "pykakasi", version: "2.3.0", license: "GPL-3.0-or-later" },
  { name: "soxr", version: "1.1.0", license: "LGPL-2.1-or-later" },
  { name: "setuptools", version: "80.9.0", license: "MIT" },
] as const;

export const VOXY_FIRST_PARTY_REFERENCE_WINDOWS = [
  { id: "reference-01-segment-a", reference: 1, startSeconds: 52.02, endSeconds: 58.55 },
  { id: "reference-01-segment-b", reference: 1, startSeconds: 59.0, endSeconds: 68.95 },
  { id: "reference-02-segment-a", reference: 2, startSeconds: 52.35, endSeconds: 61.2 },
  { id: "reference-02-segment-b", reference: 2, startSeconds: 65.15, endSeconds: 70.98 },
] as const;

export const VOXY_FIRST_PARTY_PARAMETER_MATRIX = [
  { id: "matrix-01", referenceSegmentId: "reference-01-segment-a", exaggeration: 0.45, cfgWeight: 0.45, temperature: 0.7, seed: 58901 },
  { id: "matrix-02", referenceSegmentId: "reference-01-segment-b", exaggeration: 0.5, cfgWeight: 0.35, temperature: 0.7, seed: 58902 },
  { id: "matrix-03", referenceSegmentId: "reference-02-segment-a", exaggeration: 0.45, cfgWeight: 0.45, temperature: 0.7, seed: 58903 },
  { id: "matrix-04", referenceSegmentId: "reference-02-segment-b", exaggeration: 0.4, cfgWeight: 0.35, temperature: 0.65, seed: 58904 },
] as const;

export const VOXY_FIRST_PARTY_VARIANTS = [
  {
    id: "candidate-a",
    label: "A — Ricky Natural",
    intent: "identity_over_polish",
    referenceSegmentId: "reference-02-segment-a",
    exaggeration: 0.45,
    cfgWeight: 0.45,
    temperature: 0.7,
    repetitionPenalty: 1.2,
    minP: 0.05,
    topP: 1,
    seed: 58911,
    pauseScale: 1,
  },
  {
    id: "candidate-b",
    label: "B — Ricky Calm",
    intent: "same_identity_calm_soft_natural_pauses",
    referenceSegmentId: "reference-02-segment-b",
    exaggeration: 0.4,
    cfgWeight: 0.35,
    temperature: 0.65,
    repetitionPenalty: 1.2,
    minP: 0.05,
    topP: 1,
    seed: 58921,
    pauseScale: 1.08,
  },
  {
    id: "candidate-c",
    label: "C — Voxy",
    intent: "same_identity_warm_sovereign_curious_friendly_explanatory",
    referenceSegmentId: "reference-01-segment-b",
    exaggeration: 0.5,
    cfgWeight: 0.35,
    temperature: 0.7,
    repetitionPenalty: 1.2,
    minP: 0.05,
    topP: 1,
    seed: 58931,
    pauseScale: 1.04,
  },
] as const;

export const VOXY_FIRST_PARTY_VISUAL_BINDING = {
  visualMasterHeadSha: VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD,
  mouthProfile: VOXY_MOUTH_V41_PROFILE_VERSION,
  mouthShapes: VOXY_MOUTH_V41_SHAPES,
  mouthShapesChanged: false,
  mouthAnchorChanged: false,
  mouthPivotChanged: false,
  visualMasterMutated: false,
  waveformCount: 1,
  waveformPlacement: "behind_voxy",
} as const;

export function validateVoxyFirstPartyVoiceCloneContract(): string[] {
  const errors: string[] = [];
  if (VOXY_FIRST_PARTY_IDENTITY.voiceConsent !== "explicit") errors.push("explicit_consent_required");
  if (VOXY_FIRST_PARTY_IDENTITY.voiceReferenceSource !== "first_party_recording") errors.push("first_party_source_required");
  if (Object.values(VOXY_FIRST_PARTY_PRIVACY).some((value) => value !== false)) errors.push("privacy_default_must_fail_closed");
  if (VOXY_FIRST_PARTY_REFERENCE_WINDOWS.length < 2 || new Set(VOXY_FIRST_PARTY_REFERENCE_WINDOWS.map((window) => window.reference)).size !== 2) errors.push("both_references_required");
  if (VOXY_FIRST_PARTY_VARIANTS.length !== 3 || new Set(VOXY_FIRST_PARTY_VARIANTS.map((variant) => variant.id)).size !== 3) errors.push("three_variants_required");
  if (VOXY_CHATTERBOX_ENGINE.engineLicense !== "MIT" || VOXY_CHATTERBOX_MODEL.modelLicense !== "MIT") errors.push("engine_or_model_license_gate_failed");
  if (VOXY_CHATTERBOX_MODEL.files.some((file) => !/^[0-9a-f]{64}$/.test(file.sha256))) errors.push("model_hash_invalid");
  if (!VOXY_CHATTERBOX_ENGINE.offlineAfterProvisioning || VOXY_CHATTERBOX_ENGINE.runtimeNetworkRequests !== 0 || !VOXY_CHATTERBOX_ENGINE.watermark.required) errors.push("offline_or_watermark_contract_failed");
  if (VOXY_FIRST_PARTY_VISUAL_BINDING.visualMasterHeadSha !== "58548d2a5f6e4a59e84464a5c4aea3875f38662c") errors.push("visual_master_head_drift");
  if (VOXY_FIRST_PARTY_VISUAL_BINDING.mouthShapesChanged || VOXY_FIRST_PARTY_VISUAL_BINDING.mouthAnchorChanged || VOXY_FIRST_PARTY_VISUAL_BINDING.mouthPivotChanged || VOXY_FIRST_PARTY_VISUAL_BINDING.visualMasterMutated) errors.push("frozen_visual_or_mouth_contract_failed");
  if (VOXY_FIRST_PARTY_VISUAL_BINDING.waveformCount !== 1 || VOXY_FIRST_PARTY_VISUAL_BINDING.waveformPlacement !== "behind_voxy") errors.push("waveform_contract_failed");
  if (VOXY_FIRST_PARTY_VISIBLE_SEGMENTS.some((segment) => !segment.visibleText || !segment.spokenText)) errors.push("script_segment_invalid");
  return errors;
}
