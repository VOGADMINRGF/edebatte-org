import {
  EDITORIAL_VOICE,
  VOXY_CANONICAL_NARRATION_ARCHITECTURE,
  VOXY_DUAL_VOICE_PILOT_SEGMENTS,
  VOXY_NARRATION_AB_EVIDENCE,
  VOXY_SIGNATURE,
  type VoxySpeakerRole,
} from "./dualVoiceArchitecture";
import { VOXY_FIRST_PARTY_VISUAL_BINDING } from "./firstPartyVoiceClone";

export const VOXY_DUAL_VOICE_PILOT_SCHEMA_VERSION =
  "voxy-dual-voice-explainer-pilot-v1.3" as const;

export const VOXY_DUAL_VOICE_PILOT_OUTPUT = {
  directory: "artifacts/voxy-dual-voice-explainer-pilot-01/v1.3",
  mp4: "voxy-democracy-pilot-v1.3.mp4",
  webm: "voxy-democracy-pilot-v1.3.webm",
  masterAudio: "master-audio.wav",
  captionsVtt: "captions.de.vtt",
  captionsSrt: "captions.de.srt",
  preview: "preview.png",
  contactSheet: "contact-sheet.png",
  speakerTimeline: "speaker-timeline.json",
  visualStateTimeline: "visual-state-timeline.json",
  evidenceTimeline: "evidence-timeline.json",
  audioPreservation: "audio-preservation.json",
  manifest: "manifest.json",
  width: 1920,
  height: 1080,
  fps: 24,
  durationSeconds: { min: 45, max: 90 },
} as const;

export const VOXY_SINGLE_VOICE_REVIEW_SCHEMA_VERSION =
  "voxy-single-voice-human-ab-test-v1.3" as const;

export const VOXY_SINGLE_VOICE_REVIEW_OUTPUT = {
  ...VOXY_DUAL_VOICE_PILOT_OUTPUT,
  directory: "artifacts/voxy-dual-voice-explainer-pilot-01/v1.3-single-voice",
  mp4: "voxy-democracy-pilot-v1.3-single-voice.mp4",
  webm: "voxy-democracy-pilot-v1.3-single-voice.webm",
  comparisonNotes: "ab-comparison-notes.md",
} as const;

export const VOXY_FINAL_LAYOUT_SCHEMA_VERSION =
  "voxy-single-voice-final-layout-v1.4" as const;

export const VOXY_FINAL_LAYOUT_VOG_PIN_PATH =
  "apps/web/public/brands/voxy/overlays/vog-pin.svg" as const;

export const VOXY_FINAL_LAYOUT_OUTPUT = {
  ...VOXY_SINGLE_VOICE_REVIEW_OUTPUT,
  directory: "artifacts/voxy-dual-voice-explainer-pilot-01/v1.4-final-layout",
  mp4: "voxy-democracy-pilot-v1.4-final-layout.mp4",
  webm: "voxy-democracy-pilot-v1.4-final-layout.webm",
  lowerThirdTimeline: "lower-third-timeline.json",
} as const;

export type VoxyDualVoicePilotVisualState =
  | "HOST"
  | "FOCUS"
  | "EXPLAIN"
  | "DOCK"
  | "SYNTHESIS";

export type VoxyDualVoicePilotSpeakerEntry = Readonly<{
  id: string;
  start: number;
  end: number;
  speakerRole: VoxySpeakerRole;
  voiceId: string;
  text: string;
}>;

export type VoxyDualVoicePilotVisualEntry = Readonly<{
  start: number;
  end: number;
  state: VoxyDualVoicePilotVisualState;
  activeEvidenceId: string | null;
  dockedEvidenceIds: readonly string[];
}>;

export type VoxyBroadcastMeta = Readonly<{
  topicLabel: string;
  topicTitle: string;
  displayDate: string | null;
  kicker: string;
  headline: string;
  summary: string;
}>;

export type VoxyPilotEvidence = Readonly<{
  id: string;
  type: string;
  title: string;
  shortSummary: string;
  sourceLabel?: string;
  provenance: string;
  visualIdentity: string;
  visualPayload: Readonly<{
    kind: "trend_line" | "bar_series" | "open_question";
    values?: readonly number[];
  }>;
  memoryPriority: number;
}>;

export type VoxyLowerThirdEntry = Readonly<{
  id: string;
  kicker: string;
  headline: string;
  summary: string;
  validFrom: number;
  validUntil: number;
  transitionMs: number;
  transition: "soft_translate_fade";
  minimumDwellSeconds: number;
  wordByWordAnimation: false;
  blinking: false;
  captionMirror: false;
}>;

export const VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS = {
  voxy: {
    speakerRole: "voxy",
    candidateId: "D1",
    voiceId: VOXY_SIGNATURE.voiceId,
    variant: "d1-conversational-dynamic",
    humanIdentityStatus: "accepted",
    synthesisBackend: "chatterbox_multilingual_first_party",
  },
  editorial: {
    speakerRole: "editorial",
    candidateId: "W1",
    voiceId: EDITORIAL_VOICE.voiceId,
    variant: "w1-natural-editorial",
    humanIdentityStatus: "accepted",
    synthesisBackend: "mimic3_m_ailabs_ramona_deininger",
  },
} as const;

export const VOXY_DUAL_VOICE_PILOT_EVIDENCE = [
  {
    id: "democracy-trust",
    type: "DEMO — VERTRAUEN",
    title: "Vertrauen im Zeitverlauf",
    shortSummary: "Vertrauen verändert sich unabhängig von anderen Demokratie-Indikatoren.",
    sourceLabel: "Illustrativer Verlauf",
    provenance: "DEMO / ILLUSTRATION",
    visualIdentity: "trust-cyan-continuous-line",
    visualPayload: { kind: "trend_line" },
    memoryPriority: 90,
  },
  {
    id: "democracy-participation",
    type: "DEMO — BETEILIGUNG",
    title: "Beteiligung als eigener Indikator",
    shortSummary: "Politische Beteiligung folgt einem eigenen Muster.",
    sourceLabel: "Illustrativer Indikator",
    provenance: "DEMO / ILLUSTRATION",
    visualIdentity: "participation-blue-stepped-bars",
    visualPayload: { kind: "bar_series", values: [0.42, 0.67, 0.51, 0.78, 0.59, 0.71] },
    memoryPriority: 80,
  },
  {
    id: "democracy-open-question",
    type: "OFFENE FRAGE",
    title: "Fühlen sich Menschen politisch wirksam?",
    shortSummary: "Die politische Wirksamkeit bleibt als offene Frage sichtbar.",
    provenance: "DEMO / ILLUSTRATION",
    visualIdentity: "open-question-amber-ring",
    visualPayload: { kind: "open_question" },
    memoryPriority: 100,
  },
] as const satisfies readonly VoxyPilotEvidence[];

export function buildVoxyDemocracyBroadcastMeta(displayDate: string | null): VoxyBroadcastMeta {
  return {
    topicLabel: "THEMA",
    topicTitle: "Demokratie & politische Wirksamkeit",
    displayDate,
    kicker: "HEUTE IM FOKUS",
    headline: "Wie erleben Menschen demokratische Wirksamkeit?",
    summary: "Vertrauen, Beteiligung und politische Wirksamkeit zeigen unterschiedliche Seiten derselben Demokratie.",
  };
}

const PAUSE_AFTER_MS: Readonly<Record<string, number>> = {
  "voxy-democracy-opening": 420,
  "voxy-headline-limits": 240,
  "editorial-democracy-dimensions": 260,
  "editorial-look-closer": 360,
  "voxy-distinction": 280,
  "editorial-open-questions": 320,
  "editorial-synthesis": 340,
  "voxy-democracy-reflection": 520,
  "voxy-verifiability": 0,
};

export const VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS =
  VOXY_DUAL_VOICE_PILOT_SEGMENTS.map((segment) => ({
    ...segment,
    spokenText: segment.text.replaceAll("Voxy", "Woxi"),
    pauseAfterMs: PAUSE_AFTER_MS[segment.id] ?? 0,
    voiceBinding: VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS[segment.speakerRole],
  }));

export const VOXY_SINGLE_VOICE_REVIEW_AUDIO_SEGMENTS =
  VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS.map((segment) => ({
    ...segment,
    speakerRole: "voxy" as const,
    voiceId: VOXY_SIGNATURE.voiceId,
    voiceBinding: VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS.voxy,
    originalSpeakerRole: segment.speakerRole,
  }));

export const VOXY_CANONICAL_NARRATION_AUDIO_SEGMENTS =
  VOXY_SINGLE_VOICE_REVIEW_AUDIO_SEGMENTS;

const roundSeconds = (milliseconds: number): number =>
  Number((milliseconds / 1_000).toFixed(3));

export function assertVoxyPilotVoiceBinding(input: {
  speakerRole: VoxySpeakerRole;
  voiceId: string;
}) {
  const binding = VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS[input.speakerRole];
  if (input.voiceId !== binding.voiceId) {
    throw new Error(`voice_mapping_fail_closed:${input.speakerRole}`);
  }
  return binding;
}

function captionTime(seconds: number, separator: "." | ","): string {
  const milliseconds = Math.round(seconds * 1_000);
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1_000);
  const ms = milliseconds % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}${separator}${String(ms).padStart(3, "0")}`;
}

export function buildVoxyDualVoicePilotVtt(
  timeline: readonly VoxyDualVoicePilotSpeakerEntry[],
): string {
  return `WEBVTT\n\n${timeline.map((entry) => `${captionTime(entry.start, ".")} --> ${captionTime(entry.end, ".")}\n<v ${entry.speakerRole === "voxy" ? "Voxy" : "Editorial"}>${entry.text.replaceAll("\n", " ")}</v>`).join("\n\n")}\n`;
}

export function buildVoxyDualVoicePilotSrt(
  timeline: readonly VoxyDualVoicePilotSpeakerEntry[],
): string {
  return `${timeline.map((entry, index) => `${index + 1}\n${captionTime(entry.start, ",")} --> ${captionTime(entry.end, ",")}\n[${entry.speakerRole === "voxy" ? "Voxy" : "Editorial"}] ${entry.text.replaceAll("\n", " ")}`).join("\n\n")}\n`;
}

export function buildVoxyDualVoicePilotPlan(
  exactHeadSha: string,
  speechDurationsMs: readonly number[],
) {
  if (speechDurationsMs.length !== VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS.length) {
    throw new Error("speech_duration_count_mismatch");
  }

  let cursorMs = 600;
  const speakerTimeline: VoxyDualVoicePilotSpeakerEntry[] =
    VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS.map((segment, index) => {
      assertVoxyPilotVoiceBinding(segment);
      const startMs = cursorMs;
      const endMs = startMs + speechDurationsMs[index]!;
      cursorMs = endMs + segment.pauseAfterMs;
      return {
        id: segment.id,
        start: roundSeconds(startMs),
        end: roundSeconds(endMs),
        speakerRole: segment.speakerRole,
        voiceId: segment.voiceId,
        text: segment.text,
      };
    });

  const totalDurationMs = cursorMs + 800;
  const [opening, headline, dimensions, closer, distinction, questions, synthesisVoice, reflection] =
    speakerTimeline;
  const firstFocusStart = Number(Math.max(opening!.end, headline!.end - 1.35).toFixed(3));
  const firstDockStart = Number(Math.max(closer!.start + 1, closer!.end - 1.7).toFixed(3));
  const secondFocusStart = Number(Math.max(distinction!.start, distinction!.end - 1.25).toFixed(3));
  const secondDockStart = Number(Math.max(questions!.start + 1, questions!.end - 1.55).toFixed(3));
  const finalEnd = roundSeconds(totalDurationMs);

  const visualStateTimeline: VoxyDualVoicePilotVisualEntry[] = [
    { start: 0, end: firstFocusStart, state: "HOST", activeEvidenceId: null, dockedEvidenceIds: [] },
    { start: firstFocusStart, end: dimensions!.start, state: "FOCUS", activeEvidenceId: "democracy-trust", dockedEvidenceIds: [] },
    { start: dimensions!.start, end: firstDockStart, state: "EXPLAIN", activeEvidenceId: "democracy-trust", dockedEvidenceIds: [] },
    { start: firstDockStart, end: closer!.end, state: "DOCK", activeEvidenceId: "democracy-trust", dockedEvidenceIds: ["democracy-trust"] },
    { start: closer!.end, end: secondFocusStart, state: "HOST", activeEvidenceId: null, dockedEvidenceIds: ["democracy-trust"] },
    { start: secondFocusStart, end: questions!.start, state: "FOCUS", activeEvidenceId: "democracy-participation", dockedEvidenceIds: ["democracy-trust"] },
    { start: questions!.start, end: secondDockStart, state: "EXPLAIN", activeEvidenceId: "democracy-participation", dockedEvidenceIds: ["democracy-trust"] },
    { start: secondDockStart, end: questions!.end, state: "DOCK", activeEvidenceId: "democracy-participation", dockedEvidenceIds: ["democracy-trust", "democracy-participation"] },
    { start: questions!.end, end: reflection!.start, state: "SYNTHESIS", activeEvidenceId: "democracy-open-question", dockedEvidenceIds: ["democracy-trust", "democracy-participation"] },
    { start: reflection!.start, end: finalEnd, state: "HOST", activeEvidenceId: null, dockedEvidenceIds: ["democracy-trust", "democracy-participation", "democracy-open-question"] },
  ];

  const evidenceTimeline = [
    { evidenceId: "democracy-trust", start: firstFocusStart, end: dimensions!.start, action: "focus", visualIdentity: "trust-cyan-continuous-line" },
    { evidenceId: "democracy-trust", start: dimensions!.start, end: firstDockStart, action: "explain", visualIdentity: "trust-cyan-continuous-line" },
    { evidenceId: "democracy-trust", start: firstDockStart, end: closer!.end, action: "continuous_scale_translation_to_memory", visualIdentity: "trust-cyan-continuous-line" },
    { evidenceId: "democracy-participation", start: secondFocusStart, end: questions!.start, action: "focus", visualIdentity: "participation-blue-stepped-bars" },
    { evidenceId: "democracy-participation", start: questions!.start, end: secondDockStart, action: "explain", visualIdentity: "participation-blue-stepped-bars" },
    { evidenceId: "democracy-participation", start: secondDockStart, end: questions!.end, action: "continuous_scale_translation_to_memory", visualIdentity: "participation-blue-stepped-bars" },
    { evidenceId: "democracy-open-question", start: questions!.end, end: synthesisVoice!.end, action: "derived_from_previously_docked_evidence", visualIdentity: "open-question-amber-ring", relatedEvidenceIds: ["democracy-trust", "democracy-participation"] },
  ] as const;

  return {
    schemaVersion: VOXY_DUAL_VOICE_PILOT_SCHEMA_VERSION,
    exactHeadSha,
    visualMasterHeadSha: VOXY_FIRST_PARTY_VISUAL_BINDING.visualMasterHeadSha,
    output: {
      ...VOXY_DUAL_VOICE_PILOT_OUTPUT,
      durationMs: totalDurationMs,
      frameCount: Math.ceil((totalDurationMs * VOXY_DUAL_VOICE_PILOT_OUTPUT.fps) / 1_000),
    },
    speakerTimeline,
    visualStateTimeline,
    evidenceTimeline,
    evidence: VOXY_DUAL_VOICE_PILOT_EVIDENCE,
    voiceBindings: VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS,
    captions: { sidecarsOnly: true, burnedIn: false, languages: ["de"] },
    objectContinuity: {
      sameEvidenceId: true,
      sameVisualIdentity: true,
      scaleAndTranslation: true,
      hardSubstitution: false,
      crossfadeToDifferentObject: false,
    },
    mouth: {
      profile: VOXY_FIRST_PARTY_VISUAL_BINDING.mouthProfile,
      shapesChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      syncSpeakerRole: "voxy",
      editorialMouth: "neutral_or_closed",
    },
    waveform: { count: 1, reactsToActiveVoice: true, secondWaveform: false },
    privacy: {
      privateRawVoiceInRepository: false,
      privateReferencePathInManifest: false,
      publicArtifact: false,
      upload: false,
    },
    evidenceVariant: "A",
    narrationArchitecture: "dual_voice_ab_evidence",
    technicalDualVoiceTest: "passed",
    canonicalNarrationArchitecture: "single_voice_default",
    humanSingleVsDualPreference: "single_voice",
    humanSingleVsDualPreferenceAcceptance: "accepted",
    technicalPilotGate: "passed",
    technicalVoiceMappingGate: "passed",
    humanPilotAcceptance: "pending",
    humanVoiceAcceptance: "accepted",
    humanVoxyVoiceAcceptance: "accepted",
    humanEditorialVoiceAcceptance: "accepted",
    humanNews5VisualAcceptance: "pending",
    canonicalVoxyVoice: "D1 Conversational Dynamic",
    canonicalEditorialVoice: "W1 Natural Editorial",
    genderLabelsAllowed: false,
    videoRenderingAllowed: true,
    productionEligible: false,
    autoPublish: false,
  } as const;
}

export type VoxyDualVoicePilotPlan = ReturnType<typeof buildVoxyDualVoicePilotPlan>;

export function buildVoxySingleVoiceReviewPlan(
  exactHeadSha: string,
  speechDurationsMs: readonly number[],
) {
  const dualDerivedPlan = buildVoxyDualVoicePilotPlan(exactHeadSha, speechDurationsMs);
  return {
    ...dualDerivedPlan,
    schemaVersion: VOXY_SINGLE_VOICE_REVIEW_SCHEMA_VERSION,
    reviewVariant: "single_voice_human_ab_test",
    evidenceVariant: "B",
    dualVoiceBaseline: "v1.3",
    output: {
      ...VOXY_SINGLE_VOICE_REVIEW_OUTPUT,
      durationMs: dualDerivedPlan.output.durationMs,
      frameCount: dualDerivedPlan.output.frameCount,
    },
    speakerTimeline: dualDerivedPlan.speakerTimeline.map((entry) => ({
      ...entry,
      speakerRole: "voxy" as const,
      voiceId: VOXY_SIGNATURE.voiceId,
    })),
    activeVoiceBindings: {
      voxy: VOXY_DUAL_VOICE_PILOT_VOICE_BINDINGS.voxy,
    },
    abEvidencePreserved: true,
    canonicalNarrationArchitecture:
      VOXY_CANONICAL_NARRATION_ARCHITECTURE.canonicalNarrationArchitecture,
    defaultNarrationVoice:
      VOXY_CANONICAL_NARRATION_ARCHITECTURE.defaultNarrationVoice,
    optionalEditorialLayer: "W1 Natural Editorial / accepted",
    mouth: {
      ...dualDerivedPlan.mouth,
      activeForEverySpokenSegment: true,
      editorialMouth: "not_applicable_single_voice_review",
    },
    technicalDualVoiceTest: VOXY_NARRATION_AB_EVIDENCE.technicalDualVoiceTest,
    technicalSingleVoiceTest: "passed",
    humanSingleVsDualPreference: "single_voice",
    humanSingleVsDualPreferenceAcceptance: "accepted",
    humanNarrationArchitectureAcceptance: "accepted",
    humanPreferenceReason: VOXY_NARRATION_AB_EVIDENCE.reason,
  } as const;
}

export type VoxySingleVoiceReviewPlan = ReturnType<typeof buildVoxySingleVoiceReviewPlan>;
export const buildVoxyCanonicalNarrationPlan = buildVoxySingleVoiceReviewPlan;

function lowerThirdEntry(input: Omit<VoxyLowerThirdEntry, "transitionMs" | "transition" | "minimumDwellSeconds" | "wordByWordAnimation" | "blinking" | "captionMirror">): VoxyLowerThirdEntry {
  return {
    ...input,
    transitionMs: 360,
    transition: "soft_translate_fade",
    minimumDwellSeconds: Math.min(3, input.validUntil - input.validFrom),
    wordByWordAnimation: false,
    blinking: false,
    captionMirror: false,
  };
}

export function buildVoxyFinalLayoutPlan(
  exactHeadSha: string,
  speechDurationsMs: readonly number[],
  broadcastMeta: VoxyBroadcastMeta,
) {
  const canonicalPlan = buildVoxySingleVoiceReviewPlan(exactHeadSha, speechDurationsMs);
  const states = canonicalPlan.visualStateTimeline;
  const lowerThirdTimeline = [
    lowerThirdEntry({
      id: "democracy-overview",
      kicker: broadcastMeta.kicker,
      headline: broadcastMeta.headline,
      summary: broadcastMeta.summary,
      validFrom: 0,
      validUntil: states[1]!.start,
    }),
    lowerThirdEntry({
      id: "trust-focus",
      kicker: "EVIDENCE IM FOKUS",
      headline: "Vertrauen ist nur eine Seite des Bildes",
      summary: "Ein einzelner Verlauf erklärt noch nicht, wie Menschen Demokratie insgesamt erleben.",
      validFrom: states[1]!.start,
      validUntil: states[4]!.start,
    }),
    lowerThirdEntry({
      id: "evidence-distinction",
      kicker: "ZWISCHENSTAND",
      headline: "Gefühl, Befund und offene Frage trennen",
      summary: "Erklärungen werden belastbarer, wenn unterschiedliche Ebenen sichtbar bleiben.",
      validFrom: states[4]!.start,
      validUntil: states[5]!.start,
    }),
    lowerThirdEntry({
      id: "participation-focus",
      kicker: "ZWEITE PERSPEKTIVE",
      headline: "Beteiligung folgt einem eigenen Muster",
      summary: "Mehrere Indikatoren können gleichzeitig unterschiedliche Entwicklungen zeigen.",
      validFrom: states[5]!.start,
      validUntil: states[8]!.start,
    }),
    lowerThirdEntry({
      id: "evidence-synthesis",
      kicker: "ZUSAMMENFÜHRUNG",
      headline: "Erst die Beziehung ergibt ein Bild",
      summary: "Vertrauen und Beteiligung führen gemeinsam zur Frage nach politischer Wirksamkeit.",
      validFrom: states[8]!.start,
      validUntil: states[9]!.start,
    }),
    lowerThirdEntry({
      id: "democracy-reflection",
      kicker: "OFFENE FRAGE",
      headline: "Wo erleben Menschen, dass Demokratie nicht funktioniert?",
      summary: "Die Evidenz bleibt prüfbar – die eigene Einordnung bleibt bei den Menschen.",
      validFrom: states[9]!.start,
      validUntil: canonicalPlan.output.durationMs / 1_000,
    }),
  ] as const;

  return {
    ...canonicalPlan,
    schemaVersion: VOXY_FINAL_LAYOUT_SCHEMA_VERSION,
    reviewVariant: "single_voice_final_layout_human_review",
    output: {
      ...VOXY_FINAL_LAYOUT_OUTPUT,
      durationMs: canonicalPlan.output.durationMs,
      frameCount: canonicalPlan.output.frameCount,
    },
    broadcastMeta,
    evidence: VOXY_DUAL_VOICE_PILOT_EVIDENCE,
    lowerThirdTimeline,
    broadcastLayout: {
      stableGrid: true,
      hostZone: "center_left",
      topicDateZone: "top_right",
      jacketBranding: {
        lapelPin: "VOG",
        pocketMark: "eDebatte",
        pocketMarkCount: 1,
      },
      memoryAnchor: { top: true, right: true, bottom: false, safeMarginPx: 56 },
      focusDockDestination: "upper_right_memory_slot",
      lowerThird: {
        persistent: true,
        avoidsEvidenceColumn: true,
        semanticEditorialCondensation: true,
        captionMirror: false,
      },
      dynamicEvidence: {
        dataDriven: true,
        maximumFullCards: 3,
        overflowBehavior: "compact_older_by_priority_and_recency",
        fixedEvidenceCount: false,
      },
      textMotion: {
        blinking: false,
        flashing: false,
        typewriter: false,
        wordByWordReveal: false,
        transitionMs: 360,
      },
    },
    sourceSingleVoiceArtifact: "voxy-democracy-pilot-v1-3-single-voice-e6363026303b",
    sourceAudioSha256: "6e3182db9d7fc01d0cdcb69c625f6a8457b494518f884cdfc29f449323e0f09d",
    audioReusedWithoutModification: true,
    voiceSynthesisPerformed: false,
    humanPilotAcceptance: "pending_final_layout_review",
    humanNews5VisualAcceptance: "pending_final_layout_review",
    productionEligible: false,
    autoPublish: false,
  } as const;
}

export type VoxyFinalLayoutPlan = ReturnType<typeof buildVoxyFinalLayoutPlan>;
export type VoxyExplainerPilotPlan = VoxyDualVoicePilotPlan | VoxySingleVoiceReviewPlan | VoxyFinalLayoutPlan;

export function lowerThirdAt(plan: VoxyFinalLayoutPlan, atSeconds: number): VoxyLowerThirdEntry {
  return plan.lowerThirdTimeline.find((entry) => atSeconds >= entry.validFrom && atSeconds < entry.validUntil)
    ?? plan.lowerThirdTimeline.at(-1)!;
}

export function validateVoxyFinalLayoutPlan(plan: VoxyFinalLayoutPlan): string[] {
  const errors = validateVoxySingleVoiceReviewPlan(
    plan as unknown as VoxySingleVoiceReviewPlan,
  ).filter(
    (error) => error !== "ab_evidence_scope_invalid",
  );
  if (plan.schemaVersion !== VOXY_FINAL_LAYOUT_SCHEMA_VERSION || plan.reviewVariant !== "single_voice_final_layout_human_review") errors.push("final_layout_schema_invalid");
  if (!plan.speakerTimeline.every((entry) => entry.speakerRole === "voxy" && entry.voiceId === VOXY_SIGNATURE.voiceId)) errors.push("final_layout_single_d1_gate_invalid");
  if (!plan.broadcastMeta.topicLabel || !plan.broadcastMeta.topicTitle || !plan.broadcastMeta.kicker || !plan.broadcastMeta.headline || !plan.broadcastMeta.summary) errors.push("broadcast_content_model_incomplete");
  if (plan.broadcastLayout.jacketBranding.lapelPin !== "VOG" || plan.broadcastLayout.jacketBranding.pocketMark !== "eDebatte" || plan.broadcastLayout.jacketBranding.pocketMarkCount !== 1) errors.push("jacket_branding_invalid");
  if (!plan.broadcastLayout.memoryAnchor.top || !plan.broadcastLayout.memoryAnchor.right || plan.broadcastLayout.memoryAnchor.bottom) errors.push("memory_anchor_invalid");
  if (plan.broadcastLayout.focusDockDestination !== "upper_right_memory_slot" || !plan.broadcastLayout.dynamicEvidence.dataDriven || plan.broadcastLayout.dynamicEvidence.fixedEvidenceCount) errors.push("dynamic_memory_contract_invalid");
  if (!plan.broadcastLayout.lowerThird.persistent || !plan.broadcastLayout.lowerThird.avoidsEvidenceColumn || plan.broadcastLayout.lowerThird.captionMirror) errors.push("lower_third_layout_invalid");
  if (plan.broadcastLayout.textMotion.blinking || plan.broadcastLayout.textMotion.flashing || plan.broadcastLayout.textMotion.typewriter || plan.broadcastLayout.textMotion.wordByWordReveal) errors.push("forbidden_text_motion_enabled");
  if (plan.lowerThirdTimeline.some((entry) => entry.blinking || entry.wordByWordAnimation || entry.captionMirror || entry.transitionMs < 250 || entry.transitionMs > 450 || entry.validUntil <= entry.validFrom)) errors.push("lower_third_timeline_invalid");
  if (plan.lowerThirdTimeline.some((entry) => entry.validUntil - entry.validFrom < entry.minimumDwellSeconds)) errors.push("lower_third_dwell_invalid");
  if (plan.captions.burnedIn || !plan.captions.sidecarsOnly || !plan.audioReusedWithoutModification || plan.voiceSynthesisPerformed || plan.sourceAudioSha256 !== "6e3182db9d7fc01d0cdcb69c625f6a8457b494518f884cdfc29f449323e0f09d") errors.push("audio_or_caption_preservation_invalid");
  if (plan.humanPilotAcceptance !== "pending_final_layout_review" || plan.humanNews5VisualAcceptance !== "pending_final_layout_review" || plan.productionEligible || plan.autoPublish) errors.push("final_layout_release_gate_invalid");
  return [...new Set(errors)];
}

export function validateVoxySingleVoiceReviewPlan(plan: VoxySingleVoiceReviewPlan): string[] {
  const errors: string[] = [];
  const durationSeconds = plan.output.durationMs / 1_000;
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) errors.push("exact_head_invalid");
  if (plan.output.width !== 1920 || plan.output.height !== 1080 || plan.output.fps !== 24 || durationSeconds < 45 || durationSeconds > 90) errors.push("media_contract_invalid");
  if (plan.reviewVariant !== "single_voice_human_ab_test" || plan.evidenceVariant !== "B" || plan.dualVoiceBaseline !== "v1.3" || !plan.abEvidencePreserved) errors.push("ab_evidence_scope_invalid");
  if (plan.canonicalNarrationArchitecture !== "single_voice_default" || plan.defaultNarrationVoice !== VOXY_SIGNATURE.voiceId || plan.humanNarrationArchitectureAcceptance !== "accepted") errors.push("canonical_narration_default_invalid");
  if (plan.speakerTimeline.length !== VOXY_SINGLE_VOICE_REVIEW_AUDIO_SEGMENTS.length || plan.speakerTimeline.some((entry) => entry.start >= entry.end)) errors.push("speaker_timeline_invalid");
  if (plan.speakerTimeline.some((entry) => entry.speakerRole !== "voxy" || entry.voiceId !== VOXY_SIGNATURE.voiceId)) errors.push("single_d1_voice_gate_invalid");
  if (plan.speakerTimeline.map((entry) => entry.text).join("\n") !== VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS.map((entry) => entry.text).join("\n")) errors.push("ab_script_changed");
  if (plan.visualStateTimeline.map((entry) => entry.state).join(",") !== "HOST,FOCUS,EXPLAIN,DOCK,HOST,FOCUS,EXPLAIN,DOCK,SYNTHESIS,HOST") errors.push("news_5_sequence_invalid");
  if (!plan.objectContinuity.sameEvidenceId || !plan.objectContinuity.sameVisualIdentity || !plan.objectContinuity.scaleAndTranslation || plan.objectContinuity.hardSubstitution || plan.objectContinuity.crossfadeToDifferentObject) errors.push("object_continuity_invalid");
  if (plan.waveform.count !== 1 || plan.waveform.secondWaveform || !plan.waveform.reactsToActiveVoice) errors.push("single_waveform_contract_invalid");
  if (plan.mouth.syncSpeakerRole !== "voxy" || !plan.mouth.activeForEverySpokenSegment || plan.mouth.shapesChanged || plan.mouth.anchorChanged || plan.mouth.pivotChanged) errors.push("single_voice_mouth_contract_invalid");
  if (plan.activeVoiceBindings.voxy.candidateId !== "D1" || plan.activeVoiceBindings.voxy.voiceId !== VOXY_SIGNATURE.voiceId || Object.keys(plan.activeVoiceBindings).length !== 1) errors.push("active_voice_binding_invalid");
  if (plan.canonicalVoxyVoice !== "D1 Conversational Dynamic" || plan.canonicalEditorialVoice !== "W1 Natural Editorial" || plan.humanVoxyVoiceAcceptance !== "accepted" || plan.humanEditorialVoiceAcceptance !== "accepted") errors.push("canonical_voice_acceptance_changed");
  if (plan.technicalDualVoiceTest !== "passed" || plan.technicalSingleVoiceTest !== "passed" || plan.humanSingleVsDualPreference !== "single_voice" || plan.humanSingleVsDualPreferenceAcceptance !== "accepted" || plan.productionEligible || plan.autoPublish || plan.privacy.publicArtifact || plan.privacy.upload) errors.push("review_release_gate_invalid");
  return errors;
}

export function validateVoxyDualVoicePilotPlan(plan: VoxyDualVoicePilotPlan): string[] {
  const errors: string[] = [];
  const durationSeconds = plan.output.durationMs / 1_000;
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) errors.push("exact_head_invalid");
  if (plan.output.width !== 1920 || plan.output.height !== 1080 || plan.output.fps !== 24 || durationSeconds < 45 || durationSeconds > 90) errors.push("media_contract_invalid");
  if (plan.speakerTimeline.length !== VOXY_DUAL_VOICE_PILOT_AUDIO_SEGMENTS.length) errors.push("speaker_block_count_invalid");
  if (plan.speakerTimeline.some((entry) => entry.start >= entry.end)) errors.push("speaker_timeline_order_invalid");
  if (!plan.speakerTimeline.some((entry) => entry.speakerRole === "voxy") || !plan.speakerTimeline.some((entry) => entry.speakerRole === "editorial")) errors.push("both_speaker_roles_required");
  if (plan.speakerTimeline.some((entry) => entry.speakerRole === "voxy" && entry.voiceId !== VOXY_SIGNATURE.voiceId)) errors.push("voxy_voice_invalid");
  if (plan.speakerTimeline.some((entry) => entry.speakerRole === "editorial" && entry.voiceId !== EDITORIAL_VOICE.voiceId)) errors.push("editorial_voice_invalid");
  if (plan.evidenceVariant !== "A" || plan.narrationArchitecture !== "dual_voice_ab_evidence" || plan.technicalDualVoiceTest !== "passed" || plan.canonicalNarrationArchitecture !== "single_voice_default" || plan.humanSingleVsDualPreference !== "single_voice" || plan.humanSingleVsDualPreferenceAcceptance !== "accepted") errors.push("dual_voice_ab_evidence_status_invalid");
  if (plan.voiceBindings.voxy.candidateId !== "D1" || plan.voiceBindings.voxy.variant !== "d1-conversational-dynamic" || plan.voiceBindings.voxy.humanIdentityStatus !== "accepted" || plan.voiceBindings.editorial.candidateId !== "W1" || plan.voiceBindings.editorial.variant !== "w1-natural-editorial" || plan.voiceBindings.editorial.humanIdentityStatus !== "accepted" || String(plan.voiceBindings.voxy.voiceId) === String(plan.voiceBindings.editorial.voiceId)) errors.push("canonical_voice_mapping_invalid");
  if (!plan.speakerTimeline[0]?.text.startsWith("Hallo Nachbar.") || plan.speakerTimeline.slice(1).some((entry) => entry.text.includes("Hallo Nachbar"))) errors.push("greeting_contract_invalid");
  if (plan.visualStateTimeline.map((entry) => entry.state).join(",") !== "HOST,FOCUS,EXPLAIN,DOCK,HOST,FOCUS,EXPLAIN,DOCK,SYNTHESIS,HOST") errors.push("news_5_sequence_invalid");
  if (plan.visualStateTimeline.some((entry) => entry.start >= entry.end)) errors.push("visual_timeline_order_invalid");
  const dockStates = plan.visualStateTimeline.filter((entry) => entry.state === "DOCK");
  if (dockStates.some((dock) => !dock.activeEvidenceId || !dock.dockedEvidenceIds.includes(dock.activeEvidenceId))) errors.push("dock_identity_invalid");
  const synthesis = plan.visualStateTimeline.find((entry) => entry.state === "SYNTHESIS");
  if (!synthesis || !["democracy-trust", "democracy-participation"].every((id) => synthesis.dockedEvidenceIds.includes(id))) errors.push("synthesis_missing_previously_docked_evidence");
  if (!plan.evidence.every((entry) => entry.provenance === "DEMO / ILLUSTRATION")) errors.push("demo_provenance_invalid");
  if (!plan.objectContinuity.sameEvidenceId || !plan.objectContinuity.sameVisualIdentity || !plan.objectContinuity.scaleAndTranslation || plan.objectContinuity.hardSubstitution || plan.objectContinuity.crossfadeToDifferentObject) errors.push("object_continuity_invalid");
  if (!plan.captions.sidecarsOnly || plan.captions.burnedIn) errors.push("burned_in_caption_contract_invalid");
  if (plan.waveform.count !== 1 || plan.waveform.secondWaveform || !plan.waveform.reactsToActiveVoice) errors.push("single_waveform_contract_invalid");
  if (plan.mouth.syncSpeakerRole !== "voxy" || plan.mouth.editorialMouth !== "neutral_or_closed" || plan.mouth.shapesChanged || plan.mouth.anchorChanged || plan.mouth.pivotChanged) errors.push("mouth_contract_invalid");
  if (plan.privacy.privateRawVoiceInRepository || plan.privacy.privateReferencePathInManifest || plan.privacy.publicArtifact || plan.privacy.upload) errors.push("privacy_contract_invalid");
  if (plan.technicalPilotGate !== "passed" || plan.technicalVoiceMappingGate !== "passed" || plan.humanPilotAcceptance !== "pending" || plan.humanVoiceAcceptance !== "accepted" || plan.humanVoxyVoiceAcceptance !== "accepted" || plan.humanEditorialVoiceAcceptance !== "accepted" || plan.humanNews5VisualAcceptance !== "pending" || plan.canonicalVoxyVoice !== "D1 Conversational Dynamic" || plan.canonicalEditorialVoice !== "W1 Natural Editorial" || plan.genderLabelsAllowed || !plan.videoRenderingAllowed || plan.productionEligible || plan.autoPublish) errors.push("release_gate_invalid");
  return errors;
}

export function speakerAt(plan: VoxyExplainerPilotPlan, atSeconds: number) {
  return plan.speakerTimeline.find((entry) => atSeconds >= entry.start && atSeconds < entry.end) ?? null;
}

export function visualStateAt(plan: VoxyExplainerPilotPlan, atSeconds: number) {
  return plan.visualStateTimeline.find((entry) => atSeconds >= entry.start && atSeconds < entry.end) ?? plan.visualStateTimeline.at(-1)!;
}
