import { VOXY_LOCAL_TTS_ENGINE, VOXY_LOCAL_TTS_MODEL, VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD } from "./localTts";
import { VOXY_MOUTH_V41_PROFILE_VERSION, VOXY_MOUTH_V41_SHAPES } from "./mouthV41";

export const VOXY_DOCUMENTARY_VOICE_BAKEOFF_SCHEMA_VERSION =
  "voxy-documentary-voice-bakeoff-v1" as const;

export const VOXY_DOCUMENTARY_VOICE_BAKEOFF_OUTPUT = {
  directory: "artifacts/voxy-documentary-voice-bakeoff",
  visualSource: "artifacts/voxy-motion-v4-1/voxy-motion-v4-1-16x9.mp4",
  visualManifest: "artifacts/voxy-motion-v4-1/manifest.json",
  comparisonWav: "comparison.wav",
  comparisonMp4: "comparison.mp4",
  comparisonJson: "voice-comparison.json",
  licenseMatrix: "license-matrix.json",
  manifest: "manifest.json",
  readme: "README.md",
} as const;

export const VOXY_DOCUMENTARY_TEST_SEGMENTS = [
  { id: "intro", text: "Hallo, ich bin Voxy.", spokenText: "Hallo, ich bin Woxi.", pauseAfterMs: 420 },
  { id: "levels", text: "Ich begleite dich durch eDebatte und verbinde dabei drei Ebenen:", spokenText: "Ich begleite dich durch eh Debatte und verbinde dabei drei Ebenen:", pauseAfterMs: 280 },
  { id: "vote4gov", text: "Vote4Gov stellt Fragen und macht gesellschaftliche Entscheidungen sichtbar.", spokenText: "Wout-for-Goff stellt Fragen und macht gesellschaftliche Entscheidungen sichtbar.", pauseAfterMs: 360 },
  { id: "voiceopengov", text: "VoiceOpenGov bringt Menschen zusammen, die sich einbringen wollen.", spokenText: "Woiss-Open-Goff bringt Menschen zusammen, die sich einbringen wollen.", pauseAfterMs: 360 },
  { id: "edebatte", text: "Und eDebatte hilft dabei, Argumente, Quellen und unterschiedliche Positionen nachvollziehbar zu machen.", spokenText: "Und eh Debatte hilft dabei, Argumente, Quellen und unterschiedliche Positionen nachvollziehbar zu machen.", pauseAfterMs: 380 },
  { id: "verify", text: "Du musst mir dabei nichts glauben.", spokenText: "Du musst mir dabei nichts glauben.", pauseAfterMs: 500 },
  { id: "close", text: "Du sollst es prüfen können.", spokenText: "Du sollst es prüfen können.", pauseAfterMs: 0 },
] as const;

export const VOXY_DOCUMENTARY_TEST_TEXT = VOXY_DOCUMENTARY_TEST_SEGMENTS.map(
  (segment) => segment.text,
).join("\n\n");

const MIMIC3_RUNTIME = {
  engine: "Mycroft Mimic 3 / VITS",
  engineVersion: "mycroft-mimic3-tts 0.2.4",
  engineLicense: "AGPL-3.0-or-later",
  engineSourceUrl: "https://github.com/MycroftAI/mimic3",
  offlineAfterProvisioning: true,
  runtimeNetworkRequests: 0,
} as const;

export const VOXY_DOCUMENTARY_MIMIC3_RUNTIME_DEPENDENCIES = [
  { name: "mycroft-mimic3-tts", version: "0.2.4", license: "AGPL-3.0-or-later" },
  { name: "onnxruntime", version: "1.28.0", license: "MIT" },
  { name: "gruut", version: "2.4.0", license: "MIT" },
  { name: "gruut-lang-de", version: "2.0.1", license: "MIT" },
  { name: "phonemes2ids", version: "1.2.2", license: "MIT" },
  { name: "numpy", version: "1.26.4", license: "BSD-3-Clause" },
  { name: "audioop-lts", version: "0.2.2", license: "PSF-2.0" },
] as const;

export const VOXY_DOCUMENTARY_VOICE_CANDIDATES = [
  {
    id: "control-current",
    label: "CONTROL",
    engine: "Piper",
    engineVersion: VOXY_LOCAL_TTS_ENGINE.version,
    engineLicense: VOXY_LOCAL_TTS_ENGINE.license,
    engineSourceUrl: VOXY_LOCAL_TTS_ENGINE.sourceUrl,
    voice: VOXY_LOCAL_TTS_MODEL.voiceId,
    modelRepository: VOXY_LOCAL_TTS_MODEL.repository,
    modelSourceUrl: VOXY_LOCAL_TTS_MODEL.sourceUrl,
    modelRevision: VOXY_LOCAL_TTS_MODEL.repositoryRevision,
    modelLicense: VOXY_LOCAL_TTS_MODEL.modelLicense,
    dataset: VOXY_LOCAL_TTS_MODEL.dataset,
    datasetLicense: VOXY_LOCAL_TTS_MODEL.datasetLicense,
    datasetSourceUrl: "https://www.openslr.org/94/",
    modelFiles: [{ path: VOXY_LOCAL_TTS_MODEL.modelPath, sha256: VOXY_LOCAL_TTS_MODEL.modelSha256 }],
    attribution: "Attribute Multilingual LibriSpeech under CC-BY-4.0 and retain Piper GPL notices.",
    commercialUse: true,
    offlineAfterProvisioning: true,
    runtimeNetworkRequests: 0,
    knownRisks: ["Human-rejected control: electronic, hard and recognizably synthetic."],
  },
  {
    id: "candidate-a",
    label: "A",
    ...MIMIC3_RUNTIME,
    voice: "de_DE/m-ailabs_low#ramona_deininger",
    modelRepository: "MycroftAI/mimic3-voices",
    modelSourceUrl: "https://github.com/MycroftAI/mimic3-voices/tree/b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42/voices/de_DE/m-ailabs_low",
    modelRevision: "b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42",
    modelLicense: "CC-BY-SA-4.0",
    dataset: "M-AILABS German / Ramona Deininger",
    datasetLicense: "M-AILABS commercial redistribution license (custom BSD-style)",
    datasetSourceUrl: "https://github.com/MycroftAI/mimic3-voices/blob/b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42/voices/de_DE/m-ailabs_low/LICENSE",
    modelFiles: [
      { path: "mimic3-voices/de_DE/m-ailabs_low/generator.onnx", sha256: "3330372429b25fe3a38b10bbe914862a49b2cd0a58da332bbe30fa123035a067" },
      { path: "mimic3-voices/de_DE/m-ailabs_low/config.json", sha256: "e7e10c16ae1d53882b772ca62a3d8f8fe6f42f223facc2c0d9c7805bcacb36c7" },
    ],
    attribution: "Attribute MycroftAI Mimic 3 voices under CC-BY-SA-4.0; retain the M-AILABS copyright, conditions and disclaimer; do not imply endorsement.",
    commercialUse: true,
    knownRisks: ["Low-resolution 22.05 kHz VITS model; ShareAlike and attribution obligations apply when distributing the model material."],
  },
  {
    id: "candidate-b",
    label: "B",
    ...MIMIC3_RUNTIME,
    voice: "de_DE/m-ailabs_low#karlsson",
    modelRepository: "MycroftAI/mimic3-voices",
    modelSourceUrl: "https://github.com/MycroftAI/mimic3-voices/tree/b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42/voices/de_DE/m-ailabs_low",
    modelRevision: "b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42",
    modelLicense: "CC-BY-SA-4.0",
    dataset: "M-AILABS German / Karlsson",
    datasetLicense: "M-AILABS commercial redistribution license (custom BSD-style)",
    datasetSourceUrl: "https://github.com/MycroftAI/mimic3-voices/blob/b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42/voices/de_DE/m-ailabs_low/LICENSE",
    modelFiles: [
      { path: "mimic3-voices/de_DE/m-ailabs_low/generator.onnx", sha256: "3330372429b25fe3a38b10bbe914862a49b2cd0a58da332bbe30fa123035a067" },
      { path: "mimic3-voices/de_DE/m-ailabs_low/config.json", sha256: "e7e10c16ae1d53882b772ca62a3d8f8fe6f42f223facc2c0d9c7805bcacb36c7" },
    ],
    attribution: "Attribute MycroftAI Mimic 3 voices under CC-BY-SA-4.0; retain the M-AILABS copyright, conditions and disclaimer; do not imply endorsement.",
    commercialUse: true,
    knownRisks: ["Shares one multi-speaker VITS weight file with candidate A but uses a genuinely different named source speaker; ShareAlike and attribution obligations apply."],
  },
  {
    id: "candidate-c",
    label: "C",
    ...MIMIC3_RUNTIME,
    voice: "de_DE/thorsten-emotion_low#neutral",
    modelRepository: "MycroftAI/mimic3-voices",
    modelSourceUrl: "https://github.com/MycroftAI/mimic3-voices/tree/b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42/voices/de_DE/thorsten-emotion_low",
    modelRevision: "b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42",
    modelLicense: "CC-BY-SA-4.0",
    dataset: "Thorsten-Voice emotional / neutral profile",
    datasetLicense: "CC0-1.0",
    datasetSourceUrl: "https://github.com/MycroftAI/mimic3-voices/blob/b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42/voices/de_DE/thorsten-emotion_low/LICENSE",
    modelFiles: [
      { path: "mimic3-voices/de_DE/thorsten-emotion_low/generator.onnx", sha256: "5a2588308d23e51874f6c87dd9651fce2375302f4b26bdb98dfe125547d283a5" },
      { path: "mimic3-voices/de_DE/thorsten-emotion_low/config.json", sha256: "131e089e38c0f7c4d93d419d34f7185e45dd926c7dddcb3f72be5f2272ac0785" },
    ],
    attribution: "Attribute MycroftAI Mimic 3 voices under CC-BY-SA-4.0 and retain the Thorsten-Voice CC0 provenance.",
    commercialUse: true,
    offlineAfterProvisioning: true,
    runtimeNetworkRequests: 0,
    knownRisks: ["Neutral profile comes from an emotional multi-speaker model and remains a 22.05 kHz low-resolution finalist."],
  },
] as const;

export const VOXY_DOCUMENTARY_BAKEOFF_LICENSE_MATRIX = {
  status: "pass",
  assessedAt: "2026-08-16",
  candidates: VOXY_DOCUMENTARY_VOICE_CANDIDATES,
  mimic3RuntimeDependencies: VOXY_DOCUMENTARY_MIMIC3_RUNTIME_DEPENDENCIES,
  rejected: [
    { voice: "CaroTTS Caro / Karlsson", reason: "Fail-closed: the HUI repository's Apache license clearly covers its code, but the formal license of the underlying LibriVox-derived audio is not explicit enough for this gate." },
    { voice: "Coqui XTTS v2", reason: "CPML model license is not suitable for this commercially usable finalist gate." },
    { voice: "Silero German", reason: "The available German model is non-commercial." },
    { voice: "Piper pavoque", reason: "Dataset is CC-BY-NC-SA-4.0." },
    { voice: "YourTTS / F5 German community checkpoints", reason: "Non-commercial or incomplete model/dataset provenance." },
  ],
} as const;

export const VOXY_DOCUMENTARY_VISUAL_BINDING = {
  visualMasterHeadSha: VOXY_LOCAL_TTS_VISUAL_MASTER_HEAD,
  mouthProfile: VOXY_MOUTH_V41_PROFILE_VERSION,
  mouthShapes: VOXY_MOUTH_V41_SHAPES,
  mouthShapesChanged: false,
  mouthAnchorChanged: false,
  mouthPivotChanged: false,
  visualMasterMutated: false,
  waveformCount: 1,
  waveformPlacement: "behind_voxy",
  candidateSpecificVisualTuning: false,
} as const;

export function validateVoxyDocumentaryVoiceBakeoffContract(): string[] {
  const errors: string[] = [];
  if (VOXY_DOCUMENTARY_VOICE_CANDIDATES.length < 4) errors.push("control_plus_three_candidates_required");
  if (new Set(VOXY_DOCUMENTARY_VOICE_CANDIDATES.map((candidate) => candidate.voice)).size !== VOXY_DOCUMENTARY_VOICE_CANDIDATES.length) errors.push("candidate_voices_not_distinct");
  if (VOXY_DOCUMENTARY_VOICE_CANDIDATES.some((candidate) => !candidate.modelLicense || !candidate.datasetLicense || !candidate.engineLicense)) errors.push("license_provenance_incomplete");
  if (VOXY_DOCUMENTARY_VOICE_CANDIDATES.some((candidate) => !candidate.engineSourceUrl.startsWith("https://") || !candidate.modelSourceUrl.startsWith("https://") || !candidate.datasetSourceUrl.startsWith("https://"))) errors.push("provenance_source_url_incomplete");
  if (VOXY_DOCUMENTARY_VOICE_CANDIDATES.some((candidate) => !candidate.commercialUse || !candidate.offlineAfterProvisioning || candidate.runtimeNetworkRequests !== 0)) errors.push("candidate_runtime_or_commercial_gate_failed");
  if (VOXY_DOCUMENTARY_VOICE_CANDIDATES.some((candidate) => candidate.modelFiles.some((file) => !/^[0-9a-f]{64}$/.test(file.sha256)))) errors.push("candidate_sha_invalid");
  if (VOXY_DOCUMENTARY_VISUAL_BINDING.mouthShapesChanged || VOXY_DOCUMENTARY_VISUAL_BINDING.mouthAnchorChanged || VOXY_DOCUMENTARY_VISUAL_BINDING.mouthPivotChanged || VOXY_DOCUMENTARY_VISUAL_BINDING.visualMasterMutated) errors.push("visual_master_freeze_failed");
  if (VOXY_DOCUMENTARY_VISUAL_BINDING.waveformCount !== 1 || VOXY_DOCUMENTARY_VISUAL_BINDING.waveformPlacement !== "behind_voxy") errors.push("waveform_contract_failed");
  return errors;
}
