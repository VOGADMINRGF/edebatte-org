import type { ExistingTopicMatch } from "@/features/create/existingTopicMatches";
import type { ExistingMatchUserDecision } from "@/features/create/createContributionPackageContract";
import type {
  DialogHandoffTarget,
  DialogOutcome,
} from "@/features/dialog/dialogIntelligenceContract";
import {
  getDialogHandoffCandidates,
  summarizeRecognizedStandpoint,
} from "@/features/dialog/dialogIntelligenceContract";

export const CREATE_HANDOFF_DRAFT_TARGETS = [
  "opinion_count",
  "existing_branch_connection",
  "new_branch",
  "dossier_candidate",
  "anlassraum_candidate",
  "participation_space_candidate",
  "editorial_review",
  "factcheck_request",
] as const;

export type CreateHandoffDraftTarget =
  (typeof CREATE_HANDOFF_DRAFT_TARGETS)[number];

export const CREATE_HANDOFF_DRAFT_STATUSES = [
  "draft",
  "prepared",
  "submitted_for_review",
  "needs_clarification",
  "approved_for_setup",
  "rejected",
] as const;

export type CreateHandoffDraftStatus =
  (typeof CREATE_HANDOFF_DRAFT_STATUSES)[number];

export const CREATE_HANDOFF_DRAFT_SOURCES = [
  "dialog_result",
  "existing_topic_match",
  "create_followup",
  "manual_author_choice",
] as const;

export type CreateHandoffDraftSource =
  (typeof CREATE_HANDOFF_DRAFT_SOURCES)[number];

export type CreateHandoffDraft = {
  id: string;
  source: CreateHandoffDraftSource;
  target: CreateHandoffDraftTarget;
  status: CreateHandoffDraftStatus;
  title: string;
  summary: string;
  authorStandpoint?: string | null;
  existingMatchDecision?: ExistingMatchUserDecision | null;
  topicTitle?: string | null;
  relatedMatchId?: string | null;
  relatedDialogOutcomeId?: string | null;
  selectedPerspectiveIds?: string[];
  selectedBranchIds?: string[];
  selectedArgumentIds?: string[];
  authorProvidedSources?: string[];
  authorProvidedExamples?: string[];
  openQuestions: string[];
  requiresEditorialReview: boolean;
  requiresFactcheck: boolean;
  autoCreate: false;
  autoPublish: false;
  createdAt: string;
  updatedAt: string;
};

const REVIEW_FIRST_GUARDRAIL =
  "Review-first: keine automatische Veröffentlichung oder Erstellung.";
const REVIEW_FIRST_MERGE_GUARDRAIL =
  "Review-first: keine automatische Veröffentlichung, Erstellung oder Zusammenführung.";

function nowIso(): string {
  return new Date().toISOString();
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function unique(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function isRejectedDialogOutcome(outcome: DialogOutcome): boolean {
  return outcome.resultStatus === "rejected";
}

function isRejectedExistingMatch(match: ExistingTopicMatch): boolean {
  return match.status === "rejected";
}

function requiresEditorialReviewForTarget(
  target: CreateHandoffDraftTarget,
): boolean {
  return (
    target === "dossier_candidate" ||
    target === "anlassraum_candidate" ||
    target === "participation_space_candidate" ||
    target === "editorial_review"
  );
}

function requiresFactcheckForTarget(
  target: CreateHandoffDraftTarget,
): boolean {
  return target === "factcheck_request";
}

function getDialogCandidate(
  outcome: DialogOutcome,
  target: DialogHandoffTarget,
) {
  return getDialogHandoffCandidates(outcome).find(
    (candidate) => candidate.target === target,
  );
}

function mapDialogTargetToDraftTarget(
  target: DialogHandoffTarget,
): CreateHandoffDraftTarget {
  if (target === "count_opinion") return "opinion_count";
  if (target === "dossier_candidate") return "dossier_candidate";
  if (target === "anlassraum_candidate") return "anlassraum_candidate";
  if (target === "participation_space_candidate") {
    return "participation_space_candidate";
  }
  if (target === "factcheck_request") return "factcheck_request";
  return "editorial_review";
}

function buildDialogDraftStatus(
  outcome: DialogOutcome,
  target: CreateHandoffDraftTarget,
): CreateHandoffDraftStatus {
  if (isRejectedDialogOutcome(outcome)) return "rejected";

  if (target === "existing_branch_connection") {
    return outcome.branches.length > 0 ? "prepared" : "needs_clarification";
  }
  if (target === "new_branch") {
    return "prepared";
  }

  const dialogTarget = CREATE_HANDOFF_DRAFT_TARGETS.includes(target)
    ? (target === "opinion_count"
        ? "count_opinion"
        : target) as DialogHandoffTarget | "existing_branch_connection" | "new_branch"
    : null;

  if (
    dialogTarget &&
    dialogTarget !== "existing_branch_connection" &&
    dialogTarget !== "new_branch"
  ) {
    const candidate = getDialogCandidate(outcome, dialogTarget);
    if (candidate?.eligible) return "prepared";
    return candidate?.blockedReasons.includes("result_rejected")
      ? "rejected"
      : "needs_clarification";
  }

  return "draft";
}

function buildExistingMatchDraftStatus(
  match: ExistingTopicMatch,
  target: CreateHandoffDraftTarget,
): CreateHandoffDraftStatus {
  if (isRejectedExistingMatch(match)) return "rejected";

  if (target === "new_branch") return "prepared";
  if (target === "opinion_count") {
    return match.kind === "opinion_cluster" ? "prepared" : "needs_clarification";
  }
  if (target === "factcheck_request") {
    return match.kind === "source_question" ? "prepared" : "needs_clarification";
  }
  if (target === "dossier_candidate") {
    return match.kind === "dossier" ? "prepared" : "needs_clarification";
  }
  if (target === "participation_space_candidate") {
    return match.kind === "participation_space"
      ? "prepared"
      : "needs_clarification";
  }
  if (target === "existing_branch_connection") {
    return match.kind === "topic" || match.kind === "branch"
      ? "prepared"
      : "needs_clarification";
  }

  return match.requiresReview || match.strength !== "weak"
    ? "prepared"
    : "needs_clarification";
}

function buildDialogDraftTitle(
  outcome: DialogOutcome,
  target: CreateHandoffDraftTarget,
): string {
  if (target === "dossier_candidate") {
    return `Dossier vorbereiten: ${outcome.topicTitle}`;
  }
  if (target === "anlassraum_candidate") {
    return `Anlassraum vorbereiten: ${outcome.topicTitle}`;
  }
  if (target === "participation_space_candidate") {
    return `Beteiligungsraum vorbereiten: ${outcome.topicTitle}`;
  }
  if (target === "factcheck_request") {
    return `Quellenprüfung vormerken: ${outcome.topicTitle}`;
  }
  if (target === "existing_branch_connection") {
    return `An bestehenden Zweig anknüpfen: ${outcome.topicTitle}`;
  }
  if (target === "new_branch") {
    return `Eigenen Zweig starten: ${outcome.topicTitle}`;
  }
  if (target === "editorial_review") {
    return `Redaktionelle Prüfung vormerken: ${outcome.topicTitle}`;
  }
  return `Meinung erfassen: ${outcome.topicTitle}`;
}

function buildExistingMatchDraftTitle(
  match: ExistingTopicMatch,
  target: CreateHandoffDraftTarget,
): string {
  if (target === "opinion_count") {
    return `Ähnliche Meinung erfassen: ${match.title}`;
  }
  if (target === "factcheck_request") {
    return `Quellenprüfung vormerken: ${match.title}`;
  }
  if (target === "dossier_candidate") {
    return `Dossier-Anknüpfung prüfen: ${match.title}`;
  }
  if (target === "participation_space_candidate") {
    return `Beteiligungsraum prüfen: ${match.title}`;
  }
  if (target === "new_branch") {
    return `Eigenen Zweig starten: ${match.title}`;
  }
  if (target === "editorial_review") {
    return `Redaktionelle Prüfung vormerken: ${match.title}`;
  }
  if (target === "anlassraum_candidate") {
    return `Anlassraum vorbereiten: ${match.title}`;
  }
  return `An bestehenden Zweig anknüpfen: ${match.title}`;
}

function buildDialogDraftSummary(
  outcome: DialogOutcome,
  target: CreateHandoffDraftTarget,
): string {
  if (target === "opinion_count") {
    return "Die Zähl- oder Erfassungsabsicht bleibt ein vorbereitender Entwurf und ist keine repräsentative Statistik.";
  }
  if (target === "existing_branch_connection") {
    return "Der Anschluss an einen bestehenden Zweig bleibt nur ein Verbindungsvorschlag und löst keinen Merge aus.";
  }
  if (target === "new_branch") {
    return "Ein neuer Zweig wird hier nur als review-first Entwurf vorgemerkt und noch nicht erstellt.";
  }
  if (target === "factcheck_request") {
    return "Die Quellenprüfung bleibt eine Anfrage beziehungsweise Vormerkung und bestätigt noch keine Wahrheit.";
  }
  if (target === "editorial_review") {
    return "Der Beitrag wird nur als prüfbarer Review-Gegenstand vorgemerkt, ohne Veröffentlichung oder finale Einrichtung.";
  }
  return "Dieser nächste Schritt bleibt ein prüfbarer Kandidat und erzeugt noch keine finale Runtime-Entität.";
}

function buildExistingMatchDraftSummary(
  match: ExistingTopicMatch,
  target: CreateHandoffDraftTarget,
): string {
  if (target === "opinion_count") {
    return "Die ähnliche Meinung wird nur als Erfassungsabsicht vorgemerkt und ist keine repräsentative Statistik.";
  }
  if (target === "existing_branch_connection") {
    return "Die Verbindung zu einem bestehenden Zweig bleibt ein Vorschlag, führt zu keinem Merge und löst keine automatische Zusammenführung aus.";
  }
  if (target === "factcheck_request") {
    return "Der Quellenprüfungsbedarf bleibt review-first vorgemerkt und ist keine bestätigte Tatsachenbehauptung.";
  }
  if (target === "new_branch") {
    return "Ein neuer Zweig wird nur lokal als weiterer Prüfpfad vorbereitet.";
  }
  return match.summary;
}

function buildDialogOpenQuestions(
  outcome: DialogOutcome,
  target: CreateHandoffDraftTarget,
): string[] {
  const questions = [...outcome.openQuestions];

  if (target === "factcheck_request") {
    questions.push("Welche Quellen oder Belege fehlen noch?");
  }
  if (
    target === "dossier_candidate" ||
    target === "anlassraum_candidate" ||
    target === "participation_space_candidate"
  ) {
    questions.push("Welche Teile brauchen vor dem nächsten Schritt noch Review?");
  }
  if (target === "existing_branch_connection") {
    questions.push("Was soll am bestehenden Anschluss nur vorgemerkt bleiben?");
  }
  if (target === "new_branch") {
    questions.push("Welcher neue Zweig soll getrennt weitergeführt werden?");
  }
  if (target === "opinion_count") {
    questions.push("Soll dieser Beitrag nur als Erfassungsabsicht bestehen bleiben?");
  }

  return unique(questions);
}

function buildExistingMatchOpenQuestions(
  match: ExistingTopicMatch,
  target: CreateHandoffDraftTarget,
): string[] {
  const questions = match.requiresReview
    ? ["Welche Teile brauchen vor dem nächsten Schritt noch bewusste Prüfung?"]
    : [];

  if (target === "factcheck_request") {
    questions.push("Welche Belege oder Quellen sollten zuerst geprüft werden?");
  }
  if (target === "opinion_count") {
    questions.push("Soll diese ähnliche Meinung nur erfasst oder später weiter ausgearbeitet werden?");
  }
  if (target === "existing_branch_connection") {
    questions.push("Welche Unterschiede zum bestehenden Zweig sollen sichtbar bleiben?");
  }
  if (target === "new_branch") {
    questions.push("Welcher neue Zweig soll von diesem Anschluss getrennt bleiben?");
  }

  return unique(questions);
}

export function createHandoffDraftFromDialogOutcome(
  outcome: DialogOutcome,
  target: CreateHandoffDraftTarget,
): CreateHandoffDraft {
  const timestamp = nowIso();
  const authorStandpoint = summarizeRecognizedStandpoint(outcome);

  return {
    id: `create-handoff-draft-${outcome.id}-${target}`,
    source: "dialog_result",
    target,
    status: buildDialogDraftStatus(outcome, target),
    title: buildDialogDraftTitle(outcome, target),
    summary: buildDialogDraftSummary(outcome, target),
    authorStandpoint: authorStandpoint || null,
    topicTitle: outcome.topicTitle,
    relatedDialogOutcomeId: outcome.id,
    selectedPerspectiveIds: outcome.perspectives
      .filter((perspective) => perspective.userResponse === "interested")
      .map((perspective) => perspective.id),
    selectedBranchIds: [],
    selectedArgumentIds: outcome.arguments.map((argument) => argument.id),
    authorProvidedSources: [],
    authorProvidedExamples: [],
    openQuestions: buildDialogOpenQuestions(outcome, target),
    requiresEditorialReview: requiresEditorialReviewForTarget(target),
    requiresFactcheck: requiresFactcheckForTarget(target),
    autoCreate: false,
    autoPublish: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createHandoffDraftFromExistingTopicMatch(
  match: ExistingTopicMatch,
  target: CreateHandoffDraftTarget,
  decision?: ExistingMatchUserDecision | null,
): CreateHandoffDraft {
  const timestamp = nowIso();
  const authorStandpoint = (() => {
    if (decision === "count_my_position") {
      return `Unterstützt die bestehende Position: ${match.title}`;
    }
    if (decision === "count_as_opposition") {
      return `Widerspricht der bestehenden Position: ${match.title}`;
    }
    if (decision === "add_as_nuance") {
      return `Ergänzt eine alternative oder differenzierende Position zu: ${match.title}`;
    }
    if (decision === "keep_separate") {
      return `Führt eine eigenständige neue Position getrennt weiter zu: ${match.title}`;
    }
    return null;
  })();

  return {
    id: `create-handoff-draft-match-${match.id}-${target}`,
    source: "existing_topic_match",
    target,
    status: buildExistingMatchDraftStatus(match, target),
    title: buildExistingMatchDraftTitle(match, target),
    summary: buildExistingMatchDraftSummary(match, target),
    authorStandpoint,
    existingMatchDecision: decision ?? null,
    topicTitle: match.title,
    relatedMatchId: match.id,
    selectedPerspectiveIds: [],
    selectedBranchIds: match.relatedBranchId ? [match.relatedBranchId] : [],
    selectedArgumentIds: [],
    authorProvidedSources: [],
    authorProvidedExamples: [],
    openQuestions: buildExistingMatchOpenQuestions(match, target),
    requiresEditorialReview: requiresEditorialReviewForTarget(target),
    requiresFactcheck: requiresFactcheckForTarget(target),
    autoCreate: false,
    autoPublish: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getHandoffDraftCtaLabel(draft: CreateHandoffDraft): string {
  if (draft.target === "opinion_count") return "Meinung zählen lassen";
  if (draft.target === "existing_branch_connection") {
    return "An bestehenden Zweig anknüpfen";
  }
  if (draft.target === "new_branch") return "Eigenen Zweig starten";
  if (draft.target === "dossier_candidate") return "Dossier vorbereiten";
  if (draft.target === "anlassraum_candidate") return "Anlassraum vorbereiten";
  if (draft.target === "participation_space_candidate") {
    return "Beteiligungsraum vorbereiten";
  }
  if (draft.target === "factcheck_request") {
    return "Quellenprüfung vorbereiten";
  }
  return "Für Redaktion vormerken";
}

export function getHandoffDraftGuardrailNote(
  draft: CreateHandoffDraft,
): string {
  return draft.target === "existing_branch_connection"
    ? REVIEW_FIRST_MERGE_GUARDRAIL
    : REVIEW_FIRST_GUARDRAIL;
}

export function getHandoffDraftOpenQuestions(
  draft: CreateHandoffDraft,
): string[] {
  return unique(draft.openQuestions);
}

export function canPrepareHandoffDraft(
  draft: CreateHandoffDraft,
): boolean {
  if (!blocksFinalRuntimeCreation(draft)) return false;
  if (draft.status === "rejected" || draft.status === "needs_clarification") {
    return false;
  }
  return hasText(draft.title) && hasText(draft.summary);
}

export function canSubmitHandoffDraftForReview(
  draft: CreateHandoffDraft,
): boolean {
  if (!canPrepareHandoffDraft(draft)) return false;
  if (draft.status === "submitted_for_review" || draft.status === "approved_for_setup") {
    return false;
  }
  return isReviewFirstTarget(draft.target);
}

export function blocksFinalRuntimeCreation(
  draft: CreateHandoffDraft,
): boolean {
  return draft.autoCreate === false && draft.autoPublish === false;
}

export function isReviewFirstTarget(
  target: CreateHandoffDraftTarget,
): boolean {
  return CREATE_HANDOFF_DRAFT_TARGETS.includes(target);
}

export function mapDialogHandoffTargetToCreateHandoffDraftTarget(
  target: DialogHandoffTarget,
): CreateHandoffDraftTarget {
  return mapDialogTargetToDraftTarget(target);
}
