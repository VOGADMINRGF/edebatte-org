import { VOXY_DOCUMENTARY_VOICE_CANDIDATES } from "./documentaryVoiceBakeoff";
import {
  VOXY_CHATTERBOX_ENGINE,
  VOXY_CHATTERBOX_MODEL,
  VOXY_FIRST_PARTY_PRIVACY,
  VOXY_FIRST_PARTY_VISUAL_BINDING,
} from "./firstPartyVoiceClone";

export type VoxySpeakerRole = "voxy" | "editorial";

export type VoxyNewsVisualState =
  | "host"
  | "focus"
  | "explain"
  | "dock"
  | "synthesis";

export const VOXY_EDITORIAL_INTENTS = [
  "cross_information",
  "bounded_context_block",
  "editorial_insert",
  "additional_perspective",
  "authored_source_notice",
  "meta_context",
  "external_summary",
] as const;

export type VoxyEditorialIntent = (typeof VOXY_EDITORIAL_INTENTS)[number];

export type VoxySpeakerTimelineEntry = Readonly<{
  start: number;
  end: number;
  speakerRole: VoxySpeakerRole;
  voiceId: string;
  text: string;
}>;

export const VOXY_DUAL_VOICE_SCHEMA_VERSION =
  "voxy-dual-voice-architecture-v1" as const;

export const VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION = {
  principle: "human_accepted_voice_preservation",
  allowedPath: "voice_synthesis_to_necessary_resampling_to_transparent_pcm_assembly",
  outputSampleRate: 48_000,
  outputChannels: 1,
  outputCodec: "pcm_s16le",
  dynamicNormalization: false,
  compression: false,
  pitchChanged: false,
  tempoChanged: false,
  timeStretch: false,
  eqApplied: false,
  staticGainPolicy: {
    mode: "per_segment_relative_to_human_accepted_role_evidence",
    blanketRoleGainForbidden: true,
    zeroGainToleranceLu: 0.5,
    gainPrecisionDb: 0.1,
    maximumOutputTruePeakDbfs: -1,
    abstractLufsTargetForbidden: true,
  },
  peakProtectionApplied: false,
  peakProtectionRule: "minimal_transparent_protection_only_after_measured_clipping",
} as const;

const EDITORIAL_DOCUMENTARY_REFERENCE = VOXY_DOCUMENTARY_VOICE_CANDIDATES[1];

export const VOXY_SIGNATURE = {
  id: "VOXY_D1_CONVERSATIONAL_DYNAMIC",
  speakerRole: "voxy",
  candidateId: "D1",
  humanIdentityStatus: "accepted",
  voiceId: "voxy-d1-conversational-dynamic-pr621",
  deliveryMode: "conversational_dynamic",
  selectedVariantId: "d1-conversational-dynamic",
  provenance: {
    source: "human_accepted_d1_conversational_dynamic",
    privateHumanReviewEvidenceSha256:
      "0cbbacefd3f19332fdc879deae4b683a86a586a431b81d4ce668b4880a52da48",
    canonicalReference: {
      id: "reference-02",
      sha256: "ffd2dd8686f0d29c524174c57572a3c188da64d59a0a8451ae94cbb5252ae5bd",
      segmentId: "reference-02-segment-b",
      segmentStartSeconds: 65.15,
      segmentEndSeconds: 70.98,
      segmentSha256: "72e1b6ce77bad94da04babd1d66c3c7401f89b42fe7ff8df2076ac076b713f09",
      privatePathWithheld: true,
    },
    synthesis: {
      seed: 62122,
      seedStrategy: "base_plus_job_offset_plus_part_index",
      exaggeration: 0.47,
      cfgWeight: 0.32,
      temperature: 0.7,
      repetitionPenalty: 1.2,
      minP: 0.05,
      topP: 1,
      pauseScale: 0.92,
      timeStretch: false,
      mastering: VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION,
    },
    engine: VOXY_CHATTERBOX_ENGINE,
    model: VOXY_CHATTERBOX_MODEL,
    privateRawReferencesInRepository: false,
    historicalBakeoffEvidencePreserved: true,
  },
  privacyAndLicense: {
    ...VOXY_FIRST_PARTY_PRIVACY,
    engineLicense: VOXY_CHATTERBOX_ENGINE.engineLicense,
    modelLicense: VOXY_CHATTERBOX_MODEL.modelLicense,
    localInferenceOnly: true,
    runtimeDistributionAuthorized: false,
    publicAudioAuthorized: false,
  },
} as const;

export const EDITORIAL_VOICE = {
  id: "EDITORIAL_W1_NATURAL",
  speakerRole: "editorial",
  candidateId: "W1",
  humanIdentityStatus: "accepted",
  voiceId: EDITORIAL_DOCUMENTARY_REFERENCE.voice,
  deliveryMode: "natural_editorial",
  provenance: {
    source: "human_accepted_w1_natural_editorial",
    privateHumanReviewEvidenceSha256:
      "773e7cf521a1760e463d50a3d27be25247ebaba06025c582985c1a45a00d3f90",
    candidateId: EDITORIAL_DOCUMENTARY_REFERENCE.id,
    engine: EDITORIAL_DOCUMENTARY_REFERENCE.engine,
    engineVersion: EDITORIAL_DOCUMENTARY_REFERENCE.engineVersion,
    engineSourceUrl: EDITORIAL_DOCUMENTARY_REFERENCE.engineSourceUrl,
    modelRepository: EDITORIAL_DOCUMENTARY_REFERENCE.modelRepository,
    modelRevision: EDITORIAL_DOCUMENTARY_REFERENCE.modelRevision,
    dataset: EDITORIAL_DOCUMENTARY_REFERENCE.dataset,
    datasetSourceUrl: EDITORIAL_DOCUMENTARY_REFERENCE.datasetSourceUrl,
    modelFiles: EDITORIAL_DOCUMENTARY_REFERENCE.modelFiles,
    synthesis: {
      deterministic: true,
      noiseScale: 0,
      noiseWidthScale: 0,
      lengthScale: 1.12,
      timeCompression: false,
      mastering: VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION,
    },
  },
  privacyAndLicense: {
    engineLicense: EDITORIAL_DOCUMENTARY_REFERENCE.engineLicense,
    modelLicense: EDITORIAL_DOCUMENTARY_REFERENCE.modelLicense,
    datasetLicense: EDITORIAL_DOCUMENTARY_REFERENCE.datasetLicense,
    attribution: EDITORIAL_DOCUMENTARY_REFERENCE.attribution,
    commercialUse: EDITORIAL_DOCUMENTARY_REFERENCE.commercialUse,
    offlineAfterProvisioning: EDITORIAL_DOCUMENTARY_REFERENCE.offlineAfterProvisioning,
    runtimeNetworkRequests: EDITORIAL_DOCUMENTARY_REFERENCE.runtimeNetworkRequests,
    privateRawReferencesInRepository: false,
    localInferenceOnly: true,
    publicAudioAuthorized: false,
  },
} as const;

export const VOXY_CANONICAL_NARRATION_ARCHITECTURE = {
  canonicalNarrationArchitecture: "single_voice_default",
  productPrinciple: "one_host_multiple_information_states",
  defaultNarrationVoice: VOXY_SIGNATURE.voiceId,
  defaultNarrationCandidate: "D1",
  defaultSpeakerRole: "voxy",
  visualStateAndSpeakerRoleIndependent: true,
  automaticSpeakerRoutingByVisualState: false,
  editorialLayer: {
    status: "accepted_optional_explicit_only",
    voiceId: EDITORIAL_VOICE.voiceId,
    candidateId: "W1",
    explicitEditorialIntentRequired: true,
    allowedIntents: VOXY_EDITORIAL_INTENTS,
  },
  humanNarrationArchitectureAcceptance: "accepted",
  humanSingleVsDualPreference: "single_voice",
  humanSingleVsDualPreferenceAcceptance: "accepted",
  humanPreferenceReason: "single_voice_strengthens_voxy_as_central_personality_and_is_preferred_as_default",
} as const;

export function resolveVoxyNarrationBinding(input: {
  visualState: VoxyNewsVisualState;
  requestedSpeakerRole?: VoxySpeakerRole;
  editorialIntent?: string | null;
}) {
  if (input.editorialIntent == null || input.editorialIntent === "") {
    return {
      speakerRole: "voxy",
      voiceId: VOXY_SIGNATURE.voiceId,
      candidateId: VOXY_SIGNATURE.candidateId,
      editorialIntent: null,
    } as const;
  }
  if (!VOXY_EDITORIAL_INTENTS.includes(input.editorialIntent as VoxyEditorialIntent)) {
    throw new Error(`editorial_intent_invalid:${input.editorialIntent}`);
  }
  return {
    speakerRole: "editorial",
    voiceId: EDITORIAL_VOICE.voiceId,
    candidateId: EDITORIAL_VOICE.candidateId,
    editorialIntent: input.editorialIntent as VoxyEditorialIntent,
  } as const;
}

export const VOXY_DUAL_VOICE_ACCEPTANCE = {
  canonicalNarrationArchitecture: "single_voice_default",
  humanNarrationArchitectureAcceptance: "accepted",
  humanSingleVsDualPreference: "single_voice",
  humanSingleVsDualPreferenceAcceptance: "accepted",
  technicalVoiceMappingGate: "passed",
  technicalDualVoiceTest: "passed",
  technicalSingleVoiceTest: "passed",
  humanVoiceIdentityAcceptance: "accepted",
  humanVoxyVoiceAcceptance: "accepted",
  humanEditorialVoiceAcceptance: "accepted",
  humanPilotAcceptance: "pending",
  canonicalVoxyVoice: "D1 Conversational Dynamic",
  canonicalEditorialVoice: "W1 Natural Editorial",
  genderLabelsAllowed: false,
  videoRenderingAllowed: true,
  videoRenderingScope: "private_pilot_v1.3_only",
  auditedAt: "2026-08-18",
  productionEligible: false,
  autoPublish: false,
} as const;

export const VOXY_SPEAKER_ROLE_RULES = {
  voxy: {
    voiceId: VOXY_SIGNATURE.voiceId,
    responsibilities: [
      "greeting",
      "direct_user_address",
      "questions",
      "explanation",
      "source_guidance",
      "fact_context",
      "information_synthesis",
      "moderation",
      "transitions",
      "reflection",
      "cta",
      "closing",
    ],
    voxyMouth: "sync_to_active_voxy_voice",
    voxyMotion: "existing_natural_host_motion",
  },
  editorial: {
    voiceId: EDITORIAL_VOICE.voiceId,
    explicitEditorialIntentRequired: true,
    automaticVisualStateRouting: false,
    responsibilities: [
      "cross_information",
      "bounded_context_block",
      "editorial_insert",
      "additional_perspective",
      "authored_source_notice",
      "meta_context",
      "external_summary",
    ],
    voxyMouth: "neutral_or_closed_no_editorial_lip_sync",
    voxyMotion: "subtle_idle_only",
  },
  waveform: {
    count: 1,
    reactsToActiveVoice: true,
    speakerChangeCreatesSecondWaveform: false,
  },
} as const;

export const VOXY_DIRECT_ADDRESS_GREETING = {
  text: "Hallo Nachbar,",
  speakerRole: "voxy",
  placement: "once_at_start_of_connected_direct_address_video",
  editorialUsesGreeting: false,
  repeatBeforeEachVoxySegment: false,
  repeatForShortInsertTransitionOrNonDirectInformation: false,
  brandNarrativeException: false,
} as const;

export const VOXY_NEWS_VISUAL_STATES = [
  {
    id: "host",
    primaryFocus: "voxy",
    purpose: ["introduction", "question", "transition", "reflection", "cta"],
    voxyPresence: "primary",
  },
  {
    id: "focus",
    primaryFocus: "active_information_object",
    allowedObjects: ["source", "chart", "map", "document", "image", "statistic", "quote", "trend"],
    sourceMustRemainRecognizable: true,
    relevantEvidenceMayBeHighlighted: true,
    voxyPresence: "visibly_reduced_host",
  },
  {
    id: "explain",
    primaryFocus: "active_information_object",
    defaultSpeakerRole: "voxy",
    editorialRequiresExplicitIntent: true,
    narrationDrivenVisualization: true,
    decorativeAnimationWithoutInformationValue: false,
    voxyPresence: "present_passive_host",
    voxyMouth: "neutral_or_closed",
  },
  {
    id: "dock",
    primaryFocus: "evidence_memory_transition",
    destination: "right_dynamic_evidence_summary_zone",
    abruptDisappearance: false,
    provenanceRemainsVisible: true,
    refocusAllowed: true,
  },
  {
    id: "synthesis",
    primaryFocus: "multiple_previously_explained_evidence_objects",
    relationships: ["agreement", "contradiction", "dependency", "uncertainty"],
    defaultSpeakerRole: "voxy",
    editorialSummaryAllowedWithExplicitIntent: true,
    nextState: "host_for_reflection_question_or_cta",
  },
] as const satisfies readonly {
  id: VoxyNewsVisualState;
  primaryFocus: string;
  [key: string]: unknown;
}[];

export const VOXY_DYNAMIC_EVIDENCE_MEMORY = {
  location: "right_evidence_summary_zone",
  staticSidebar: false,
  stores: [
    "source",
    "metric",
    "trend",
    "argument",
    "counterargument",
    "quote",
    "open_question",
    "uncertainty",
    "vote_result",
  ],
  previouslyDockedObjectsMayReturnToFocus: true,
  provenanceRemainsTraceable: true,
} as const;

export const VOXY_SOURCE_FIRST_PRIORITY = [
  "original_source_or_original_data",
  "traceably_derived_visualization",
  "clearly_labeled_editorial_summary",
] as const;

export const VOXY_SOURCE_FIRST_GUARDRAILS = {
  showOrigin: true,
  showWhatSourceContains: true,
  showRelevantPart: true,
  showDerivation: true,
  inventedCharts: false,
  decorativeFakeData: false,
  sourceOnlyAsFinePrint: false,
} as const;

export const VOXY_NARRATIVE_CHART_BEHAVIOR = {
  narrationDrivesAnimation: true,
  allowedSequence: [
    "axis_first",
    "relevant_series",
    "time_range_focus",
    "comparison_value",
    "relevant_point",
    "full_context",
    "dock",
  ],
  fullComplexChartRequiredAtStart: false,
  decorativeAnimationWithoutInformationValue: false,
} as const;

export const VOXY_CANONICAL_INFORMATION_FLOW = [
  { state: "host", active: "voxy", speakerRole: "voxy" },
  { state: "focus", active: "information", speakerRole: "voxy" },
  { state: "explain", active: "information", speakerRole: "voxy" },
  { state: "dock", active: "information", speakerRole: "voxy" },
  { state: "host", active: "voxy", speakerRole: "voxy" },
  { state: "focus", active: "next_information", speakerRole: "voxy" },
  { state: "explain", active: "information", speakerRole: "voxy" },
  { state: "dock", active: "information", speakerRole: "voxy" },
  { state: "synthesis", active: "evidence_relationships", speakerRole: "voxy" },
  { state: "host", active: "voxy_reflection_or_cta", speakerRole: "voxy" },
] as const satisfies readonly {
  state: VoxyNewsVisualState;
  active: string;
  speakerRole: VoxySpeakerRole;
}[];

export const VOXY_NARRATION_AB_EVIDENCE = {
  variantA: { id: "v1.3", narration: "dual_voice", voices: ["D1", "W1"] },
  variantB: { id: "v1.3-single-voice", narration: "single_voice", voices: ["D1"] },
  technicalDualVoiceTest: "passed",
  technicalSingleVoiceTest: "passed",
  humanSingleVsDualPreference: "single_voice",
  humanSingleVsDualPreferenceAcceptance: "accepted",
  reason: "single_voice_strengthens_voxy_as_central_personality_and_is_preferred_as_default",
  evidencePreserved: true,
} as const;

export const VOXY_DUAL_VOICE_PILOT_SEGMENTS = [
  {
    id: "voxy-democracy-opening",
    speakerRole: "voxy",
    voiceId: VOXY_SIGNATURE.voiceId,
    text: "Hallo Nachbar.\n\nWir wählen.\nWir diskutieren.\nWir streiten.\n\nUnd trotzdem bleibt bei vielen Menschen\neine ziemlich einfache Frage:\n\nWird meine Stimme eigentlich gehört?",
  },
  {
    id: "voxy-headline-limits",
    speakerRole: "voxy",
    voiceId: VOXY_SIGNATURE.voiceId,
    text: "Aber wenn wir wissen wollen,\nwie es unserer Demokratie wirklich geht,\nreicht eine Schlagzeile nicht.",
  },
  {
    id: "editorial-democracy-dimensions",
    speakerRole: "editorial",
    voiceId: EDITORIAL_VOICE.voiceId,
    text: "Denn Vertrauen,\npolitische Beteiligung\nund das Gefühl, selbst etwas bewirken zu können,\nbeschreiben unterschiedliche Seiten derselben Demokratie.",
  },
  {
    id: "editorial-look-closer",
    speakerRole: "editorial",
    voiceId: EDITORIAL_VOICE.voiceId,
    text: "Ein einzelner Wert kann steigen,\nwährend ein anderer fällt.\n\nDas ist kein Widerspruch.\n\nEs bedeutet,\ndass wir genauer hinschauen müssen.",
  },
  {
    id: "voxy-distinction",
    speakerRole: "voxy",
    voiceId: VOXY_SIGNATURE.voiceId,
    text: "Genau deshalb trennen wir\nGefühl,\nBefund\nund offene Frage.",
  },
  {
    id: "editorial-open-questions",
    speakerRole: "editorial",
    voiceId: EDITORIAL_VOICE.voiceId,
    text: "Was wissen wir?\n\nWas spricht für eine Erklärung?\n\nWas spricht dagegen?\n\nUnd was wissen wir noch nicht?",
  },
  {
    id: "editorial-synthesis",
    speakerRole: "editorial",
    voiceId: EDITORIAL_VOICE.voiceId,
    text: "Erst zusammen entsteht ein Bild,\ndas mehr zeigt als eine einzelne Zahl\noder eine einzelne Meinung.",
  },
  {
    id: "voxy-democracy-reflection",
    speakerRole: "voxy",
    voiceId: VOXY_SIGNATURE.voiceId,
    text: "Vielleicht ist die spannendere Frage also nicht nur,\nob Demokratie funktioniert.\n\nSondern wo Menschen erleben,\ndass sie nicht mehr funktioniert.",
  },
  {
    id: "voxy-verifiability",
    speakerRole: "voxy",
    voiceId: VOXY_SIGNATURE.voiceId,
    text: "Du musst mir dabei nichts glauben.\n\nDu sollst es prüfen können.",
  },
] as const satisfies readonly {
  id: string;
  speakerRole: VoxySpeakerRole;
  voiceId: string;
  text: string;
}[];

export const VOXY_DUAL_VOICE_PILOT_CONTRACT = {
  taskId: "VOXY-DUAL-VOICE-EXPLAINER-PILOT-01",
  status: "review",
  implementationInCurrentPass: true,
  title: "Demokratie — Voice Preservation Pass v1.3",
  canonicalNarrationArchitecture: "single_voice_default",
  defaultNarrationVoice: VOXY_SIGNATURE.voiceId,
  defaultSpeakerRole: "voxy",
  optionalEditorialLayer: {
    voiceId: EDITORIAL_VOICE.voiceId,
    status: "accepted",
    explicitEditorialIntentRequired: true,
  },
  preservedAbEvidence: ["A_dual_voice_D1_W1", "B_single_voice_D1"],
  privateHumanReviewEvidence: true,
  format: { width: 1920, height: 1080, fps: 24, durationSeconds: { min: 45, max: 90 } },
  requiredOutputs: [
    "mp4",
    "webm",
    "wav_master_audio",
    "preview",
    "contact_sheet",
    "speaker-timeline.json",
    "visual-state-timeline.json",
    "evidence-timeline.json",
    "captions.de.vtt",
    "captions.de.srt",
    "manifest.json",
  ],
  speakerTimelineFields: ["start", "end", "speakerRole", "voiceId", "text"],
  requiredVisualSequence: ["host", "focus", "explain", "dock", "host"],
  finalSynthesisRequired: true,
  visualMaster: {
    ...VOXY_FIRST_PARTY_VISUAL_BINDING,
    characterRedesign: false,
    cameraBaseChanged: false,
    editorialAvatarRequired: false,
  },
  autonomousNewsProductionImplemented: false,
  productionEligible: false,
  autoPublish: false,
} as const;

export const VOXY_FUTURE_FORMAT_FAMILY = [
  "VOXY_NEWS",
  "VOXY_EXPLAINER",
  "VOXY_DOSSIER",
  "VOXY_BALLOT",
  "VOXY_SOCIAL_SHORT",
] as const;

export function validateVoxyDualVoiceArchitecture(): string[] {
  const errors: string[] = [];
  if (EDITORIAL_DOCUMENTARY_REFERENCE.id !== "candidate-a") errors.push("editorial_reference_drift");
  if (VOXY_SIGNATURE.speakerRole !== "voxy" || VOXY_SIGNATURE.candidateId !== "D1" || VOXY_SIGNATURE.humanIdentityStatus !== "accepted" || VOXY_SIGNATURE.selectedVariantId !== "d1-conversational-dynamic") errors.push("canonical_voxy_candidate_invalid");
  if (VOXY_SIGNATURE.provenance.canonicalReference.sha256 !== "ffd2dd8686f0d29c524174c57572a3c188da64d59a0a8451ae94cbb5252ae5bd" || VOXY_SIGNATURE.provenance.canonicalReference.segmentSha256 !== "72e1b6ce77bad94da04babd1d66c3c7401f89b42fe7ff8df2076ac076b713f09" || VOXY_SIGNATURE.provenance.synthesis.timeStretch || VOXY_SIGNATURE.provenance.synthesis.mastering !== VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION) errors.push("canonical_voxy_pipeline_invalid");
  if (EDITORIAL_VOICE.speakerRole !== "editorial" || EDITORIAL_VOICE.candidateId !== "W1" || EDITORIAL_VOICE.humanIdentityStatus !== "accepted" || EDITORIAL_VOICE.provenance.synthesis.timeCompression || EDITORIAL_VOICE.provenance.synthesis.mastering !== VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION) errors.push("canonical_editorial_candidate_invalid");
  if (VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.dynamicNormalization || VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.compression || VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.pitchChanged || VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.tempoChanged || VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.timeStretch || VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.eqApplied || !VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.staticGainPolicy.blanketRoleGainForbidden || VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.staticGainPolicy.mode !== "per_segment_relative_to_human_accepted_role_evidence" || !VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.staticGainPolicy.abstractLufsTargetForbidden || VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION.peakProtectionApplied) errors.push("human_accepted_voice_preservation_invalid");
  if (VOXY_DUAL_VOICE_ACCEPTANCE.humanNarrationArchitectureAcceptance !== "accepted" || VOXY_DUAL_VOICE_ACCEPTANCE.humanSingleVsDualPreference !== "single_voice" || VOXY_DUAL_VOICE_ACCEPTANCE.humanSingleVsDualPreferenceAcceptance !== "accepted" || VOXY_DUAL_VOICE_ACCEPTANCE.humanVoiceIdentityAcceptance !== "accepted" || VOXY_DUAL_VOICE_ACCEPTANCE.humanVoxyVoiceAcceptance !== "accepted" || VOXY_DUAL_VOICE_ACCEPTANCE.humanEditorialVoiceAcceptance !== "accepted" || VOXY_DUAL_VOICE_ACCEPTANCE.humanPilotAcceptance !== "pending") errors.push("human_voice_decision_not_recorded");
  if (VOXY_DUAL_VOICE_ACCEPTANCE.canonicalNarrationArchitecture !== "single_voice_default" || VOXY_DUAL_VOICE_ACCEPTANCE.canonicalVoxyVoice !== "D1 Conversational Dynamic" || VOXY_DUAL_VOICE_ACCEPTANCE.canonicalEditorialVoice !== "W1 Natural Editorial" || VOXY_DUAL_VOICE_ACCEPTANCE.genderLabelsAllowed || !VOXY_DUAL_VOICE_ACCEPTANCE.videoRenderingAllowed || VOXY_DUAL_VOICE_ACCEPTANCE.videoRenderingScope !== "private_pilot_v1.3_only") errors.push("human_voice_selection_gate_invalid");
  if (VOXY_CANONICAL_NARRATION_ARCHITECTURE.defaultNarrationVoice !== VOXY_SIGNATURE.voiceId || VOXY_CANONICAL_NARRATION_ARCHITECTURE.defaultSpeakerRole !== "voxy" || !VOXY_CANONICAL_NARRATION_ARCHITECTURE.visualStateAndSpeakerRoleIndependent || VOXY_CANONICAL_NARRATION_ARCHITECTURE.automaticSpeakerRoutingByVisualState || !VOXY_CANONICAL_NARRATION_ARCHITECTURE.editorialLayer.explicitEditorialIntentRequired || VOXY_CANONICAL_NARRATION_ARCHITECTURE.editorialLayer.status !== "accepted_optional_explicit_only") errors.push("canonical_narration_architecture_invalid");
  if (VOXY_CANONICAL_INFORMATION_FLOW.some((entry) => entry.speakerRole !== "voxy")) errors.push("default_visual_state_narration_must_use_voxy");
  for (const visualState of ["host", "focus", "explain", "dock", "synthesis"] as const) {
    const defaultBinding = resolveVoxyNarrationBinding({ visualState });
    if (defaultBinding.speakerRole !== "voxy" || defaultBinding.voiceId !== VOXY_SIGNATURE.voiceId) errors.push(`default_narration_binding_invalid:${visualState}`);
  }
  const explicitEditorialBinding = resolveVoxyNarrationBinding({ visualState: "explain", editorialIntent: "cross_information" });
  if (explicitEditorialBinding.speakerRole !== "editorial" || explicitEditorialBinding.voiceId !== EDITORIAL_VOICE.voiceId) errors.push("explicit_editorial_binding_invalid");
  if (VOXY_NARRATION_AB_EVIDENCE.technicalDualVoiceTest !== "passed" || VOXY_NARRATION_AB_EVIDENCE.technicalSingleVoiceTest !== "passed" || VOXY_NARRATION_AB_EVIDENCE.humanSingleVsDualPreference !== "single_voice" || VOXY_NARRATION_AB_EVIDENCE.humanSingleVsDualPreferenceAcceptance !== "accepted" || !VOXY_NARRATION_AB_EVIDENCE.evidencePreserved) errors.push("narration_ab_evidence_invalid");
  if (VOXY_DUAL_VOICE_PILOT_SEGMENTS.some((segment) => segment.speakerRole === "voxy" && segment.voiceId !== VOXY_SIGNATURE.voiceId)) errors.push("voxy_voice_selection_implicit_or_invalid");
  if (VOXY_DUAL_VOICE_PILOT_SEGMENTS.some((segment) => segment.speakerRole === "editorial" && segment.voiceId !== EDITORIAL_VOICE.voiceId)) errors.push("editorial_voice_selection_implicit_or_invalid");
  if (!/^Hallo Nachbar[,.]\n/.test(VOXY_DUAL_VOICE_PILOT_SEGMENTS[0].text) || VOXY_DUAL_VOICE_PILOT_SEGMENTS.slice(1).some((segment) => /Hallo Nachbar[,.]/.test(segment.text))) errors.push("direct_address_greeting_invalid");
  if (VOXY_DIRECT_ADDRESS_GREETING.editorialUsesGreeting || VOXY_DIRECT_ADDRESS_GREETING.brandNarrativeException) errors.push("direct_address_greeting_role_or_canon_invalid");
  if (VOXY_SPEAKER_ROLE_RULES.editorial.voxyMouth !== "neutral_or_closed_no_editorial_lip_sync") errors.push("editorial_voxy_lip_sync_forbidden");
  if (VOXY_SPEAKER_ROLE_RULES.waveform.count !== 1 || VOXY_SPEAKER_ROLE_RULES.waveform.speakerChangeCreatesSecondWaveform) errors.push("single_waveform_contract_failed");
  if (VOXY_NEWS_VISUAL_STATES.map((state) => state.id).join(",") !== "host,focus,explain,dock,synthesis") errors.push("visual_state_grammar_drift");
  if (VOXY_DYNAMIC_EVIDENCE_MEMORY.staticSidebar || !VOXY_DYNAMIC_EVIDENCE_MEMORY.previouslyDockedObjectsMayReturnToFocus) errors.push("dynamic_evidence_memory_invalid");
  if (VOXY_SOURCE_FIRST_PRIORITY[0] !== "original_source_or_original_data" || VOXY_SOURCE_FIRST_GUARDRAILS.inventedCharts || VOXY_SOURCE_FIRST_GUARDRAILS.decorativeFakeData) errors.push("source_first_contract_failed");
  if (VOXY_DUAL_VOICE_PILOT_CONTRACT.requiredVisualSequence.join(",") !== "host,focus,explain,dock,host" || !VOXY_DUAL_VOICE_PILOT_CONTRACT.finalSynthesisRequired) errors.push("pilot_visual_grammar_incomplete");
  if (VOXY_DUAL_VOICE_PILOT_CONTRACT.canonicalNarrationArchitecture !== "single_voice_default" || VOXY_DUAL_VOICE_PILOT_CONTRACT.defaultNarrationVoice !== VOXY_SIGNATURE.voiceId || VOXY_DUAL_VOICE_PILOT_CONTRACT.defaultSpeakerRole !== "voxy" || VOXY_DUAL_VOICE_PILOT_CONTRACT.optionalEditorialLayer.status !== "accepted" || !VOXY_DUAL_VOICE_PILOT_CONTRACT.optionalEditorialLayer.explicitEditorialIntentRequired || VOXY_DUAL_VOICE_PILOT_CONTRACT.preservedAbEvidence.length !== 2) errors.push("pilot_narration_contract_invalid");
  if (!VOXY_DUAL_VOICE_PILOT_CONTRACT.implementationInCurrentPass || VOXY_DUAL_VOICE_PILOT_CONTRACT.autonomousNewsProductionImplemented) errors.push("pilot_implementation_or_scope_invalid");
  if (VOXY_DUAL_VOICE_PILOT_CONTRACT.productionEligible || VOXY_DUAL_VOICE_PILOT_CONTRACT.autoPublish) errors.push("release_must_remain_blocked");
  return errors;
}
