import {
  VOXY_CHATTERBOX_ENGINE,
  VOXY_CHATTERBOX_MODEL,
  VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES,
  VOXY_FIRST_PARTY_REFERENCE_WINDOWS,
  VOXY_FIRST_PARTY_VISUAL_BINDING,
} from "./firstPartyVoiceClone";

export const VOXY_SIGNATURE_VOICE_SCHEMA_VERSION =
  "voxy-signature-voice-final-pass-v1" as const;

export const VOXY_SIGNATURE_TEST_SITUATIONS = [
  {
    id: "test-1-signature-intro",
    label: "TEST 1 — SIGNATURE INTRO",
    visibleText: `Ich bin Voxy.

Ich möchte dir nicht sagen, was du denken sollst.

Ich möchte dir helfen, besser zu verstehen,
worüber wir eigentlich entscheiden.

Du musst mir dabei nichts glauben.

Du sollst es prüfen können.`,
    spokenSegments: [
      { id: "identity", visibleText: "Ich bin Voxy.", spokenText: "Ich bin Woxi.", pauseAfterMs: 560 },
      {
        id: "no-persuasion",
        visibleText: "Ich möchte dir nicht sagen, was du denken sollst.",
        spokenText: "Ich möchte dir nicht sagen, was du denken sollst.",
        pauseAfterMs: 690,
      },
      {
        id: "understanding",
        visibleText: "Ich möchte dir helfen, besser zu verstehen,\nworüber wir eigentlich entscheiden.",
        spokenText: "Ich möchte dir helfen, besser zu verstehen, worüber wir eigentlich entscheiden.",
        pauseAfterMs: 760,
      },
      {
        id: "verifiability",
        visibleText: "Du musst mir dabei nichts glauben.\n\nDu sollst es prüfen können.",
        spokenText: "Du musst mir dabei nichts glauben. Du sollst es prüfen können.",
        pauseAfterMs: 0,
      },
    ],
  },
  {
    id: "test-2-editorial",
    label: "TEST 2 — EDITORIAL",
    visibleText: `Eine Zahl allein erklärt noch keine politische Entscheidung.

Entscheidend ist, woher sie stammt,
in welchem Zusammenhang sie steht
und welche Annahmen dahinterliegen.

Deshalb schauen wir nicht nur auf das Ergebnis.

Wir schauen auch auf die Quellen,
die Argumente und auf das,
was wir noch nicht wissen.`,
    spokenSegments: [
      {
        id: "number-context",
        visibleText: "Eine Zahl allein erklärt noch keine politische Entscheidung.",
        spokenText: "Eine Zahl allein erklärt noch keine politische Entscheidung.",
        pauseAfterMs: 580,
      },
      {
        id: "assumptions",
        visibleText: "Entscheidend ist, woher sie stammt,\nin welchem Zusammenhang sie steht\nund welche Annahmen dahinterliegen.",
        spokenText: "Entscheidend ist, woher sie stammt, in welchem Zusammenhang sie steht und welche Annahmen dahinterliegen.",
        pauseAfterMs: 730,
      },
      {
        id: "not-only-result",
        visibleText: "Deshalb schauen wir nicht nur auf das Ergebnis.",
        spokenText: "Deshalb schauen wir nicht nur auf das Ergebnis.",
        pauseAfterMs: 570,
      },
      {
        id: "sources-and-unknowns",
        visibleText: "Wir schauen auch auf die Quellen,\ndie Argumente und auf das,\nwas wir noch nicht wissen.",
        spokenText: "Wir schauen auch auf die Quellen, die Argumente und auf das, was wir noch nicht wissen.",
        pauseAfterMs: 0,
      },
    ],
  },
  {
    id: "test-3-explainer",
    label: "TEST 3 — EXPLAINER",
    visibleText: `Vote4Gov stellt Fragen.

VoiceOpenGov bringt Menschen zusammen.

Und eDebatte macht Argumente,
Quellen und unterschiedliche Perspektiven sichtbar.

Voxy verbindet diese Ebenen.

Damit aus einer schnellen Meinung
eine Entscheidung werden kann,
die du selbst nachvollziehen kannst.`,
    spokenSegments: [
      {
        id: "ecosystem-open",
        visibleText: "Vote4Gov stellt Fragen.\n\nVoiceOpenGov bringt Menschen zusammen.",
        spokenText: "Wout-for-Goff stellt Fragen. Woiss-Open-Goff bringt Menschen zusammen.",
        pauseAfterMs: 600,
      },
      {
        id: "edebatte",
        visibleText: "Und eDebatte macht Argumente,\nQuellen und unterschiedliche Perspektiven sichtbar.",
        spokenText: "Und eh Debatte macht Argumente, Quellen und unterschiedliche Perspektiven sichtbar.",
        pauseAfterMs: 620,
      },
      {
        id: "voxy-bridge",
        visibleText: "Voxy verbindet diese Ebenen.",
        spokenText: "Woxi verbindet diese Ebenen.",
        pauseAfterMs: 540,
      },
      {
        id: "decision-close",
        visibleText: "Damit aus einer schnellen Meinung\neine Entscheidung werden kann,\ndie du selbst nachvollziehen kannst.",
        spokenText: "Damit aus einer schnellen Meinung eine Entscheidung werden kann, die du selbst nachvollziehen kannst.",
        pauseAfterMs: 0,
      },
    ],
  },
] as const;

export const VOXY_SIGNATURE_DELIVERY_MODES = [
  {
    id: "candidate-d-editorial",
    shortId: "D",
    label: "D — VOXY EDITORIAL",
    primarySituationId: "test-2-editorial",
    developmentReference: "B — Ricky Calm",
    intent: "serious_precise_calm_credible_intellectually_sovereign_natural_eloquent",
    selectedVariantId: "d-02-natural-arc",
    variants: [
      {
        id: "d-01-calm-control",
        referenceSegmentId: "reference-02-segment-b",
        exaggeration: 0.38,
        cfgWeight: 0.35,
        temperature: 0.66,
        seed: 58941,
        pauseScale: 1.02,
      },
      {
        id: "d-02-natural-arc",
        referenceSegmentId: "reference-02-segment-b",
        exaggeration: 0.42,
        cfgWeight: 0.33,
        temperature: 0.68,
        seed: 58942,
        pauseScale: 1,
      },
    ],
  },
  {
    id: "candidate-e-signature",
    shortId: "E",
    label: "E — VOXY SIGNATURE",
    primarySituationId: "test-1-signature-intro",
    developmentReference: "B sovereignty plus C warmth; parameter and delivery reference only",
    intent: "natural_trustworthy_eloquent_warm_clear_long_form_listenable",
    selectedVariantId: "e-02-warm-sovereign",
    variants: [
      {
        id: "e-01-sovereign-warmth",
        referenceSegmentId: "reference-02-segment-b",
        exaggeration: 0.44,
        cfgWeight: 0.34,
        temperature: 0.68,
        seed: 58951,
        pauseScale: 1,
      },
      {
        id: "e-02-warm-sovereign",
        referenceSegmentId: "reference-01-segment-b",
        exaggeration: 0.46,
        cfgWeight: 0.34,
        temperature: 0.68,
        seed: 58952,
        pauseScale: 1,
      },
    ],
  },
  {
    id: "candidate-f-explainer",
    shortId: "F",
    label: "F — VOXY EXPLAINER",
    primarySituationId: "test-3-explainer",
    developmentReference: "C — Voxy",
    intent: "warm_curious_accessible_friendly_explanatory_without_performance",
    selectedVariantId: "f-02-lively-controlled",
    variants: [
      {
        id: "f-01-controlled-c",
        referenceSegmentId: "reference-01-segment-b",
        exaggeration: 0.45,
        cfgWeight: 0.35,
        temperature: 0.68,
        seed: 58961,
        pauseScale: 0.98,
      },
      {
        id: "f-02-lively-controlled",
        referenceSegmentId: "reference-01-segment-b",
        exaggeration: 0.47,
        cfgWeight: 0.33,
        temperature: 0.7,
        seed: 58962,
        pauseScale: 0.95,
      },
    ],
  },
] as const;

export const VOXY_SIGNATURE_REPETITION_PENALTY = 1.2;
export const VOXY_SIGNATURE_MIN_P = 0.05;
export const VOXY_SIGNATURE_TOP_P = 1;

export const VOXY_SIGNATURE_FINAL_PASS_BINDING = {
  engine: VOXY_CHATTERBOX_ENGINE,
  model: VOXY_CHATTERBOX_MODEL,
  referenceWindows: VOXY_FIRST_PARTY_REFERENCE_WINDOWS,
  pronunciationAliases: VOXY_FIRST_PARTY_PRONUNCIATION_ALIASES,
  visual: VOXY_FIRST_PARTY_VISUAL_BINDING,
  voiceB: "development_reference_accepted",
  voiceC: "development_reference_accepted",
  voiceD: "human_review",
  voiceE: "primary_canon_candidate",
  voiceF: "human_review",
  humanAudioAcceptance: "pending",
  humanVoiceWinner: "pending",
  productionEligible: false,
  autoPublish: false,
} as const;

export function validateVoxySignatureVoiceFinalPassContract(): string[] {
  const errors: string[] = [];
  if (VOXY_SIGNATURE_DELIVERY_MODES.map((mode) => mode.shortId).join("") !== "DEF") errors.push("delivery_modes_must_be_d_e_f");
  if (VOXY_SIGNATURE_TEST_SITUATIONS.length !== 3) errors.push("three_test_situations_required");
  if (VOXY_SIGNATURE_DELIVERY_MODES.some((mode) => mode.variants.length < 1 || mode.variants.length > 2)) errors.push("local_search_must_remain_small");
  if (VOXY_SIGNATURE_DELIVERY_MODES.some((mode) => !mode.variants.some((variant) => variant.id === mode.selectedVariantId))) errors.push("selected_variant_missing");
  if (VOXY_SIGNATURE_DELIVERY_MODES.some((mode) => !VOXY_SIGNATURE_TEST_SITUATIONS.some((test) => test.id === mode.primarySituationId))) errors.push("primary_situation_missing");
  if (VOXY_SIGNATURE_DELIVERY_MODES.some((mode) => mode.variants.some((variant) => !(VOXY_FIRST_PARTY_REFERENCE_WINDOWS as readonly { id: string }[]).some((window) => window.id === variant.referenceSegmentId)))) errors.push("reference_segment_missing");
  if (VOXY_SIGNATURE_FINAL_PASS_BINDING.visual.visualMasterMutated || VOXY_SIGNATURE_FINAL_PASS_BINDING.visual.mouthShapesChanged) errors.push("frozen_visual_drift");
  if (VOXY_SIGNATURE_FINAL_PASS_BINDING.humanAudioAcceptance !== "pending" || VOXY_SIGNATURE_FINAL_PASS_BINDING.humanVoiceWinner !== "pending") errors.push("human_gate_must_remain_pending");
  if (VOXY_SIGNATURE_FINAL_PASS_BINDING.productionEligible || VOXY_SIGNATURE_FINAL_PASS_BINDING.autoPublish) errors.push("release_must_remain_blocked");
  return errors;
}
