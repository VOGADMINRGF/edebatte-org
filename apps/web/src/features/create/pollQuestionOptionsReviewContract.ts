import type { CreateCandidatePreviewReadModel } from "@/features/create/createCandidatePreview";
import type {
  DossierWorkspaceDecisionModel,
} from "@/features/create/dossierWorkspaceDecisionContract";
import {
  buildDossierWorkspaceDecisionFromCreateCandidatePreview,
  buildDossierWorkspaceDecisionFromReviewContext,
  buildDossierWorkspaceDecisionFromVoxyDialog,
} from "@/features/create/dossierWorkspaceDecisionContract";
import type {
  ParticipationActivationReviewModel,
} from "@/features/create/participationActivationReviewContract";
import {
  buildParticipationActivationReviewFromCreateCandidatePreview,
  buildParticipationActivationReviewFromReviewContext,
  buildParticipationActivationReviewFromVoxyDialog,
} from "@/features/create/participationActivationReviewContract";
import type {
  SourceFactcheckFeedEnrichmentModel,
} from "@/features/create/sourceFactcheckFeedEnrichmentContract";
import {
  buildSourceFactcheckFeedEnrichmentFromCreateCandidatePreview,
  buildSourceFactcheckFeedEnrichmentFromReviewContext,
  buildSourceFactcheckFeedEnrichmentFromVoxyDialog,
} from "@/features/create/sourceFactcheckFeedEnrichmentContract";
import type { V3ReviewQueueWiringContext } from "@/features/create/unifiedReviewQueueWiring";
import type {
  V3VoxyCocreationDialogModel,
} from "@/features/create/voxyCocreationDialogContract";
import {
  buildVoxyCocreationDialogFromReviewContext,
} from "@/features/create/voxyCocreationDialogContract";
import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";

export const POLL_QUESTION_OPTIONS_REVIEW_STATUSES = [
  "readmodel_only",
  "poll_preview",
  "needs_editorial_review",
  "needs_source_review",
  "needs_factcheck_review",
  "needs_human_input",
  "needs_scope_decision",
  "needs_option_review",
  "needs_bias_review",
  "blocked_by_runtime_truth",
  "blocked_by_missing_review",
] as const;

export type PollQuestionOptionsReviewStatus =
  (typeof POLL_QUESTION_OPTIONS_REVIEW_STATUSES)[number];

export const POLL_QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "pro_contra",
  "ranking",
  "scale",
  "open_question",
  "not_poll_ready",
] as const;

export type PollQuestionType = (typeof POLL_QUESTION_TYPES)[number];

export const POLL_QUESTION_CONFIDENCE = [
  "strong",
  "medium",
  "weak",
  "missing",
] as const;

export type PollQuestionConfidence = (typeof POLL_QUESTION_CONFIDENCE)[number];

export const POLL_OPTION_TYPES = [
  "support",
  "oppose",
  "neutral",
  "alternative",
  "unsure",
  "other",
  "needs_review",
] as const;

export type PollOptionType = (typeof POLL_OPTION_TYPES)[number];

export const POLL_BIAS_REVIEW_NEEDS = [
  "leading_question",
  "loaded_wording",
  "missing_neutral_option",
  "missing_other_option",
  "asymmetric_options",
  "minority_view_missing",
  "scope_unclear",
  "translation_misread_risk",
] as const;

export type PollBiasReviewNeed = (typeof POLL_BIAS_REVIEW_NEEDS)[number];

export const POLL_ELIGIBILITY_SIGNALS = [
  "clear_question_present",
  "options_possible",
  "counterposition_present",
  "source_review_needed",
  "factcheck_needed",
  "human_input_needed",
  "scope_defined",
  "multilingual_review_needed",
] as const;

export type PollEligibilitySignal =
  (typeof POLL_ELIGIBILITY_SIGNALS)[number];

export const POLL_PARTICIPATION_SCOPES = [
  "local",
  "regional",
  "national",
  "eu",
  "global",
  "multilingual",
] as const;

export type PollParticipationScope =
  (typeof POLL_PARTICIPATION_SCOPES)[number];

export const POLL_DOWNSTREAM_STATUSES = [
  "blocked",
  "needs_review",
  "prepared",
] as const;

export type PollDownstreamStatus = (typeof POLL_DOWNSTREAM_STATUSES)[number];

export const POLL_NEXT_DECISIONS = [
  "refine_question",
  "add_options",
  "add_neutral_option",
  "request_sources",
  "review_claims",
  "clarify_scope",
  "choose_open_question",
  "keep_as_discussion",
  "blocked",
] as const;

export type PollNextDecision = (typeof POLL_NEXT_DECISIONS)[number];

type PollReviewSurface = "create" | "account" | "admin" | "workspace";

type PollRef = {
  id: string;
  title: string;
  href?: string | null;
};

type PollTag<T extends string> = {
  id: T;
  label: string;
  reason: string;
};

export type PollQuestionOptionItem = {
  id: string;
  label: string;
  optionType: PollOptionType;
  optionTypeLabel: string;
  reviewRequired: true;
  biasRisk: string | null;
  sourceNeed: string | null;
};

export type PollQuestionDownstreamItem = {
  id: "participation" | "output" | "social" | "voxyBriefing" | "publicPoll";
  label: string;
  status: PollDownstreamStatus;
  statusLabel: string;
  reason: string;
  reviewRequired: true;
};

export type PollQuestionOptionsReviewModel = {
  title: string;
  summary: string;
  surface: PollReviewSurface;
  contributionRef: PollRef | null;
  dossierRef: PollRef | null;
  participationRef: PollRef | null;
  sourceLanguage: string;
  readingLanguage: string;
  languageLabel: string;
  originalPreserved: true;
  translationIsEvidence: false;
  rtlDisplayHint: boolean;
  pollStatus: PollQuestionOptionsReviewStatus;
  pollStatusLabel: string;
  questionType: PollQuestionType;
  questionTypeLabel: string;
  proposedQuestion: string | null;
  questionGuard: PublicQuestionGeneralizationResult | null;
  questionConfidence: PollQuestionConfidence;
  questionConfidenceLabel: string;
  questionReason: string;
  optionItems: PollQuestionOptionItem[];
  missingOptionNeeds: string[];
  biasReviewNeeds: PollTag<PollBiasReviewNeed>[];
  eligibilitySignals: PollTag<PollEligibilitySignal>[];
  participationScope: PollParticipationScope;
  participationScopeLabel: string;
  targetGroups: string[];
  reviewBlockers: string[];
  downstreamReadiness: PollQuestionDownstreamItem[];
  nextPollDecision: {
    id: PollNextDecision;
    label: string;
    reason: string;
  };
  publicSafeLabel: string;
  userVisibleReason: string;
  reviewerVisibleReason: string;
  nextStep: string;
  reviewRequired: true;
  noPollAction: true;
  noPublishAction: true;
  noRuntimeClaim: true;
};

type OptionSeed = {
  label: string;
  explicitType?: PollOptionType | null;
};

type BuildSignalsInput = {
  surface: PollReviewSurface;
  contributionRef?: PollRef | null;
  dossierRef?: PollRef | null;
  participationRef?: PollRef | null;
  sourceLanguage: string;
  readingLanguage: string;
  rtlDisplayHint: boolean;
  translationAvailable: boolean;
  originalInput?: string | null;
  texts: string[];
  questionHints: string[];
  openQuestions: string[];
  optionSeeds: OptionSeed[];
  sourceModel: SourceFactcheckFeedEnrichmentModel | null;
  dossierModel: DossierWorkspaceDecisionModel | null;
  activationModel: ParticipationActivationReviewModel | null;
  voxyDialog: V3VoxyCocreationDialogModel | null;
  runtimeTruthMissing: boolean;
  providerBlocked: boolean;
  missingReview: boolean;
  nextStep: string;
  userVisibleReason: string;
  reviewerVisibleReason: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean)),
  );
}

function lowerJoined(values: readonly string[]): string {
  return values.map((value) => value.toLowerCase()).join(" ");
}

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function languageName(language: string): string {
  if (language === "de") return "Deutsch";
  if (language === "en") return "Englisch";
  if (language === "fr") return "Französisch";
  if (language === "tr") return "Türkisch";
  if (language === "ar") return "Arabisch";
  if (language === "fa") return "Persisch";
  if (language === "he") return "Hebräisch";
  if (language === "ur") return "Urdu";
  return language || "Unklar";
}

function pollStatusLabel(value: PollQuestionOptionsReviewStatus): string {
  if (value === "poll_preview") return "Poll-Vorschau";
  if (value === "needs_editorial_review") return "Redaktionelle Prüfung offen";
  if (value === "needs_source_review") return "Quellenprüfung offen";
  if (value === "needs_factcheck_review") return "Factcheck-Fragen offen";
  if (value === "needs_human_input") return "Menschliche Ergänzung offen";
  if (value === "needs_scope_decision") return "Scope-Entscheidung offen";
  if (value === "needs_option_review") return "Optionen-Review offen";
  if (value === "needs_bias_review") return "Bias-Review offen";
  if (value === "blocked_by_runtime_truth") return "Runtime-Wahrheit fehlt";
  if (value === "blocked_by_missing_review") return "Review fehlt";
  return "Nur Readmodel";
}

function questionTypeLabel(value: PollQuestionType): string {
  if (value === "single_choice") return "Single Choice";
  if (value === "multiple_choice") return "Multiple Choice";
  if (value === "pro_contra") return "Pro / Contra";
  if (value === "ranking") return "Ranking";
  if (value === "scale") return "Skala";
  if (value === "open_question") return "Offene Frage";
  return "Noch nicht poll-ready";
}

function questionConfidenceLabel(value: PollQuestionConfidence): string {
  if (value === "strong") return "Hohe Belastbarkeit";
  if (value === "medium") return "Mittlere Belastbarkeit";
  if (value === "weak") return "Schwache Belastbarkeit";
  return "Noch offen";
}

function optionTypeLabel(value: PollOptionType): string {
  if (value === "support") return "Unterstützend";
  if (value === "oppose") return "Gegenposition";
  if (value === "neutral") return "Neutral";
  if (value === "alternative") return "Alternative";
  if (value === "unsure") return "Unklar / unsicher";
  if (value === "other") return "Andere Perspektive";
  return "Review nötig";
}

function biasReviewNeedLabel(value: PollBiasReviewNeed): string {
  if (value === "leading_question") return "Suggestive Frage prüfen";
  if (value === "loaded_wording") return "Wertende Formulierung prüfen";
  if (value === "missing_neutral_option") return "Neutrale Option prüfen";
  if (value === "missing_other_option") return "Weitere Perspektive prüfen";
  if (value === "asymmetric_options") return "Optionen auf Symmetrie prüfen";
  if (value === "minority_view_missing") return "Minderheitenperspektive prüfen";
  if (value === "scope_unclear") return "Scope schärfen";
  return "Übersetzungsrisiko prüfen";
}

function eligibilitySignalLabel(value: PollEligibilitySignal): string {
  if (value === "clear_question_present") return "Frage sichtbar";
  if (value === "options_possible") return "Optionen ableitbar";
  if (value === "counterposition_present") return "Gegenposition sichtbar";
  if (value === "source_review_needed") return "Quellenprüfung offen";
  if (value === "factcheck_needed") return "Factcheck offen";
  if (value === "human_input_needed") return "Menschliche Ergänzung offen";
  if (value === "scope_defined") return "Scope erkennbar";
  return "Mehrsprachiges Review nötig";
}

function scopeLabel(value: PollParticipationScope): string {
  if (value === "local") return "Lokal";
  if (value === "regional") return "Regional";
  if (value === "national") return "National";
  if (value === "eu") return "EU";
  if (value === "global") return "Global";
  return "Mehrsprachig";
}

function downstreamStatusLabel(value: PollDownstreamStatus): string {
  if (value === "prepared") return "Vorbereitet";
  if (value === "needs_review") return "Review offen";
  return "Blockiert";
}

function nextDecisionLabel(value: PollNextDecision): string {
  if (value === "refine_question") return "Frage nachschärfen";
  if (value === "add_options") return "Optionen ergänzen";
  if (value === "add_neutral_option") return "Neutrale Option prüfen";
  if (value === "request_sources") return "Quellen anfordern";
  if (value === "review_claims") return "Claims prüfen";
  if (value === "clarify_scope") return "Scope klären";
  if (value === "choose_open_question") return "Offene Frage bevorzugen";
  if (value === "keep_as_discussion") return "Als Diskussion offen halten";
  return "Blockiert";
}

function mapScopeFromInputs(input: BuildSignalsInput): PollParticipationScope {
  if (input.activationModel?.participationScope) {
    return input.activationModel.participationScope;
  }
  const referenceScopes = input.sourceModel?.referenceScopes.map((entry) => entry.id) ?? [];
  if (referenceScopes.includes("multilingual")) return "multilingual";
  if (referenceScopes.includes("local")) return "local";
  if (referenceScopes.includes("regional")) return "regional";
  if (referenceScopes.includes("national")) return "national";
  if (referenceScopes.includes("eu")) return "eu";
  if (referenceScopes.includes("global")) return "global";
  if (input.sourceLanguage !== input.readingLanguage || input.rtlDisplayHint) {
    return "multilingual";
  }
  return "local";
}

function mapOptionType(label: string, explicitType?: PollOptionType | null): PollOptionType {
  if (explicitType) return explicitType;
  const normalized = label.toLowerCase();
  if (containsPattern(normalized, [/\bneutral\b/, /\bkeine meinung\b/, /\bunentschieden\b/])) {
    return "neutral";
  }
  if (containsPattern(normalized, [/\bweiß nicht\b/, /\bweiss nicht\b/, /\bunsicher\b/, /\bunklar\b/])) {
    return "unsure";
  }
  if (containsPattern(normalized, [/\bsonstige\b/, /\bandere\b/, /\bother\b/])) {
    return "other";
  }
  if (containsPattern(normalized, [/\bgegen\b/, /\bcontra\b/, /\bnein\b/, /\bablehnen\b/])) {
    return "oppose";
  }
  if (containsPattern(normalized, [/\bpro\b/, /\bja\b/, /\bzustimmen\b/, /\bunterstützen\b/])) {
    return "support";
  }
  if (containsPattern(normalized, [/\balternative\b/, /\bvariante\b/, /\boption\b/])) {
    return "alternative";
  }
  return "needs_review";
}

function isLikelyQuestion(value: string): boolean {
  if (!value) return false;
  return value.includes("?") || containsPattern(value.toLowerCase(), [/^wie\b/, /^welche\b/, /^welcher\b/, /^was\b/, /^soll/]);
}

function buildQuestionType(input: {
  proposedQuestion: string | null;
  optionSeeds: OptionSeed[];
  optionCount: number;
  counterpositionPresent: boolean;
  participationSuggested: boolean;
  sourceReviewNeeded: boolean;
  factcheckNeeded: boolean;
}): PollQuestionType {
  const questionText = normalizeText(input.proposedQuestion).toLowerCase();
  if (!input.proposedQuestion && !input.participationSuggested) return "not_poll_ready";
  if (!input.proposedQuestion && (input.sourceReviewNeeded || input.factcheckNeeded)) {
    return "not_poll_ready";
  }
  if (containsPattern(questionText, [/wie stark/, /auf einer skala/, /wieviel/])) {
    return "scale";
  }
  if (
    containsPattern(questionText, [/reihenfolge/, /priorit/, /zuerst/, /rang/]) &&
    input.optionCount >= 3
  ) {
    return "ranking";
  }
  if (
    input.counterpositionPresent &&
    input.optionCount <= 2 &&
    input.optionSeeds.some((seed) => seed.explicitType === "support" || seed.explicitType === "oppose")
  ) {
    return "pro_contra";
  }
  if (input.counterpositionPresent && input.optionCount === 2) return "pro_contra";
  if (input.optionCount >= 3) return "multiple_choice";
  if (input.optionCount >= 2) return "single_choice";
  if (input.proposedQuestion) return "open_question";
  return "not_poll_ready";
}

function buildQuestionConfidence(input: {
  proposedQuestion: string | null;
  questionType: PollQuestionType;
  optionCount: number;
  sourceReviewNeeded: boolean;
  factcheckNeeded: boolean;
  biasCount: number;
  participationSuggested: boolean;
}): PollQuestionConfidence {
  if (!input.proposedQuestion) {
    return input.participationSuggested ? "weak" : "missing";
  }
  if (
    input.questionType !== "open_question" &&
    input.questionType !== "not_poll_ready" &&
    input.optionCount >= 2 &&
    !input.sourceReviewNeeded &&
    !input.factcheckNeeded &&
    input.biasCount <= 1
  ) {
    return "strong";
  }
  if (input.questionType !== "not_poll_ready") return "medium";
  return "weak";
}

function pushTag<T extends string>(
  target: PollTag<T>[],
  id: T,
  reason: string,
) {
  if (target.some((entry) => entry.id === id)) return;
  const label =
    (POLL_BIAS_REVIEW_NEEDS as readonly string[]).includes(id)
      ? biasReviewNeedLabel(id as PollBiasReviewNeed)
      : eligibilitySignalLabel(id as PollEligibilitySignal);
  target.push({
    id,
    label,
    reason,
  });
}

function buildModelFromSignals(input: BuildSignalsInput): PollQuestionOptionsReviewModel {
  const targetGroups = uniqueStrings([
    ...(input.activationModel?.targetGroups ?? []),
    ...(input.dossierModel?.affectedGroups ?? []),
    ...(input.sourceModel?.affectedGroupEvidenceNeeds ?? []),
  ]);
  const scope = mapScopeFromInputs(input);
  const participationSuggested =
    input.activationModel?.suggestedFormat === "poll_preparation" ||
    Boolean(input.participationRef) ||
    input.optionSeeds.length > 0;
  const counterpositionPresent =
    input.dossierModel?.counterposition.status === "present" ||
    input.dossierModel?.counterposition.status === "needs_review" ||
    Boolean(input.dossierModel?.claimItems.some((item) => item.claimType === "contested")) ||
    (input.dossierModel?.downstreamReadiness.find((item) => item.id === "poll")?.status ===
      "needs_review");
  const sourceReviewNeeded =
    input.sourceModel?.enrichmentStatus === "needs_source_review" ||
    (input.sourceModel?.sourceNeeds.length ?? 0) > 0;
  const factcheckNeeded =
    input.sourceModel?.enrichmentStatus === "needs_factcheck_review" ||
    (input.dossierModel?.factcheckQuestions.length ?? 0) > 0;
  const humanInputNeeded =
    input.activationModel?.readinessSignals.some((item) => item.id === "human_input_needed") ||
    input.voxyDialog?.status === "needs_user_input" ||
    (input.voxyDialog?.cards.length ?? 0) > 0;
  const multilingualReviewNeeded =
    input.sourceLanguage !== input.readingLanguage ||
    input.rtlDisplayHint ||
    scope === "multilingual";
  const unclearScope =
    input.activationModel?.riskFlags.some((item) => item.id === "unclear_scope") ||
    input.activationModel?.readinessSignals.some((item) => item.id === "poll_question_needed") ||
    (scope === "multilingual" && targetGroups.length === 0);

  const candidateQuestion =
    uniqueStrings([
      ...input.questionHints.filter(isLikelyQuestion),
      input.activationModel?.proposedParticipationQuestion ?? null,
      input.openQuestions[0] ?? null,
    ])[0] ?? null;
  const questionGuard = candidateQuestion
    ? evaluatePublicQuestionGeneralization({
        originalInput: input.originalInput ?? input.texts[0] ?? candidateQuestion,
        candidatePublicQuestion: candidateQuestion,
        actorContexts: [],
        actorExtraction: {
          status: "unverified",
          source: "create_analysis",
          independentFromCandidateProvider: false,
          evidenceRefs: [],
        },
        sourceLanguage: input.sourceLanguage,
        contentLanguage: input.readingLanguage,
      })
    : null;
  const proposedQuestion =
    questionGuard?.releaseState === "blocked" ? null : candidateQuestion;

  const questionReason =
    input.activationModel?.formatReason ??
    (proposedQuestion
      ? "Die Frage wird nur aus vorhandenen Draft-, Review- und Beteiligungshinweisen vorbereitet."
      : "Noch keine belastbare Poll-Frage aus dem vorhandenen Arbeitsstand ableitbar.");

  const fallbackOptionSeeds: OptionSeed[] = [];
  if (input.activationModel?.proposedParticipationQuestion && input.dossierModel?.thesis.label) {
    fallbackOptionSeeds.push({
      label: input.dossierModel.thesis.label,
      explicitType: "support",
    });
  }
  if (input.dossierModel?.counterposition.summary) {
    fallbackOptionSeeds.push({
      label: input.dossierModel.counterposition.summary,
      explicitType: "oppose",
    });
  }
  if (fallbackOptionSeeds.length < 3) {
    fallbackOptionSeeds.push(
      ...(input.dossierModel?.claimItems.slice(0, 3).map((item) => ({
        label: item.text,
        explicitType: item.claimType === "contested" ? ("needs_review" as const) : ("alternative" as const),
      })) ?? []),
    );
  }

  const optionSeedsInput =
    input.optionSeeds.length > 0 ? input.optionSeeds : fallbackOptionSeeds;
  const optionSeeds = uniqueStrings(optionSeedsInput.map((seed) => seed.label)).map((label) => {
    const original = optionSeedsInput.find((seed) => normalizeText(seed.label) === label);
    return {
      label,
      explicitType: original?.explicitType ?? null,
    };
  });

  const optionSeedsForType = participationSuggested ? optionSeeds : input.optionSeeds;
  const optionCountForType = optionSeedsForType.length;

  const questionType = buildQuestionType({
    proposedQuestion,
    optionSeeds: optionSeedsForType,
    optionCount: optionCountForType,
    counterpositionPresent: Boolean(counterpositionPresent),
    participationSuggested,
    sourceReviewNeeded,
    factcheckNeeded,
  });

  const optionItems: PollQuestionOptionItem[] = (
    questionGuard?.releaseState === "blocked" ? [] : optionSeeds.slice(0, 6)
  ).map((seed, index) => {
    const optionType = mapOptionType(seed.label, seed.explicitType);
    const biasRisk =
      multilingualReviewNeeded && optionType !== "neutral"
        ? "Übersetzungs- und Framing-Risiko vor Freigabe prüfen."
        : containsPattern(seed.label.toLowerCase(), [/\bendlich\b/, /\bzwang\b/, /\bskandal\b/])
          ? "Wertende Formulierung vor Poll-Freigabe prüfen."
          : null;
    const sourceNeed =
      sourceReviewNeeded || factcheckNeeded
        ? "Option basiert weiter auf reviewpflichtigen Aussagen oder offenen Quellen."
        : null;
    return {
      id: `poll-option-${index + 1}`,
      label: seed.label,
      optionType,
      optionTypeLabel: optionTypeLabel(optionType),
      reviewRequired: true,
      biasRisk,
      sourceNeed,
    };
  });

  const missingOptionNeeds = uniqueStrings([
    optionItems.length < 2 && questionType !== "open_question" && questionType !== "not_poll_ready"
      ? "Mindestens zwei belastbare Antwortoptionen fehlen noch."
      : null,
    counterpositionPresent && !optionItems.some((item) => item.optionType === "oppose")
      ? "Eine erkennbare Gegenposition sollte als Option oder Review-Hinweis sichtbar bleiben."
      : null,
    questionType !== "open_question" &&
    questionType !== "not_poll_ready" &&
    !optionItems.some((item) => item.optionType === "neutral" || item.optionType === "unsure")
      ? "Eine neutrale oder unsichere Antwortoption sollte geprüft werden."
      : null,
    (questionType === "multiple_choice" || questionType === "ranking") &&
    !optionItems.some((item) => item.optionType === "other")
      ? "Eine weitere Perspektive oder offene Restoption sollte geprüft werden."
      : null,
  ]);

  const biasReviewNeeds: PollTag<PollBiasReviewNeed>[] = [];
  if (proposedQuestion && containsPattern(proposedQuestion.toLowerCase(), [/\bendlich\b/, /\bdoch wohl\b/, /\bmuss doch\b/])) {
    pushTag(
      biasReviewNeeds,
      "leading_question",
      "Die Frage klingt wertend oder lenkend und braucht ein Bias-Review vor jeder Poll-Freigabe.",
    );
  }
  if (
    proposedQuestion &&
    containsPattern(proposedQuestion.toLowerCase(), [/\bskandal\b/, /\bchaos\b/, /\bkatastrophe\b/, /\bversagen\b/])
  ) {
    pushTag(
      biasReviewNeeds,
      "loaded_wording",
      "Wertende Schlüsselwörter sollten vor einer Poll-Vorschau neutralisiert oder bewusst geprüft werden.",
    );
  }
  if (
    questionType !== "open_question" &&
    questionType !== "not_poll_ready" &&
    !optionItems.some((item) => item.optionType === "neutral" || item.optionType === "unsure")
  ) {
    pushTag(
      biasReviewNeeds,
      "missing_neutral_option",
      "Eine neutrale oder unentschiedene Antwortmöglichkeit bleibt reviewpflichtig.",
    );
  }
  if (
    (questionType === "multiple_choice" || questionType === "ranking") &&
    !optionItems.some((item) => item.optionType === "other")
  ) {
    pushTag(
      biasReviewNeeds,
      "missing_other_option",
      "Mehrere Optionen können ohne Rest- oder weitere Perspektive unvollständig wirken.",
    );
  }
  if (
    optionItems.length >= 2 &&
    new Set(optionItems.map((item) => item.optionType)).size === 1 &&
    !optionItems.every((item) => item.optionType === "neutral")
  ) {
    pushTag(
      biasReviewNeeds,
      "asymmetric_options",
      "Die vorgeschlagenen Optionen wirken einseitig und sollten symmetrisch geprüft werden.",
    );
  }
  if (
    targetGroups.length > 0 &&
    !optionItems.some((item) => item.optionType === "other" || item.optionType === "unsure")
  ) {
    pushTag(
      biasReviewNeeds,
      "minority_view_missing",
      "Betroffenengruppen sind sichtbar, aber ihre mögliche Minderheitenperspektive wird noch nicht als Option gespiegelt.",
    );
  }
  if (unclearScope) {
    pushTag(
      biasReviewNeeds,
      "scope_unclear",
      "Lokaler, regionaler, nationaler oder mehrsprachiger Scope ist noch nicht präzise genug getrennt.",
    );
  }
  if (multilingualReviewNeeded) {
    pushTag(
      biasReviewNeeds,
      "translation_misread_risk",
      "Originalsprache und Lesefassung weichen ab oder brauchen RTL-/Cross-Lingual-Review.",
    );
  }

  const eligibilitySignals: PollTag<PollEligibilitySignal>[] = [];
  if (proposedQuestion) {
    pushTag(
      eligibilitySignals,
      "clear_question_present",
      "Eine konkrete Frage ist als Vorschlag sichtbar, bleibt aber reviewpflichtig.",
    );
  }
  if (optionItems.length >= 2) {
    pushTag(
      eligibilitySignals,
      "options_possible",
      "Mindestens zwei Antwortoptionen sind aus dem vorhandenen Arbeitsstand ableitbar.",
    );
  }
  if (counterpositionPresent) {
    pushTag(
      eligibilitySignals,
      "counterposition_present",
      "Eine Gegenposition ist im Dossier- oder Participation-Kontext bereits sichtbar.",
    );
  }
  if (sourceReviewNeeded) {
    pushTag(
      eligibilitySignals,
      "source_review_needed",
      "Quellen- und Evidence-Review bleibt vor jeder Poll-Freigabe offen.",
    );
  }
  if (factcheckNeeded) {
    pushTag(
      eligibilitySignals,
      "factcheck_needed",
      "Offene Factcheck-Fragen bleiben vor einer Poll-Weitergabe sichtbar.",
    );
  }
  if (humanInputNeeded) {
    pushTag(
      eligibilitySignals,
      "human_input_needed",
      "Menschliche Ergänzungen oder Klarstellungen werden weiterhin gebraucht.",
    );
  }
  if (!unclearScope) {
    pushTag(
      eligibilitySignals,
      "scope_defined",
      "Der Beteiligungsscope wirkt aus dem bestehenden Readmodel bereits anschlussfähig.",
    );
  }
  if (multilingualReviewNeeded) {
    pushTag(
      eligibilitySignals,
      "multilingual_review_needed",
      "Mehrsprachige oder RTL-nahe Beiträge brauchen ein sichtbares Sprachreview.",
    );
  }

  const questionConfidence = buildQuestionConfidence({
    proposedQuestion,
    questionType,
    optionCount: optionItems.length,
    sourceReviewNeeded,
    factcheckNeeded,
    biasCount: biasReviewNeeds.length,
    participationSuggested,
  });

  const reviewBlockers = uniqueStrings([
    !proposedQuestion ? "Eine belastbare Poll-Frage fehlt noch." : null,
    questionType === "not_poll_ready"
      ? "Der aktuelle Arbeitsstand wirkt eher wie Diskussion, Dossier- oder Review-Material als wie ein freigabefähiger Poll."
      : null,
    sourceReviewNeeded
      ? "Quellen- oder Evidence-Review bleibt vor jeder Poll-Freigabe offen."
      : null,
    factcheckNeeded
      ? "Offene Factcheck-Fragen blockieren einen ehrlichen Poll-Status."
      : null,
    humanInputNeeded
      ? "Menschliche Ergänzungen oder Betroffenenperspektiven fehlen noch."
      : null,
    unclearScope
      ? "Der Beteiligungsscope ist noch nicht klar genug begrenzt."
      : null,
    optionItems.length < 2 && questionType !== "open_question" && questionType !== "not_poll_ready"
      ? "Antwortoptionen sind noch zu dünn oder asymmetrisch."
      : null,
    input.runtimeTruthMissing && !participationSuggested
      ? "Es gibt noch keine belastbare Poll-Runtime-Wahrheit; dieser Layer bleibt readmodel-only."
      : null,
    input.providerBlocked
      ? "Voxy- oder Briefing-Folgepfade bleiben durch Provider- oder Secret-Gates blockiert."
      : null,
    questionGuard && questionGuard.releaseState !== "draft_allowed"
      ? `Public-Question-Guard: ${questionGuard.outcome}.`
      : null,
  ]);

  let pollStatus: PollQuestionOptionsReviewStatus = "readmodel_only";
  if (!participationSuggested && input.runtimeTruthMissing && !proposedQuestion) {
    pollStatus = "blocked_by_runtime_truth";
  } else if (sourceReviewNeeded) {
    pollStatus = "needs_source_review";
  } else if (factcheckNeeded) {
    pollStatus = "needs_factcheck_review";
  } else if (humanInputNeeded) {
    pollStatus = "needs_human_input";
  } else if (unclearScope) {
    pollStatus = "needs_scope_decision";
  } else if (biasReviewNeeds.length > 0) {
    pollStatus = "needs_bias_review";
  } else if (
    questionType !== "open_question" &&
    questionType !== "not_poll_ready" &&
    (optionItems.length < 2 || missingOptionNeeds.length > 0)
  ) {
    pollStatus = "needs_option_review";
  } else if (questionType === "not_poll_ready" || questionConfidence === "missing") {
    pollStatus = input.missingReview ? "blocked_by_missing_review" : "needs_editorial_review";
  } else if (participationSuggested || proposedQuestion) {
    pollStatus = "poll_preview";
  }

  let nextPollDecision: PollNextDecision = "blocked";
  let nextPollDecisionReason =
    "Ohne weitere Review-Wahrheit bleibt dieser Poll-Arbeitsstand blockiert.";
  if (!proposedQuestion) {
    nextPollDecision = "refine_question";
    nextPollDecisionReason =
      "Vor Optionen oder Freigabe braucht es zuerst eine präzise, ehrliche und nicht suggestive Frage.";
  } else if (sourceReviewNeeded) {
    nextPollDecision = "request_sources";
    nextPollDecisionReason =
      "Die Frage und ihre Optionen sollten erst nach sichtbarer Quellen- oder Evidence-Klärung weitergehen.";
  } else if (factcheckNeeded) {
    nextPollDecision = "review_claims";
    nextPollDecisionReason =
      "Offene Tatsachen- oder Kausalclaims sollten vor einem Poll weiter geprüft werden.";
  } else if (unclearScope) {
    nextPollDecision = "clarify_scope";
    nextPollDecisionReason =
      "Lokaler, regionaler, nationaler oder mehrsprachiger Scope ist noch nicht sauber genug gesetzt.";
  } else if (questionType === "open_question") {
    nextPollDecision = "choose_open_question";
    nextPollDecisionReason =
      "Der aktuelle Stand wirkt eher wie eine offene Beteiligungsfrage als wie ein Multiple-Choice-Poll.";
  } else if (optionItems.length < 2) {
    nextPollDecision = "add_options";
    nextPollDecisionReason =
      "Vor einer Poll-Vorschau braucht es mehr als eine belastbare Antwortoption.";
  } else if (
    !optionItems.some((item) => item.optionType === "neutral" || item.optionType === "unsure")
  ) {
    nextPollDecision = "add_neutral_option";
    nextPollDecisionReason =
      "Eine neutrale oder unsichere Antwortmöglichkeit sollte sichtbar geprüft werden.";
  } else if (questionType === "not_poll_ready") {
    nextPollDecision = "keep_as_discussion";
    nextPollDecisionReason =
      "Der Arbeitsstand passt vorerst besser zu Diskussion, Dossier oder Human-Loop als zu einem Poll.";
  }

  const downstreamReadiness: PollQuestionDownstreamItem[] = [
    {
      id: "participation",
      label: "Participation",
      status:
        input.activationModel?.suggestedFormat === "poll_preparation" && proposedQuestion
          ? "needs_review"
          : participationSuggested
            ? "needs_review"
            : "blocked",
      statusLabel: downstreamStatusLabel(
        input.activationModel?.suggestedFormat === "poll_preparation" && proposedQuestion
          ? "needs_review"
          : participationSuggested
            ? "needs_review"
            : "blocked",
      ),
      reason:
        "Participation braucht weiter den Aktivierungs- und Review-Pfad; Poll Preview allein startet nichts.",
      reviewRequired: true,
    },
    {
      id: "output",
      label: "Output",
      status:
        input.activationModel?.downstreamReadiness.find((item) => item.id === "output")?.status ===
        "prepared"
          ? "needs_review"
          : "blocked",
      statusLabel: downstreamStatusLabel(
        input.activationModel?.downstreamReadiness.find((item) => item.id === "output")?.status ===
        "prepared"
          ? "needs_review"
          : "blocked",
      ),
      reason:
        "Output braucht weiterhin Briefing-, Dossier- und Freigabewahrheit, nicht nur einen Poll-Kandidaten.",
      reviewRequired: true,
    },
    {
      id: "social",
      label: "Social",
      status: "blocked",
      statusLabel: downstreamStatusLabel("blocked"),
      reason:
        "Social bleibt ohne manuelles Briefing, Review und Publish-Gate blockiert.",
      reviewRequired: true,
    },
    {
      id: "voxyBriefing",
      label: "Voxy Briefing",
      status:
        input.providerBlocked
          ? "blocked"
          : proposedQuestion
            ? "needs_review"
            : "blocked",
      statusLabel: downstreamStatusLabel(
        input.providerBlocked
          ? "blocked"
          : proposedQuestion
            ? "needs_review"
            : "blocked",
      ),
      reason:
        input.providerBlocked
          ? "Voxy-Briefing bleibt durch Provider- oder Secret-Gates blockiert."
          : proposedQuestion
            ? "Ein Voxy-Briefing könnte die Poll-Frage später erwähnen, bleibt aber review-first."
            : "Ohne belastbare Frage ist auch ein Voxy-Briefing dazu noch nicht sinnvoll.",
      reviewRequired: true,
    },
    {
      id: "publicPoll",
      label: "Public Poll",
      status:
        !participationSuggested || questionType === "not_poll_ready"
          ? "blocked"
          : input.runtimeTruthMissing
            ? "blocked"
            : reviewBlockers.length > 0 || biasReviewNeeds.length > 0
              ? "needs_review"
              : "prepared",
      statusLabel: downstreamStatusLabel(
        !participationSuggested || questionType === "not_poll_ready"
          ? "blocked"
          : input.runtimeTruthMissing
            ? "blocked"
            : reviewBlockers.length > 0 || biasReviewNeeds.length > 0
              ? "needs_review"
              : "prepared",
      ),
      reason:
        !participationSuggested || questionType === "not_poll_ready"
          ? "Ohne belastbaren Poll-Kandidaten bleibt jeder öffentliche Poll blockiert."
          : input.runtimeTruthMissing
            ? "Öffentlicher Poll bleibt ohne Runtime-Wahrheit und Review strikt gesperrt."
            : reviewBlockers.length > 0 || biasReviewNeeds.length > 0
              ? "Frage, Optionen, Bias-Check oder Scope sind noch reviewpflichtig."
              : "Die Poll-Vorschau ist vorbereitet, bleibt aber bis zur Freigabe nicht öffentlich.",
      reviewRequired: true,
    },
  ];

  return {
    title: "Poll/Frage vorbereiten",
    summary:
      "Dieser Layer bereitet nur Frage, Fragetyp, Antwortoptionen und Bias-Review review-first vor. Es wird nichts veröffentlicht, aktiviert oder öffentlich gestartet.",
    surface: input.surface,
    contributionRef: input.contributionRef ?? null,
    dossierRef: input.dossierRef ?? null,
    participationRef: input.participationRef ?? null,
    sourceLanguage: input.sourceLanguage,
    readingLanguage: input.readingLanguage,
    languageLabel: `Original: ${languageName(input.sourceLanguage)} · Lesefassung: ${languageName(input.readingLanguage)}${input.rtlDisplayHint ? " · RTL-Hinweis aktiv" : ""}`,
    originalPreserved: true,
    translationIsEvidence: false,
    rtlDisplayHint: input.rtlDisplayHint,
    pollStatus,
    pollStatusLabel: pollStatusLabel(pollStatus),
    questionType,
    questionTypeLabel: questionTypeLabel(questionType),
    proposedQuestion,
    questionGuard,
    questionConfidence,
    questionConfidenceLabel: questionConfidenceLabel(questionConfidence),
    questionReason,
    optionItems,
    missingOptionNeeds,
    biasReviewNeeds,
    eligibilitySignals,
    participationScope: scope,
    participationScopeLabel: scopeLabel(scope),
    targetGroups,
    reviewBlockers,
    downstreamReadiness,
    nextPollDecision: {
      id: nextPollDecision,
      label: nextDecisionLabel(nextPollDecision),
      reason: nextPollDecisionReason,
    },
    publicSafeLabel: "Vorschlag, kein Poll",
    userVisibleReason: input.userVisibleReason,
    reviewerVisibleReason: input.reviewerVisibleReason,
    nextStep: input.nextStep,
    reviewRequired: true,
    noPollAction: true,
    noPublishAction: true,
    noRuntimeClaim: true,
  };
}

export function buildPollQuestionOptionsReviewFromCreateCandidatePreview(
  model: CreateCandidatePreviewReadModel,
): PollQuestionOptionsReviewModel | null {
  if (!model.hasPreview || !model.voxyCocreationDialog) return null;
  const sourceModel = buildSourceFactcheckFeedEnrichmentFromCreateCandidatePreview(model);
  const dossierModel = buildDossierWorkspaceDecisionFromCreateCandidatePreview(model);
  const activationModel =
    buildParticipationActivationReviewFromCreateCandidatePreview(model);
  const pollSection = model.sections.find((section) => section.kind === "poll");
  return buildModelFromSignals({
    surface: "create",
    contributionRef: model.voxyCocreationDialog.contributionRef,
    participationRef: pollSection?.items[0]
      ? {
          id: pollSection.items[0].id,
          title: pollSection.items[0].title,
        }
      : null,
    sourceLanguage: model.voxyCocreationDialog.sourceLanguage,
    readingLanguage: model.voxyCocreationDialog.readingLanguage,
    rtlDisplayHint: model.voxyCocreationDialog.rtl,
    translationAvailable: model.voxyCocreationDialog.translationAvailable,
    texts: model.sections.flatMap((section) => section.items).map((item) => item.title),
    questionHints: uniqueStrings([
      ...model.sections
        .filter((section) => section.kind === "question" || section.kind === "poll")
        .flatMap((section) => section.items)
        .map((item) => item.title),
      dossierModel?.openQuestions[0] ?? null,
      activationModel?.proposedParticipationQuestion ?? null,
    ]),
    openQuestions: dossierModel?.openQuestions ?? [],
    optionSeeds: uniqueStrings(
      model.claimToDossierPipeline.items
        .filter((item) => item.candidateType === "poll")
        .flatMap((item) => item.evidenceRefs),
    ).map((label) => ({ label })),
    sourceModel,
    dossierModel,
    activationModel,
    voxyDialog: model.voxyCocreationDialog,
    runtimeTruthMissing:
      model.providerRuntimeTruth === "missing_runtime_truth" ||
      model.reviewHandoff.persistenceTruth === "missing_persistence_truth",
    providerBlocked: false,
    missingReview: true,
    nextStep:
      "Frage, Optionen, Scope und Bias-Review prüfen, bevor eine Poll-Vorbereitung weitergereicht wird.",
    userVisibleReason:
      "Die Vorschau zeigt nur, welche Poll-Frage und Optionen denkbar wären und was davor noch fehlt.",
    reviewerVisibleReason:
      "Create bleibt eine review-first Poll-Vorschau. Weder Poll noch Veröffentlichung oder Aktivierung werden automatisch ausgelöst.",
  });
}

export function buildPollQuestionOptionsReviewFromReviewContext(
  context: V3ReviewQueueWiringContext | null | undefined,
  options?: {
    audience?: "admin" | "workspace";
    contributionRef?: PollRef | null;
    dossierRef?: PollRef | null;
  },
): PollQuestionOptionsReviewModel | null {
  if (!context?.languageBridge) return null;
  const sourceModel = buildSourceFactcheckFeedEnrichmentFromReviewContext(context, {
    audience: options?.audience === "workspace" ? "workspace" : "admin",
    contributionRef: options?.contributionRef ?? null,
  });
  const dossierModel = buildDossierWorkspaceDecisionFromReviewContext(context, {
    audience: options?.audience === "workspace" ? "workspace" : "admin",
    contributionRef: options?.contributionRef ?? null,
    dossierRef: options?.dossierRef ?? null,
  });
  const activationModel = buildParticipationActivationReviewFromReviewContext(context, {
    audience: options?.audience === "workspace" ? "workspace" : "admin",
    contributionRef: options?.contributionRef ?? null,
    dossierRef: options?.dossierRef ?? null,
  });
  const voxyDialog = buildVoxyCocreationDialogFromReviewContext(context, {
    contributionRef: options?.contributionRef ?? null,
    surface: options?.audience === "workspace" ? "workspace" : "admin",
    maxCards: 4,
  });
  const firstParticipation = context.participationCandidates[0] ?? null;
  return buildModelFromSignals({
    surface: options?.audience === "workspace" ? "workspace" : "admin",
    contributionRef: options?.contributionRef ?? null,
    dossierRef: options?.dossierRef ?? null,
    participationRef: firstParticipation
      ? {
          id: firstParticipation.id,
          title: firstParticipation.title,
        }
      : null,
    sourceLanguage: context.languageBridge.original.language,
    readingLanguage:
      context.multilingualThread?.readingLocale ?? context.languageBridge.translation.language,
    rtlDisplayHint: Boolean(context.languageBridge.translation.rtl),
    translationAvailable: Boolean(context.languageBridge.translation.text),
    originalInput: context.languageBridge.original.text,
    texts: uniqueStrings([
      ...(context.dossierWorkspaceSurface?.sections.claims ?? []),
      ...(context.dossierWorkspaceSurface?.sections.counterPositions ?? []),
      ...context.participationCandidates.map((candidate) => candidate.title),
      ...context.participationCandidates.map((candidate) => candidate.prompt),
    ]),
    questionHints: uniqueStrings([
      ...context.participationCandidates.map((candidate) => candidate.prompt),
      ...(context.languageBridge.openQuestions ?? []),
      ...(context.dossierWorkspaceSurface?.sections.openQuestions ?? []),
    ]),
    openQuestions: uniqueStrings([
      ...(context.languageBridge.openQuestions ?? []),
      ...(context.dossierWorkspaceSurface?.sections.openQuestions ?? []),
    ]),
    optionSeeds: context.participationCandidates.flatMap((candidate) =>
      candidate.options.map((option) => ({
        label: option.label,
      })),
    ),
    sourceModel,
    dossierModel,
    activationModel,
    voxyDialog,
    runtimeTruthMissing: Boolean(
      context.participationCandidates.length === 0 ||
        context.voxyRenderJob?.status === "blocked_by_runtime_truth" ||
        context.voxyPublishDraft?.status === "blocked_by_runtime_truth",
    ),
    providerBlocked: Boolean(
      context.voxyRenderJob?.status === "blocked_by_provider" ||
        context.voxyRenderJob?.status === "blocked_by_secret",
    ),
    missingReview: true,
    nextStep:
      "Frage, Optionen, Bias- und Scope-Bedarf im bestehenden Review-Kontext prüfen.",
    userVisibleReason:
      "Der Review-Kontext zeigt nur einen Poll-Kandidaten, nicht aber einen gestarteten oder öffentlichen Poll.",
    reviewerVisibleReason:
      "Poll-Frage, Antwortoptionen und mögliche Cross-Lingual-Risiken bleiben Hinweise und keine Freigabeentscheidung.",
  });
}

export function buildPollQuestionOptionsReviewFromVoxyDialog(
  dialog: V3VoxyCocreationDialogModel | null | undefined,
  options?: {
    contributionRef?: PollRef | null;
    nextStep?: string;
  },
): PollQuestionOptionsReviewModel | null {
  if (!dialog) return null;
  const sourceModel = buildSourceFactcheckFeedEnrichmentFromVoxyDialog(dialog, {
    surface: "account",
    nextStep:
      options?.nextStep ?? "Quellen, Beispiele und Betroffenenperspektiven würden eine spätere Poll-Frage verbessern.",
    runtimeTruthMissing: true,
  });
  const dossierModel = buildDossierWorkspaceDecisionFromVoxyDialog(dialog, {
    contributionRef: options?.contributionRef ?? dialog.contributionRef,
    surface: "account",
    nextStep:
      options?.nextStep ?? "Erst Beispiele, Gegenperspektiven und offene Fragen weiter schärfen.",
  });
  const activationModel = buildParticipationActivationReviewFromVoxyDialog(dialog, {
    contributionRef: options?.contributionRef ?? dialog.contributionRef,
    nextStep: options?.nextStep,
  });
  return buildModelFromSignals({
    surface: "account",
    contributionRef: options?.contributionRef ?? dialog.contributionRef,
    sourceLanguage: dialog.sourceLanguage,
    readingLanguage: dialog.readingLanguage,
    rtlDisplayHint: dialog.rtl,
    translationAvailable: dialog.translationAvailable,
    texts: uniqueStrings([
      dialog.contributionRef?.title ?? null,
      ...dialog.cards.map((card) => card.userVisibleQuestion),
    ]),
    questionHints: dialog.cards.map((card) => card.userVisibleQuestion),
    openQuestions: dialog.cards.map((card) => card.userVisibleQuestion),
    optionSeeds: [],
    sourceModel,
    dossierModel,
    activationModel,
    voxyDialog: dialog,
    runtimeTruthMissing: true,
    providerBlocked: false,
    missingReview: true,
    nextStep:
      options?.nextStep ?? "Arbeitsstand schärfen, bevor eine Poll-Frage oder Optionen vorbereitet werden.",
    userVisibleReason:
      "Im Account bleibt diese Poll-Vorbereitung ein lokaler oder readmodel-only Arbeitsstand.",
    reviewerVisibleReason:
      "Ohne persisted Handoff oder Runtime-Wahrheit bleibt der Poll-Pfad bewusst nicht öffentlich und nicht gestartet.",
  });
}
