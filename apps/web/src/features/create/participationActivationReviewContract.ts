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

export const PARTICIPATION_ACTIVATION_REVIEW_STATUSES = [
  "readmodel_only",
  "activation_preview",
  "needs_editorial_review",
  "needs_source_review",
  "needs_factcheck_review",
  "needs_human_input",
  "needs_scope_decision",
  "needs_format_decision",
  "blocked_by_runtime_truth",
  "blocked_by_missing_review",
  "blocked_by_provider",
] as const;

export type ParticipationActivationReviewStatus =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_STATUSES)[number];

export const PARTICIPATION_ACTIVATION_REVIEW_FORMATS = [
  "clarification_dialogue",
  "argument_collection",
  "pro_contra_debate",
  "source_review",
  "experience_collection",
  "expert_review_request",
  "local_issue_room",
  "policy_feedback",
  "poll_preparation",
  "petition_like_signal",
  "stakeholder_mapping",
  "multilingual_roundtable",
  "voxy_guided_refinement",
  "dossier_only_keep_draft",
] as const;

export type ParticipationActivationReviewFormat =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_FORMATS)[number];

export const PARTICIPATION_ACTIVATION_REVIEW_CONFIDENCE = [
  "strong",
  "medium",
  "weak",
  "missing",
] as const;

export type ParticipationActivationReviewConfidence =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_CONFIDENCE)[number];

export const PARTICIPATION_ACTIVATION_REVIEW_SCOPES = [
  "local",
  "regional",
  "national",
  "eu",
  "global",
  "multilingual",
] as const;

export type ParticipationActivationReviewScope =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_SCOPES)[number];

export const PARTICIPATION_ACTIVATION_REVIEW_READINESS_SIGNALS = [
  "thesis_present",
  "counterposition_needed",
  "source_review_needed",
  "factcheck_needed",
  "human_input_needed",
  "affected_groups_needed",
  "common_good_tension_present",
  "multilingual_review_needed",
  "poll_question_needed",
  "moderation_risk_review_needed",
] as const;

export type ParticipationActivationReviewReadinessSignal =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_READINESS_SIGNALS)[number];

export const PARTICIPATION_ACTIVATION_REVIEW_RISK_FLAGS = [
  "unclear_scope",
  "missing_sources",
  "contested_claims",
  "vulnerable_group_impact",
  "legal_policy_sensitivity",
  "multilingual_misread_risk",
  "public_misinterpretation_risk",
  "low_context_input",
] as const;

export type ParticipationActivationReviewRiskFlag =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_RISK_FLAGS)[number];

export const PARTICIPATION_ACTIVATION_REVIEW_DOWNSTREAM_STATUSES = [
  "blocked",
  "needs_review",
  "prepared",
] as const;

export type ParticipationActivationReviewDownstreamStatus =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_DOWNSTREAM_STATUSES)[number];

export const PARTICIPATION_ACTIVATION_REVIEW_NEXT_DECISIONS = [
  "clarify_scope",
  "choose_format",
  "request_human_input",
  "request_sources",
  "review_claims",
  "prepare_poll_question",
  "prepare_invitation_copy",
  "keep_as_dossier_draft",
  "blocked",
] as const;

export type ParticipationActivationReviewNextDecision =
  (typeof PARTICIPATION_ACTIVATION_REVIEW_NEXT_DECISIONS)[number];

type ParticipationActivationReviewSurface =
  | "create"
  | "account"
  | "admin"
  | "workspace";

type ParticipationRef = {
  id: string;
  title: string;
  href?: string | null;
};

type ParticipationTag<T extends string> = {
  id: T;
  label: string;
  reason: string;
};

export type ParticipationActivationReviewDownstreamItem = {
  id: "poll" | "output" | "social" | "voxyBriefing" | "publicActivation";
  label: string;
  status: ParticipationActivationReviewDownstreamStatus;
  statusLabel: string;
  reason: string;
  reviewRequired: true;
};

export type ParticipationActivationReviewModel = {
  title: string;
  summary: string;
  surface: ParticipationActivationReviewSurface;
  contributionRef: ParticipationRef | null;
  dossierRef: ParticipationRef | null;
  sourceLanguage: string;
  readingLanguage: string;
  languageLabel: string;
  originalPreserved: true;
  translationIsEvidence: false;
  rtlDisplayHint: boolean;
  activationStatus: ParticipationActivationReviewStatus;
  activationStatusLabel: string;
  suggestedFormat: ParticipationActivationReviewFormat;
  suggestedFormatLabel: string;
  formatConfidence: ParticipationActivationReviewConfidence;
  formatConfidenceLabel: string;
  formatReason: string;
  proposedParticipationQuestion: string | null;
  questionGuard: PublicQuestionGeneralizationResult | null;
  targetGroups: string[];
  stakeholderGroups: string[];
  participationScope: ParticipationActivationReviewScope;
  participationScopeLabel: string;
  participationScopeReason: string;
  readinessSignals: ParticipationTag<ParticipationActivationReviewReadinessSignal>[];
  riskFlags: ParticipationTag<ParticipationActivationReviewRiskFlag>[];
  blockers: string[];
  downstreamReadiness: ParticipationActivationReviewDownstreamItem[];
  nextActivationDecision: {
    id: ParticipationActivationReviewNextDecision;
    label: string;
    reason: string;
  };
  publicSafeLabel: string;
  userVisibleReason: string;
  reviewerVisibleReason: string;
  nextStep: string;
  reviewRequired: true;
  noActivationAction: true;
  noPublishAction: true;
  noRuntimeClaim: true;
};

type BuildSignalsInput = {
  surface: ParticipationActivationReviewSurface;
  contributionRef?: ParticipationRef | null;
  dossierRef?: ParticipationRef | null;
  sourceLanguage: string;
  readingLanguage: string;
  rtlDisplayHint: boolean;
  translationAvailable: boolean;
  originalInput?: string | null;
  texts: string[];
  questionHints: string[];
  openQuestions: string[];
  sourceModel: SourceFactcheckFeedEnrichmentModel | null;
  dossierModel: DossierWorkspaceDecisionModel | null;
  voxyDialog: V3VoxyCocreationDialogModel | null;
  participationCandidateLabels: string[];
  participationCandidateKinds: string[];
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

function activationStatusLabel(value: ParticipationActivationReviewStatus): string {
  if (value === "activation_preview") return "Aktivierungsvorschau";
  if (value === "needs_editorial_review") return "Redaktionelle Prüfung offen";
  if (value === "needs_source_review") return "Quellenprüfung offen";
  if (value === "needs_factcheck_review") return "Factcheck-Prüfung offen";
  if (value === "needs_human_input") return "Menschliche Ergänzung offen";
  if (value === "needs_scope_decision") return "Scope-Entscheidung offen";
  if (value === "needs_format_decision") return "Formatentscheidung offen";
  if (value === "blocked_by_runtime_truth") return "Runtime-Wahrheit fehlt";
  if (value === "blocked_by_missing_review") return "Review-Handoff fehlt";
  if (value === "blocked_by_provider") return "Provider-Gate blockiert";
  return "Nur Readmodel";
}

function formatLabel(value: ParticipationActivationReviewFormat): string {
  if (value === "clarification_dialogue") return "Klärungsdialog";
  if (value === "argument_collection") return "Argumentesammlung";
  if (value === "pro_contra_debate") return "Pro-und-Contra-Debatte";
  if (value === "source_review") return "Quellen-Review";
  if (value === "experience_collection") return "Erfahrungssammlung";
  if (value === "expert_review_request") return "Expert:innen-Review anfragen";
  if (value === "local_issue_room") return "Lokaler Anliegenraum";
  if (value === "policy_feedback") return "Policy-Feedback";
  if (value === "poll_preparation") return "Poll-Vorbereitung";
  if (value === "petition_like_signal") return "Petitionsähnliches Signal";
  if (value === "stakeholder_mapping") return "Stakeholder-Mapping";
  if (value === "multilingual_roundtable") return "Mehrsprachige Runde";
  if (value === "voxy_guided_refinement") return "Voxy-gestützte Nachschärfung";
  return "Als Dossier-Entwurf belassen";
}

function confidenceLabel(value: ParticipationActivationReviewConfidence): string {
  if (value === "strong") return "Hohe Sicherheit";
  if (value === "medium") return "Mittlere Sicherheit";
  if (value === "weak") return "Niedrige Sicherheit";
  return "Noch kein belastbarer Vorschlag";
}

function scopeLabel(value: ParticipationActivationReviewScope): string {
  if (value === "local") return "Lokal";
  if (value === "regional") return "Regional";
  if (value === "national") return "National";
  if (value === "eu") return "EU";
  if (value === "global") return "Global";
  return "Mehrsprachig";
}

function readinessLabel(
  value: ParticipationActivationReviewReadinessSignal,
): string {
  if (value === "thesis_present") return "Kernthese sichtbar";
  if (value === "counterposition_needed") return "Gegenposition fehlt";
  if (value === "source_review_needed") return "Quellenprüfung nötig";
  if (value === "factcheck_needed") return "Factcheck-Prüfung nötig";
  if (value === "human_input_needed") return "Menschliche Ergänzung nötig";
  if (value === "affected_groups_needed") return "Betroffene Gruppen fehlen";
  if (value === "common_good_tension_present") return "Gemeinwohlkonflikt sichtbar";
  if (value === "multilingual_review_needed") return "Sprachübergreifende Prüfung nötig";
  if (value === "poll_question_needed") return "Poll-Frage fehlt";
  return "Moderations- und Risikoprüfung nötig";
}

function riskLabel(value: ParticipationActivationReviewRiskFlag): string {
  if (value === "unclear_scope") return "Scope unklar";
  if (value === "missing_sources") return "Quellen fehlen";
  if (value === "contested_claims") return "Umstrittene Behauptungen";
  if (value === "vulnerable_group_impact") return "Betroffene vulnerable Gruppen";
  if (value === "legal_policy_sensitivity") return "Rechtlich oder politisch sensibel";
  if (value === "multilingual_misread_risk") return "Mehrsprachiges Missverständnisrisiko";
  if (value === "public_misinterpretation_risk") return "Öffentliches Fehlverständnis möglich";
  return "Zu wenig Kontext";
}

function downstreamStatusLabel(
  value: ParticipationActivationReviewDownstreamStatus,
): string {
  if (value === "prepared") return "Vorbereitet";
  if (value === "needs_review") return "Review nötig";
  return "Blockiert";
}

function nextDecisionLabel(value: ParticipationActivationReviewNextDecision): string {
  if (value === "clarify_scope") return "Scope klären";
  if (value === "choose_format") return "Format bewusst wählen";
  if (value === "request_human_input") return "Menschliche Ergänzung anfragen";
  if (value === "request_sources") return "Quellen anfragen";
  if (value === "review_claims") return "Behauptungen prüfen";
  if (value === "prepare_poll_question") return "Poll-Frage vorbereiten";
  if (value === "prepare_invitation_copy") return "Einladungstext vorbereiten";
  if (value === "keep_as_dossier_draft") return "Als Dossier-Entwurf belassen";
  return "Vorläufig blockiert";
}

function hasLocalCue(text: string): boolean {
  return containsPattern(text, [
    /\b(kiez|bezirk|straße|strasse|schule|kita|stadtteil|kommune|gemeinde|nachbarschaft|anwohner|ort)\b/i,
    /\b(kiez|district|neighborhood|street|school|city|municipality|residents)\b/i,
    /\b(mahalle|ilçe|sokak|okul|belediye|komşu)\b/i,
    /(?:حي|منطقة|شارع|مدرسة|بلدية|السكان)/i,
  ]);
}

function hasRegionalCue(text: string): boolean {
  return containsPattern(text, [
    /\b(region|landkreis|bundesland|metropolregion)\b/i,
    /\b(region|county|state)\b/i,
    /\b(bölge|eyalet)\b/i,
    /(?:إقليم|منطقة)/i,
  ]);
}

function hasNationalCue(text: string): boolean {
  return containsPattern(text, [
    /\b(deutschland|bund|bundesweit|national)\b/i,
    /\b(germany|federal|national)\b/i,
    /\b(ulusal|ülke)\b/i,
    /(?:وطني|الدولة)/i,
  ]);
}

function hasEuCue(text: string): boolean {
  return containsPattern(text, [
    /\b(eu|europa|europäisch|europaeisch)\b/i,
    /\b(europe|european union)\b/i,
    /\b(avrupa|ab)\b/i,
    /(?:الاتحاد الأوروبي|أوروبا)/i,
  ]);
}

function hasGlobalCue(text: string): boolean {
  return containsPattern(text, [
    /\b(global|weltweit|international)\b/i,
    /\b(global|worldwide|international)\b/i,
    /\b(küresel|uluslararası)\b/i,
    /(?:عالمي|دولي)/i,
  ]);
}

function hasPolicyCue(text: string): boolean {
  return containsPattern(text, [
    /\b(gesetz|verordnung|regel|regeln|satzung|richtlinie|politik|haushalt|verwaltung)\b/i,
    /\b(law|policy|regulation|rules|budget|administration)\b/i,
    /\b(yasa|politika|yönetmelik|kural|bütçe|belediye)\b/i,
    /(?:قانون|سياسة|لائحة|ميزانية|إدارة)/i,
  ]);
}

function hasExperienceCue(text: string): boolean {
  return containsPattern(text, [
    /\b(ich|wir|erlebt|erfahrung|beobachtung|betroffen)\b/i,
    /\b(i|we|experience|experienced|observation|affected)\b/i,
    /\b(ben|biz|deneyim|yaşadım|gözlem|etkilenen)\b/i,
    /(?:أنا|نحن|تجربة|عايشت|ملاحظة|متأثر)/i,
  ]);
}

function hasDemandCue(text: string): boolean {
  return containsPattern(text, [
    /\b(fordern|forderung|muss|müssen|soll|sollte|braucht)\b/i,
    /\b(demand|must|should|needs)\b/i,
    /\b(talep|gerekir|olmalı|istemek)\b/i,
    /(?:يجب|مطالبة|نحتاج)/i,
  ]);
}

function hasVulnerableGroupCue(text: string): boolean {
  return containsPattern(text, [
    /\b(kinder|jugendliche|pflege|behinderung|geflüchtete|gefluechtete|senioren)\b/i,
    /\b(children|youth|care|disability|refugees|elderly)\b/i,
    /\b(çocuklar|gençler|engelli|mülteci|yaşlı)\b/i,
    /(?:أطفال|شباب|إعاقة|لاجئين|كبار السن)/i,
  ]);
}

function detectTargetGroups(text: string): string[] {
  const groups: string[] = [];
  if (containsPattern(text, [/\b(eltern|familien|kinder|schüler|schueler)\b/i, /\b(parents|families|children|students)\b/i, /\b(ebeveyn|aile|çocuk|öğrenci)\b/i, /(?:الأهالي|العائلات|الأطفال|الطلاب)/i])) {
    groups.push("Eltern, Familien und Kinder");
  }
  if (containsPattern(text, [/\b(anwohner|bewohner|nachbarn|mieter)\b/i, /\b(residents|neighbors|tenants)\b/i, /\b(sakin|komşu|kiracı)\b/i, /(?:السكان|الجيران|المستأجرين)/i])) {
    groups.push("Anwohnende und Nachbarschaften");
  }
  if (containsPattern(text, [/\b(pendler|verkehr|radweg|fußgänger|fussgänger)\b/i, /\b(commuters|traffic|bike|pedestrians)\b/i, /\b(yaya|trafik|bisiklet|yolcu)\b/i, /(?:المشاة|المرور|الدراجات|الركاب)/i])) {
    groups.push("Pendler:innen und Verkehrsteilnehmende");
  }
  if (containsPattern(text, [/\b(vereine|initiativen|zivilgesellschaft)\b/i, /\b(civil society|associations|community groups)\b/i, /\b(dernek|inisiyatif|sivil toplum)\b/i, /(?:المجتمع المدني|جمعيات|مبادرات)/i])) {
    groups.push("Zivilgesellschaftliche Gruppen");
  }
  if (containsPattern(text, [/\b(unternehmen|handel|gewerbe|wirtschaft)\b/i, /\b(business|shops|economy|companies)\b/i, /\b(işletme|ticaret|ekonomi|şirket)\b/i, /(?:شركات|اقتصاد|تجارة)/i])) {
    groups.push("Unternehmen und lokales Gewerbe");
  }
  return groups;
}

function detectStakeholderGroups(params: {
  text: string;
  sourceNeeds: string[];
  multilingual: boolean;
  localScope: boolean;
  policyScope: boolean;
}): string[] {
  const groups = detectTargetGroups(params.text);
  if (params.localScope) groups.push("Kommune, Bezirk oder lokale Verwaltung");
  if (params.policyScope) groups.push("Fachverwaltung und politische Entscheidungsträger:innen");
  if (
    containsPattern(params.text, [/\b(expert|studie|gutachten|forschung|wissenschaft)\b/i, /\b(expert|study|research|science)\b/i, /\b(uzman|araştırma|bilim)\b/i, /(?:خبير|دراسة|بحث|علم)/i]) ||
    params.sourceNeeds.some((item) =>
      lowerJoined([item]).includes("wissenschaft") ||
      lowerJoined([item]).includes("rechts") ||
      lowerJoined([item]).includes("amtlich"),
    )
  ) {
    groups.push("Fachöffentlichkeit und Expert:innen");
  }
  if (params.multilingual) {
    groups.push("Mehrsprachige Communities und Übersetzungsreview");
  }
  return uniqueStrings(groups);
}

function inferScope(params: {
  text: string;
  sourceLanguage: string;
  readingLanguage: string;
  referenceScopeLabels: string[];
}): {
  id: ParticipationActivationReviewScope;
  reason: string;
} {
  if (
    params.sourceLanguage !== params.readingLanguage ||
    params.referenceScopeLabels.some((entry) => lowerJoined([entry]).includes("mehrsprach"))
  ) {
    return {
      id: "multilingual",
      reason:
        "Originalsprache und Lesefassung weichen ab oder der Review-Kontext fordert sprachübergreifende Beteiligung.",
    };
  }
  if (
    params.referenceScopeLabels.some((entry) => lowerJoined([entry]).includes("lokal")) ||
    hasLocalCue(params.text)
  ) {
    return {
      id: "local",
      reason:
        "Der Arbeitsstand verweist auf konkrete Orte, Einrichtungen oder direkt betroffene lokale Gruppen.",
    };
  }
  if (
    params.referenceScopeLabels.some((entry) => lowerJoined([entry]).includes("regional")) ||
    hasRegionalCue(params.text)
  ) {
    return {
      id: "regional",
      reason:
        "Der Arbeitsstand bezieht sich eher auf eine Region oder mehrere Orte als auf nur einen lokalen Fall.",
    };
  }
  if (
    params.referenceScopeLabels.some((entry) => lowerJoined([entry]).includes("eu")) ||
    hasEuCue(params.text)
  ) {
    return {
      id: "eu",
      reason:
        "Der Review-Kontext verweist auf europäische Regeln, Vergleiche oder eine grenzüberschreitende Einordnung.",
    };
  }
  if (
    params.referenceScopeLabels.some((entry) => lowerJoined([entry]).includes("global")) ||
    hasGlobalCue(params.text)
  ) {
    return {
      id: "global",
      reason:
        "Der Arbeitsstand verlangt einen internationalen oder globalen Vergleichsraum.",
    };
  }
  if (
    params.referenceScopeLabels.some((entry) => lowerJoined([entry]).includes("national")) ||
    hasNationalCue(params.text)
  ) {
    return {
      id: "national",
      reason:
        "Das Thema wirkt eher bundesweit oder allgemein politisch als nur lokal eingegrenzt.",
    };
  }
  return {
    id: "national",
    reason:
      "Ohne klaren Ortsbezug bleibt der Scope vorläufig breit und muss bewusst geprüft werden.",
  };
}

function buildQuestionSuggestion(params: {
  format: ParticipationActivationReviewFormat;
  questionHints: string[];
  title: string | null;
  targetGroups: string[];
}): string | null {
  const questionHint = uniqueStrings(params.questionHints)[0] ?? null;
  if (questionHint) return questionHint;

  if (params.format === "poll_preparation") {
    return "Welche Option sollte vor einer Aktivierung zuerst geprüft oder priorisiert werden?";
  }
  if (params.format === "local_issue_room") {
    return "Welche konkrete Veränderung sollte vor Ort zuerst gemeinsam geklärt werden?";
  }
  if (params.format === "policy_feedback") {
    return "Welche Regel, Maßnahme oder Priorität sollte zuerst überprüft werden?";
  }
  if (params.format === "source_review") {
    return "Welche Behauptung braucht vor einer Aktivierung zuerst belastbare Quellen?";
  }
  if (params.format === "pro_contra_debate") {
    return "Welche Gegenposition muss sichtbar werden, bevor aktiviert werden darf?";
  }
  if (params.format === "stakeholder_mapping") {
    return "Welche Gruppen müssen vor einer Aktivierung noch benannt oder eingeladen werden?";
  }
  if (params.format === "multilingual_roundtable") {
    return "Welche Frage sollte sprachübergreifend gemeinsam geklärt werden?";
  }
  if (params.format === "expert_review_request") {
    return "Welche fachliche Einordnung fehlt noch vor einer Aktivierung?";
  }
  if (params.format === "experience_collection") {
    return "Welche Erfahrungen der Betroffenen fehlen noch?";
  }
  if (params.format === "dossier_only_keep_draft") {
    return "Was muss am Arbeitsstand noch geklärt werden, bevor überhaupt ein Beteiligungsformat passt?";
  }
  const title = normalizeText(params.title);
  if (title) {
    return `${title}: Welche Frage sollte vor einer Aktivierung zuerst gemeinsam geklärt werden?`;
  }
  if (params.targetGroups.length > 0) {
    return `Welche Frage ist für ${params.targetGroups[0]} vor einer Aktivierung am wichtigsten?`;
  }
  return "Welcher Kernpunkt sollte vor einer Aktivierung zuerst gemeinsam geklärt werden?";
}

function createTag<T extends string>(
  id: T,
  label: string,
  reason: string,
): ParticipationTag<T> {
  return { id, label, reason };
}

function buildModelFromSignals(
  input: BuildSignalsInput,
): ParticipationActivationReviewModel {
  const allTexts = uniqueStrings([
    ...input.texts,
    ...input.openQuestions,
    ...input.questionHints,
    input.contributionRef?.title ?? null,
    input.dossierRef?.title ?? null,
    input.dossierModel?.thesis.label ?? null,
    input.dossierModel?.counterposition.summary ?? null,
  ]);
  const textBlob = lowerJoined(allTexts);
  const title = normalizeText(input.dossierRef?.title) || normalizeText(input.contributionRef?.title);
  const sourceNeeds = input.sourceModel?.sourceNeeds.map((item) => item.label) ?? [];
  const factcheckQuestions = input.sourceModel?.factcheckQuestions.map((item) => item.question) ?? [];
  const claimReviewNeeds = input.sourceModel?.claimReviewNeeds.map((item) => item.label) ?? [];
  const referenceScopes = input.sourceModel?.referenceScopes.map((item) => item.label) ?? [];
  const humanInputNeeded = Boolean(
    input.voxyDialog?.status === "needs_user_input" ||
      input.voxyDialog?.cards.some((card) => card.status === "needs_user_input"),
  );
  const sourceReviewNeeded =
    sourceNeeds.length > 0 ||
    input.sourceModel?.enrichmentStatus === "needs_source_review";
  const factcheckNeeded =
    factcheckQuestions.length > 0 ||
    input.sourceModel?.enrichmentStatus === "needs_factcheck_review";
  const thesisPresent = Boolean(
    normalizeText(input.dossierModel?.thesis.label) &&
      input.dossierModel?.thesis.confidence !== "missing",
  );
  const counterpositionNeeded =
    input.dossierModel?.counterposition.status === "missing" ||
    input.dossierModel?.counterposition.status === "suggested";
  const commonGoodTensionPresent =
    (input.dossierModel?.commonGoodTensions.length ?? 0) > 0 ||
    (input.sourceModel?.commonGoodEvidenceNeeds.length ?? 0) > 0;
  const multilingualReviewNeeded =
    input.sourceLanguage !== input.readingLanguage ||
    input.rtlDisplayHint ||
    referenceScopes.some((scope) => lowerJoined([scope]).includes("mehrsprach"));
  const inferredScope = inferScope({
    text: textBlob,
    sourceLanguage: input.sourceLanguage,
    readingLanguage: input.readingLanguage,
    referenceScopeLabels: referenceScopes,
  });
  const targetGroups = uniqueStrings([
    ...(input.dossierModel?.affectedGroups ?? []),
    ...detectTargetGroups(textBlob),
  ]);
  const stakeholderGroups = detectStakeholderGroups({
    text: textBlob,
    sourceNeeds,
    multilingual: multilingualReviewNeeded,
    localScope: inferredScope.id === "local" || inferredScope.id === "regional",
    policyScope: hasPolicyCue(textBlob),
  });
  const affectedGroupsNeeded =
    targetGroups.length === 0 ||
    (input.sourceModel?.affectedGroupEvidenceNeeds.length ?? 0) > 0;
  const hasPollCandidate =
    input.participationCandidateKinds.includes("poll_candidate") ||
    containsPattern(textBlob, [/\b(welche|which|hangi|أي)\b/i]) ||
    input.questionHints.some((question) => question.includes("?"));
  const lowContextInput =
    !thesisPresent &&
    input.texts.length <= 1 &&
    input.openQuestions.length <= 1 &&
    targetGroups.length === 0;
  const unclearScope =
    inferredScope.id === "national" &&
    !hasNationalCue(textBlob) &&
    !hasPolicyCue(textBlob) &&
    !multilingualReviewNeeded;
  const contestedClaims =
    claimReviewNeeds.some((item) =>
      lowerJoined([item]).includes("tatsachen") ||
      lowerJoined([item]).includes("kausal") ||
      lowerJoined([item]).includes("umstritten"),
    ) || counterpositionNeeded;
  const vulnerableGroupImpact =
    hasVulnerableGroupCue(textBlob) ||
    targetGroups.some((group) =>
      lowerJoined([group]).includes("kinder") ||
      lowerJoined([group]).includes("familien"),
    );
  const legalPolicySensitivity =
    hasPolicyCue(textBlob) ||
    sourceNeeds.some((item) =>
      lowerJoined([item]).includes("rechts") ||
      lowerJoined([item]).includes("policy") ||
      lowerJoined([item]).includes("amtlich"),
    );
  const multilingualMisreadRisk = multilingualReviewNeeded;
  const publicMisinterpretationRisk =
    hasPollCandidate ||
    contestedClaims ||
    (lowContextInput && sourceReviewNeeded);
  const missingSources = sourceReviewNeeded;

  const riskFlags: ParticipationTag<ParticipationActivationReviewRiskFlag>[] = [];
  if (unclearScope) {
    riskFlags.push(
      createTag(
        "unclear_scope",
        riskLabel("unclear_scope"),
        "Ohne klaren Referenzraum kann das Beteiligungsformat leicht über- oder untersteuern.",
      ),
    );
  }
  if (missingSources) {
    riskFlags.push(
      createTag(
        "missing_sources",
        riskLabel("missing_sources"),
        "Vor einer Aktivierung fehlen noch belastbare Quellen, Referenzen oder Beobachtungen.",
      ),
    );
  }
  if (contestedClaims) {
    riskFlags.push(
      createTag(
        "contested_claims",
        riskLabel("contested_claims"),
        "Umstrittene oder prüfpflichtige Behauptungen sollten nicht direkt in öffentliche Aktivierung übersetzt werden.",
      ),
    );
  }
  if (vulnerableGroupImpact) {
    riskFlags.push(
      createTag(
        "vulnerable_group_impact",
        riskLabel("vulnerable_group_impact"),
        "Betroffene oder vulnerable Gruppen brauchen vor Aktivierung eine sorgfältige Einordnung.",
      ),
    );
  }
  if (legalPolicySensitivity) {
    riskFlags.push(
      createTag(
        "legal_policy_sensitivity",
        riskLabel("legal_policy_sensitivity"),
        "Rechtliche, haushalterische oder policy-nahe Folgen verlangen bewusste Review- und Scope-Entscheidungen.",
      ),
    );
  }
  if (multilingualMisreadRisk) {
    riskFlags.push(
      createTag(
        "multilingual_misread_risk",
        riskLabel("multilingual_misread_risk"),
        "Sprachübergreifende Beteiligung braucht sichtbaren Übersetzungs- und Originaltextkontext.",
      ),
    );
  }
  if (publicMisinterpretationRisk) {
    riskFlags.push(
      createTag(
        "public_misinterpretation_risk",
        riskLabel("public_misinterpretation_risk"),
        "Ein zu früher öffentlicher Schritt könnte Vorschlag, Meinung und belastbare Prüfung vermischen.",
      ),
    );
  }
  if (lowContextInput) {
    riskFlags.push(
      createTag(
        "low_context_input",
        riskLabel("low_context_input"),
        "Der Arbeitsstand ist noch zu knapp, um daraus direkt ein tragfähiges Beteiligungsformat abzuleiten.",
      ),
    );
  }

  const needsClarification =
    !thesisPresent ||
    lowContextInput ||
    input.voxyDialog?.cards.some((card) =>
      ["contribution_clarification", "example_request", "solution_path_probe"].includes(
        card.dialogueMode,
      ),
    ) === true;
  const needsExpertReview =
    legalPolicySensitivity &&
    sourceNeeds.some((item) =>
      lowerJoined([item]).includes("wissenschaft") ||
      lowerJoined([item]).includes("amtlich") ||
      lowerJoined([item]).includes("rechts"),
    );
  const needsStakeholderMapping =
    affectedGroupsNeeded ||
    stakeholderGroups.length === 0 ||
    input.voxyDialog?.cards.some((card) => card.dialogueMode === "affected_groups_probe") === true;
  const experienceCollection =
    hasExperienceCue(textBlob) &&
    (targetGroups.length > 0 || stakeholderGroups.length > 0);
  const localIssueRoom =
    inferredScope.id === "local" &&
    (hasLocalCue(textBlob) || targetGroups.length > 0);
  const policyFeedback = hasPolicyCue(textBlob);
  const highRiskKeepDraft =
    (lowContextInput && missingSources) ||
    (!thesisPresent && riskFlags.length >= 4) ||
    (legalPolicySensitivity &&
      contestedClaims &&
      sourceReviewNeeded &&
      affectedGroupsNeeded &&
      !thesisPresent);

  let suggestedFormat: ParticipationActivationReviewFormat = "clarification_dialogue";
  let formatConfidence: ParticipationActivationReviewConfidence = "medium";
  let formatReason =
    "Der Arbeitsstand braucht noch Klärung, bevor eine öffentliche oder interne Aktivierungsentscheidung sinnvoll ist.";

  if (highRiskKeepDraft) {
    suggestedFormat = "dossier_only_keep_draft";
    formatConfidence = "strong";
    formatReason =
      "Reifegrad und Risiko sprechen dafür, den Stand vorerst als Dossier-Entwurf zu halten statt einen Beteiligungsraum zu aktivieren.";
  } else if (multilingualReviewNeeded && (targetGroups.length > 0 || stakeholderGroups.length > 1)) {
    suggestedFormat = "multilingual_roundtable";
    formatConfidence = "strong";
    formatReason =
      "Mehrsprachiger Kontext, getrennte Lesefassung oder RTL-Hinweis sprechen für eine sprachübergreifende Review-Runde statt einen einsprachigen Schnellstart.";
  } else if (
    needsClarification &&
    input.voxyDialog &&
    (!thesisPresent || input.surface === "account")
  ) {
    suggestedFormat = "voxy_guided_refinement";
    formatConfidence = thesisPresent ? "medium" : "strong";
    formatReason =
      "Offene Rückfragen und fehlende Beispiele sprechen eher für eine geführte Nachschärfung als für sofortige Aktivierungslogik.";
  } else if (!lowContextInput && (sourceNeeds.length + factcheckQuestions.length) >= 3) {
    suggestedFormat = "source_review";
    formatConfidence = "strong";
    formatReason =
      "Vorhandene Claims, Quellenbedarf und Factcheck-Fragen sprechen zuerst für einen Review auf Beleg- und Behauptungsebene.";
  } else if (needsClarification && input.voxyDialog) {
    suggestedFormat = "voxy_guided_refinement";
    formatConfidence = thesisPresent ? "medium" : "strong";
    formatReason =
      "Offene Rückfragen und fehlende Beispiele sprechen eher für eine geführte Nachschärfung als für sofortige Aktivierungslogik.";
  } else if (needsClarification) {
    suggestedFormat = "clarification_dialogue";
    formatConfidence = thesisPresent ? "weak" : "strong";
    formatReason =
      "These, Frage oder Anschlussfähigkeit sind noch nicht präzise genug für ein belastbares Beteiligungsformat.";
  } else if (needsExpertReview) {
    suggestedFormat = "expert_review_request";
    formatConfidence = "medium";
    formatReason =
      "Fachliche, rechtliche oder amtliche Fragen sollten vor einer Aktivierung durch geeignete Expertise eingeordnet werden.";
  } else if (needsStakeholderMapping) {
    suggestedFormat = "stakeholder_mapping";
    formatConfidence = "medium";
    formatReason =
      "Der Arbeitsstand benennt noch nicht klar genug, wen die Aktivierung betrifft oder wer eingeladen werden sollte.";
  } else if (localIssueRoom) {
    suggestedFormat = "local_issue_room";
    formatConfidence = "strong";
    formatReason =
      "Konkreter Ortsbezug und direkt betroffene Gruppen sprechen für einen lokalen Anliegenraum statt einen abstrakten allgemeinen Diskurs.";
  } else if (policyFeedback) {
    suggestedFormat = "policy_feedback";
    formatConfidence = "medium";
    formatReason =
      "Regelungs-, Verwaltungs- oder Haushaltsbezug spricht eher für strukturiertes Policy-Feedback als für eine lose Debatte.";
  } else if (hasPollCandidate && !affectedGroupsNeeded && !missingSources) {
    suggestedFormat = "poll_preparation";
    formatConfidence = "medium";
    formatReason =
      "Eine klare Leitfrage ist erkennbar, aber Poll-Vorbereitung bleibt review-first und ist noch keine Aktivierung.";
  } else if (experienceCollection) {
    suggestedFormat = "experience_collection";
    formatConfidence = "medium";
    formatReason =
      "Der Arbeitsstand lebt von Erfahrungen und Betroffenheit, daher wirkt eine Erfahrungssammlung anschlussfähiger als ein binärer Entscheidungsmodus.";
  } else if (contestedClaims && targetGroups.length > 0) {
    suggestedFormat = "pro_contra_debate";
    formatConfidence = "medium";
    formatReason =
      "Sichtbare Gegenpositionen oder umstrittene Behauptungen sprechen für eine moderierte Pro-und-Contra-Struktur.";
  } else if (contestedClaims) {
    suggestedFormat = "argument_collection";
    formatConfidence = "medium";
    formatReason =
      "Mehrere Behauptungen und offene Gegenperspektiven sprechen für eine Argumentesammlung vor jeder Aktivierungsentscheidung.";
  } else if (hasDemandCue(textBlob) && !policyFeedback) {
    suggestedFormat = "petition_like_signal";
    formatConfidence = "weak";
    formatReason =
      "Der Arbeitsstand enthält eher ein verdichtetes Anliegen als bereits einen ausbalancierten Beteiligungsraum.";
  }

  if (
    !thesisPresent &&
    input.questionHints.length === 0 &&
    input.participationCandidateKinds.length === 0 &&
    targetGroups.length === 0 &&
    stakeholderGroups.length === 0
  ) {
    formatConfidence = "missing";
    formatReason =
      "Der Arbeitsstand ist noch zu knapp, um daraus schon ein belastbares Beteiligungsformat vorzuschlagen.";
  }

  if (suggestedFormat === "clarification_dialogue" && !thesisPresent) {
    formatConfidence = "strong";
  }
  if (suggestedFormat === "poll_preparation" && (sourceReviewNeeded || factcheckNeeded)) {
    formatConfidence = "weak";
    formatReason =
      "Eine Poll-Idee ist sichtbar, aber offene Quellen- und Prüfbedarfe blockieren jede vorschnelle Aktivierung.";
  }

  const candidateParticipationQuestion = buildQuestionSuggestion({
    format: suggestedFormat,
    questionHints: input.questionHints,
    title: title || input.dossierModel?.thesis.label || null,
    targetGroups,
  });
  const questionGuard = candidateParticipationQuestion
    ? evaluatePublicQuestionGeneralization({
        originalInput:
          input.originalInput ?? input.texts[0] ?? candidateParticipationQuestion,
        candidatePublicQuestion: candidateParticipationQuestion,
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
  const proposedParticipationQuestion =
    questionGuard?.releaseState === "blocked"
      ? null
      : candidateParticipationQuestion;

  const readinessSignals: ParticipationTag<ParticipationActivationReviewReadinessSignal>[] = [];
  if (thesisPresent) {
    readinessSignals.push(
      createTag(
        "thesis_present",
        readinessLabel("thesis_present"),
        "Eine Kernthese oder klare Arbeitsfrage ist im bestehenden Readmodel bereits sichtbar.",
      ),
    );
  }
  if (counterpositionNeeded) {
    readinessSignals.push(
      createTag(
        "counterposition_needed",
        readinessLabel("counterposition_needed"),
        "Vor der Aktivierung sollte eine Gegenperspektive sichtbar oder bewusst nachgefragt werden.",
      ),
    );
  }
  if (sourceReviewNeeded) {
    readinessSignals.push(
      createTag(
        "source_review_needed",
        readinessLabel("source_review_needed"),
        "Quellenbedarf ist sichtbar und sollte vor Aktivierung nicht mit Wahrheit verwechselt werden.",
      ),
    );
  }
  if (factcheckNeeded) {
    readinessSignals.push(
      createTag(
        "factcheck_needed",
        readinessLabel("factcheck_needed"),
        "Factcheck-Fragen bleiben offen und blockieren belastbare Aktivierung.",
      ),
    );
  }
  if (humanInputNeeded || needsClarification) {
    readinessSignals.push(
      createTag(
        "human_input_needed",
        readinessLabel("human_input_needed"),
        "Offene Rückfragen oder fehlende Beispiele verlangen bewusste menschliche Ergänzung.",
      ),
    );
  }
  if (affectedGroupsNeeded) {
    readinessSignals.push(
      createTag(
        "affected_groups_needed",
        readinessLabel("affected_groups_needed"),
        "Betroffene Gruppen und Einladungslogik sind noch nicht ausreichend sichtbar.",
      ),
    );
  }
  if (commonGoodTensionPresent) {
    readinessSignals.push(
      createTag(
        "common_good_tension_present",
        readinessLabel("common_good_tension_present"),
        "Der Arbeitsstand zeigt einen Gemeinwohl- oder Zielkonflikt, der in der Aktivierung adressiert werden sollte.",
      ),
    );
  }
  if (multilingualReviewNeeded) {
    readinessSignals.push(
      createTag(
        "multilingual_review_needed",
        readinessLabel("multilingual_review_needed"),
        "Originalsprache, Lesefassung oder RTL-Hinweis verlangen eine sprachübergreifende Review-Perspektive.",
      ),
    );
  }
  if (suggestedFormat === "poll_preparation" && !proposedParticipationQuestion) {
    readinessSignals.push(
      createTag(
        "poll_question_needed",
        readinessLabel("poll_question_needed"),
        "Für einen Poll-Kandidaten fehlt noch eine belastbare Leitfrage.",
      ),
    );
  }
  if (riskFlags.length > 0) {
    readinessSignals.push(
      createTag(
        "moderation_risk_review_needed",
        readinessLabel("moderation_risk_review_needed"),
        "Risikofaktoren verlangen Review, bevor ein Beteiligungsformat aktiviert werden darf.",
      ),
    );
  }

  const blockers = uniqueStrings([
    sourceReviewNeeded ? "Belastbare Quellen- und Referenzlage fehlt noch." : null,
    factcheckNeeded ? "Factcheck-Fragen sind offen." : null,
    humanInputNeeded || needsClarification ? "Menschliche Ergänzungen oder Beispiele fehlen." : null,
    affectedGroupsNeeded ? "Betroffene Gruppen und Stakeholder sind noch nicht klar genug." : null,
    unclearScope ? "Der passende Scope muss bewusst entschieden werden." : null,
    input.missingReview ? "Aktivierung bleibt ohne Review ausdrücklich blockiert." : null,
    input.runtimeTruthMissing ? "Echte Aktivierungs- oder Publish-Runtime ist hier noch nicht die Wahrheit." : null,
    input.providerBlocked ? "Provider- oder Render-Gates dürfen hier nicht als Aktivierung missverstanden werden." : null,
    suggestedFormat === "dossier_only_keep_draft"
      ? "Der Arbeitsstand sollte vorerst als Dossier-Entwurf weitergeführt werden."
      : null,
    questionGuard && questionGuard.releaseState !== "draft_allowed"
      ? `Public-Question-Guard: ${questionGuard.outcome}.`
      : null,
  ]);

  let activationStatus: ParticipationActivationReviewStatus = "activation_preview";
  if (input.providerBlocked) {
    activationStatus = "blocked_by_provider";
  } else if (lowContextInput && !thesisPresent) {
    activationStatus = "readmodel_only";
  } else if (sourceReviewNeeded) {
    activationStatus = "needs_source_review";
  } else if (factcheckNeeded) {
    activationStatus = "needs_factcheck_review";
  } else if (humanInputNeeded || needsClarification) {
    activationStatus = "needs_human_input";
  } else if (unclearScope) {
    activationStatus = "needs_scope_decision";
  } else if (formatConfidence === "weak" || formatConfidence === "missing") {
    activationStatus = "needs_format_decision";
  } else if (input.missingReview) {
    activationStatus = "needs_editorial_review";
  } else if (input.runtimeTruthMissing) {
    activationStatus = "blocked_by_runtime_truth";
  }
  if (
    activationStatus === "readmodel_only" &&
    (input.runtimeTruthMissing || input.missingReview) &&
    !thesisPresent
  ) {
    activationStatus = "blocked_by_missing_review";
  }

  let nextActivationDecision: ParticipationActivationReviewNextDecision = "prepare_invitation_copy";
  let nextDecisionReason =
    "Das Format ist vorläufig klar, aber Aktivierung bleibt review-first und braucht bewusste Vorbereitung.";

  if (suggestedFormat === "dossier_only_keep_draft") {
    nextActivationDecision = "keep_as_dossier_draft";
    nextDecisionReason =
      "Vor jeder Aktivierung sollte der Arbeitsstand erst als Dossier, Quellenlage und Review-Kontext reifen.";
  } else if (unclearScope) {
    nextActivationDecision = "clarify_scope";
    nextDecisionReason =
      "Ohne klaren lokalen, regionalen, nationalen oder mehrsprachigen Scope bleibt jeder Aktivierungspfad unscharf.";
  } else if (formatConfidence === "weak" || formatConfidence === "missing") {
    nextActivationDecision = "choose_format";
    nextDecisionReason =
      "Mehrere Formate sind denkbar, aber noch keines ist stark genug für eine belastbare Aktivierungsvorbereitung.";
  } else if (humanInputNeeded || needsClarification) {
    nextActivationDecision = "request_human_input";
    nextDecisionReason =
      "Beispiele, Rückfragen oder Gegenperspektiven sollten zuerst menschlich ergänzt werden.";
  } else if (sourceReviewNeeded) {
    nextActivationDecision = "request_sources";
    nextDecisionReason =
      "Quellen- und Referenzbedarf sollte vor Formataktivierung gezielt geschlossen werden.";
  } else if (factcheckNeeded || contestedClaims) {
    nextActivationDecision = "review_claims";
    nextDecisionReason =
      "Behauptungen, Gegenpositionen und Prüfbedarf müssen vor Aktivierung bewusster sortiert werden.";
  } else if (suggestedFormat === "poll_preparation") {
    nextActivationDecision = "prepare_poll_question";
    nextDecisionReason =
      "Poll-Vorbereitung braucht eine klare, faire Leitfrage und Review vor jedem weiteren Schritt.";
  }

  const pollStatus: ParticipationActivationReviewDownstreamStatus = hasPollCandidate
    ? suggestedFormat === "poll_preparation" &&
      !sourceReviewNeeded &&
      !factcheckNeeded &&
      questionGuard?.releaseState === "draft_allowed"
      ? "prepared"
      : "needs_review"
    : "blocked";

  const downstreamReadiness: ParticipationActivationReviewDownstreamItem[] = [
    {
      id: "poll",
      label: "Poll",
      status: pollStatus,
      statusLabel: downstreamStatusLabel(pollStatus),
      reason:
        pollStatus === "prepared"
          ? "Fragepfad ist sichtbar, bleibt aber Review-first und noch kein Poll."
          : pollStatus === "needs_review"
            ? "Ein Poll-Kandidat ist sichtbar, aber faire Formulierung, Quellenlage oder Review fehlen noch."
            : "Ohne expliziten Poll-Kandidaten bleibt dieser Pfad blockiert.",
      reviewRequired: true,
    },
    {
      id: "output",
      label: "Output",
      status: "blocked",
      statusLabel: downstreamStatusLabel("blocked"),
      reason:
        "Output-Drafts brauchen einen freigegebenen Brief statt nur einen Aktivierungsvorschlag.",
      reviewRequired: true,
    },
    {
      id: "social",
      label: "Social",
      status: "blocked",
      statusLabel: downstreamStatusLabel("blocked"),
      reason:
        "Social- oder Distributionspfade bleiben ohne freigegebenen Brief und Review blockiert.",
      reviewRequired: true,
    },
    {
      id: "voxyBriefing",
      label: "Voxy-Briefing",
      status: input.voxyDialog ? "needs_review" : "blocked",
      statusLabel: downstreamStatusLabel(input.voxyDialog ? "needs_review" : "blocked"),
      reason: input.voxyDialog
        ? "Voxy kann Folgefragen und Briefing-Bedarf anzeigen, aber nicht rendern oder aktivieren."
        : "Ohne Voxy-Kontext bleibt auch ein Briefing-Pfad blockiert.",
      reviewRequired: true,
    },
    {
      id: "publicActivation",
      label: "Öffentliche Aktivierung",
      status:
        !sourceReviewNeeded &&
        !factcheckNeeded &&
        !humanInputNeeded &&
        !unclearScope &&
        questionGuard?.releaseState !== "blocked" &&
        formatConfidence !== "missing"
          ? "needs_review"
          : "blocked",
      statusLabel: downstreamStatusLabel(
        !sourceReviewNeeded &&
          !factcheckNeeded &&
          !humanInputNeeded &&
          !unclearScope &&
          questionGuard?.releaseState !== "blocked" &&
          formatConfidence !== "missing"
          ? "needs_review"
          : "blocked",
      ),
      reason:
        !sourceReviewNeeded &&
        !factcheckNeeded &&
        !humanInputNeeded &&
        !unclearScope &&
        questionGuard?.releaseState !== "blocked" &&
        formatConfidence !== "missing"
          ? "Ein Aktivierungskandidat ist sichtbar, aber öffentliche Aktivierung bleibt strikt review-gated."
          : "Ohne geklärten Scope, Quellenlage und Review bleibt jede öffentliche Aktivierung blockiert.",
      reviewRequired: true,
    },
  ];

  return {
    title: "Beteiligungsraum vorbereiten",
    summary:
      "Dieser Layer schlägt nur ein passendes Beteiligungsformat und nächste Review-Schritte vor. Es wird nichts aktiviert, veröffentlicht oder öffentlich gestartet.",
    surface: input.surface,
    contributionRef: input.contributionRef ?? null,
    dossierRef: input.dossierRef ?? null,
    sourceLanguage: input.sourceLanguage,
    readingLanguage: input.readingLanguage,
    languageLabel: `Original: ${languageName(input.sourceLanguage)} · Lesefassung: ${languageName(input.readingLanguage)}${input.rtlDisplayHint ? " · RTL-Hinweis aktiv" : ""}`,
    originalPreserved: true,
    translationIsEvidence: false,
    rtlDisplayHint: input.rtlDisplayHint,
    activationStatus,
    activationStatusLabel: activationStatusLabel(activationStatus),
    suggestedFormat,
    suggestedFormatLabel: formatLabel(suggestedFormat),
    formatConfidence,
    formatConfidenceLabel: confidenceLabel(formatConfidence),
    formatReason,
    proposedParticipationQuestion,
    questionGuard,
    targetGroups,
    stakeholderGroups,
    participationScope: inferredScope.id,
    participationScopeLabel: scopeLabel(inferredScope.id),
    participationScopeReason: inferredScope.reason,
    readinessSignals,
    riskFlags,
    blockers,
    downstreamReadiness,
    nextActivationDecision: {
      id: nextActivationDecision,
      label: nextDecisionLabel(nextActivationDecision),
      reason: nextDecisionReason,
    },
    publicSafeLabel: "Vorschlag, nicht aktiviert",
    userVisibleReason: input.userVisibleReason,
    reviewerVisibleReason: input.reviewerVisibleReason,
    nextStep: input.nextStep,
    reviewRequired: true,
    noActivationAction: true,
    noPublishAction: true,
    noRuntimeClaim: true,
  };
}

export function buildParticipationActivationReviewFromCreateCandidatePreview(
  model: CreateCandidatePreviewReadModel,
): ParticipationActivationReviewModel | null {
  if (!model.hasPreview || !model.voxyCocreationDialog) return null;
  const sourceModel = buildSourceFactcheckFeedEnrichmentFromCreateCandidatePreview(model);
  const dossierModel = buildDossierWorkspaceDecisionFromCreateCandidatePreview(model);
  const questionHints = uniqueStrings([
    ...model.sections
      .filter((section) => section.kind === "question" || section.kind === "poll")
      .flatMap((section) => section.items)
      .map((item) => item.title),
    dossierModel?.openQuestions[0] ?? null,
  ]);

  return buildModelFromSignals({
    surface: "create",
    contributionRef: model.voxyCocreationDialog.contributionRef,
    sourceLanguage: model.voxyCocreationDialog.sourceLanguage,
    readingLanguage: model.voxyCocreationDialog.readingLanguage,
    rtlDisplayHint: model.voxyCocreationDialog.rtl,
    translationAvailable: model.voxyCocreationDialog.translationAvailable,
    texts: model.sections.flatMap((section) => section.items).map((item) => item.title),
    questionHints,
    openQuestions: dossierModel?.openQuestions ?? [],
    sourceModel,
    dossierModel,
    voxyDialog: model.voxyCocreationDialog,
    participationCandidateLabels:
      model.sections.find((section) => section.kind === "poll")?.items.map((item) => item.title) ?? [],
    participationCandidateKinds:
      model.sections.find((section) => section.kind === "poll")?.items.map(() => "poll_candidate") ?? [],
    runtimeTruthMissing:
      model.providerRuntimeTruth === "missing_runtime_truth" ||
      model.reviewHandoff.persistenceTruth === "missing_persistence_truth",
    providerBlocked: false,
    missingReview: true,
    nextStep:
      "Formatvorschlag, Scope, Quellenlage und offene Fragen prüfen, bevor eine Aktivierung vorbereitet wird.",
    userVisibleReason:
      "Der Vorschlag zeigt nur, welches Beteiligungsformat zum Arbeitsstand passen könnte und was davor noch fehlt.",
    reviewerVisibleReason:
      "Create bleibt eine review-first Aktivierungsvorschau. Weder Poll noch Anlassraum oder Beteiligungsraum werden automatisch gestartet.",
  });
}

export function buildParticipationActivationReviewFromReviewContext(
  context: V3ReviewQueueWiringContext | null | undefined,
  options?: {
    audience?: "admin" | "workspace";
    contributionRef?: ParticipationRef | null;
    dossierRef?: ParticipationRef | null;
  },
): ParticipationActivationReviewModel | null {
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
  const voxyDialog = buildVoxyCocreationDialogFromReviewContext(context, {
    contributionRef: options?.contributionRef ?? null,
    surface: options?.audience === "workspace" ? "workspace" : "admin",
    maxCards: 4,
  });

  return buildModelFromSignals({
    surface: options?.audience === "workspace" ? "workspace" : "admin",
    contributionRef: options?.contributionRef ?? null,
    dossierRef: options?.dossierRef ?? null,
    sourceLanguage: context.languageBridge.original.language,
    readingLanguage:
      context.multilingualThread?.readingLocale ?? context.languageBridge.translation.language,
    rtlDisplayHint: Boolean(context.languageBridge.translation.rtl),
    translationAvailable: Boolean(context.languageBridge.translation.text),
    originalInput: context.languageBridge.original.text,
    texts: uniqueStrings([
      ...(context.dossierWorkspaceSurface?.sections.claims ?? []),
      ...(context.dossierWorkspaceSurface?.sections.counterPositions ?? []),
      ...(context.participationCandidates.map((candidate) => candidate.prompt) ?? []),
      ...(context.participationCandidates.map((candidate) => candidate.title) ?? []),
    ]),
    questionHints: uniqueStrings([
      ...(context.languageBridge.openQuestions ?? []),
      ...context.participationCandidates.map((candidate) => candidate.prompt),
    ]),
    openQuestions: uniqueStrings([
      ...(context.languageBridge.openQuestions ?? []),
      ...(context.dossierWorkspaceSurface?.sections.openQuestions ?? []),
    ]),
    sourceModel,
    dossierModel,
    voxyDialog,
    participationCandidateLabels: context.participationCandidates.map((candidate) => candidate.title),
    participationCandidateKinds: context.participationCandidates.map(
      (candidate) => candidate.candidateType,
    ),
    runtimeTruthMissing: Boolean(
      context.voxyRenderJob?.status === "blocked_by_runtime_truth" ||
        context.voxyPublishDraft?.status === "blocked_by_runtime_truth" ||
        context.participationCandidates.length === 0,
    ),
    providerBlocked: Boolean(
      context.voxyRenderJob?.status === "blocked_by_provider" ||
        context.voxyRenderJob?.status === "blocked_by_secret",
    ),
    missingReview: true,
    nextStep:
      "Formatvorschlag, Scope, Review-Bedarf und Aktivierungsgrenzen im bestehenden Review-Kontext prüfen.",
    userVisibleReason:
      "Der Review-Kontext zeigt nur einen Aktivierungskandidaten und keine öffentliche oder interne Freigabe.",
    reviewerVisibleReason:
      "Participation bleibt review-first. Formatvorschlag, Poll-Idee und Anlassraum-Nähe sind Hinweise, keine Aktivierungsentscheidung.",
  });
}

export function buildParticipationActivationReviewFromVoxyDialog(
  dialog: V3VoxyCocreationDialogModel | null | undefined,
  options?: {
    contributionRef?: ParticipationRef | null;
    nextStep?: string;
  },
): ParticipationActivationReviewModel | null {
  if (!dialog) return null;
  const sourceModel = buildSourceFactcheckFeedEnrichmentFromVoxyDialog(dialog, {
    surface: "account",
    nextStep:
      options?.nextStep ?? "Antworten und Quellen würden einen späteren Beteiligungsvorschlag verbessern.",
    runtimeTruthMissing: true,
  });
  const dossierModel = buildDossierWorkspaceDecisionFromVoxyDialog(dialog, {
    contributionRef: options?.contributionRef ?? dialog.contributionRef,
    surface: "account",
    nextStep:
      options?.nextStep ?? "Zuerst Beispiele, Betroffenheit und Gegenperspektiven nachschärfen.",
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
    sourceModel,
    dossierModel,
    voxyDialog: dialog,
    participationCandidateLabels: [],
    participationCandidateKinds: [],
    runtimeTruthMissing: true,
    providerBlocked: false,
    missingReview: true,
    nextStep:
      options?.nextStep ?? "Arbeitsstand schärfen, bevor ein Beteiligungsformat weiter vorbereitet wird.",
    userVisibleReason:
      "Im Account bleibt dieser Beteiligungsvorschlag ein lokaler oder readmodel-only Arbeitsstand.",
    reviewerVisibleReason:
      "Ohne persisted Handoff oder Runtime-Wahrheit bleibt der Beteiligungspfad bewusst nicht aktiviert.",
  });
}
