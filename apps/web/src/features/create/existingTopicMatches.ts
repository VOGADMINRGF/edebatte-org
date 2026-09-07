import type {
  DialogBranchStatus,
  DialogOutcome,
  DialogResultStatus,
} from "@/features/dialog/dialogIntelligenceContract";
import {
  canCountOpinion,
  summarizeRecognizedStandpoint,
} from "@/features/dialog/dialogIntelligenceContract";

export const EXISTING_TOPIC_MATCH_KINDS = [
  "topic",
  "branch",
  "participation_space",
  "dossier",
  "opinion_cluster",
  "source_question",
] as const;

export type ExistingTopicMatchKind =
  (typeof EXISTING_TOPIC_MATCH_KINDS)[number];

export const EXISTING_TOPIC_MATCH_STRENGTHS = [
  "weak",
  "medium",
  "strong",
] as const;

export type ExistingTopicMatchStrength =
  (typeof EXISTING_TOPIC_MATCH_STRENGTHS)[number];

export const EXISTING_TOPIC_MATCH_STATUSES = [
  "suggested",
  "user_selected",
  "parked",
  "needs_review",
  "rejected",
] as const;

export type ExistingTopicMatchStatus =
  (typeof EXISTING_TOPIC_MATCH_STATUSES)[number];

export type ExistingTopicMatch = {
  id: string;
  kind: ExistingTopicMatchKind;
  title: string;
  summary: string;
  strength: ExistingTopicMatchStrength;
  status: ExistingTopicMatchStatus;
  reason: string;
  relation?: "supporting" | "opposing" | "related" | "unclear";
  relatedTopicId?: string | null;
  relatedBranchId?: string | null;
  relatedParticipationSpaceId?: string | null;
  relatedDossierId?: string | null;
  countedOpinions?: number | null;
  requiresReview: boolean;
};

export const EXISTING_TOPIC_MATCH_DECISIONS = [
  "start_new_branch",
  "connect_to_existing",
  "count_only",
  "prepare_dossier_candidate",
  "prepare_anlassraum_candidate",
  "ask_for_review",
] as const;

export type ExistingTopicMatchDecision =
  (typeof EXISTING_TOPIC_MATCH_DECISIONS)[number];

export type ExistingTopicMatchPanelModel = {
  topicTitle: string;
  introText: string;
  matches: ExistingTopicMatch[];
  suggestedDecision: ExistingTopicMatchDecision;
  openQuestions: string[];
  guardrailNote: string;
  sourceKind?: "preview" | "runtime" | "hybrid";
  sourceLabel?: string | null;
  emptyStateText?: string | null;
  outcomeResultStatus?: DialogResultStatus;
};

export const EXISTING_TOPIC_MATCH_PANEL_INTRO =
  "Dein Beitrag muss nicht allein stehen. eDebatte kann prüfen, ob er an bestehende Themen, Zweige oder Beteiligungsräume anschließt – oder ob du bewusst einen neuen Zweig starten möchtest.";

export const EXISTING_TOPIC_MATCH_GUARDRAIL_NOTE =
  "Das sind Anschlussvorschläge, keine automatische Zusammenführung.";

function strengthRank(strength: ExistingTopicMatchStrength): number {
  if (strength === "strong") return 3;
  if (strength === "medium") return 2;
  return 1;
}

function statusRank(status: ExistingTopicMatchStatus): number {
  if (status === "user_selected") return 4;
  if (status === "needs_review") return 3;
  if (status === "suggested") return 2;
  if (status === "parked") return 1;
  return 0;
}

function mapBranchStatus(
  status: DialogBranchStatus,
): ExistingTopicMatchStatus {
  if (status === "accepted_by_user") return "user_selected";
  if (status === "review_ready") return "needs_review";
  if (status === "parked") return "parked";
  return "suggested";
}

function hasNeedsSourceClaim(outcome: DialogOutcome): boolean {
  return outcome.arguments.some(
    (argument) => argument.verificationStatus === "needs_source",
  );
}

function isRejectedOutcome(outcome: DialogOutcome): boolean {
  return outcome.resultStatus === "rejected";
}

function buildTopicMatch(outcome: DialogOutcome): ExistingTopicMatch {
  const summary =
    summarizeRecognizedStandpoint(outcome) ||
    "Zu diesem Beitrag ist bereits ein ähnlicher Themenfokus erkennbar.";

  return {
    id: `existing-topic-topic-${outcome.id}`,
    kind: "topic",
    title: outcome.topicTitle,
    summary,
    strength:
      outcome.recognizedStandpoint.confidence === "high" ||
      outcome.recognizedStandpoint.confirmedByUser
        ? "medium"
        : "weak",
    status: isRejectedOutcome(outcome) ? "rejected" : "suggested",
    reason:
      "Thema und erkannter Standpunkt deuten auf einen bereits vorhandenen Themenanschluss hin.",
    relatedTopicId: outcome.id,
    requiresReview: false,
  };
}

function buildBranchMatches(outcome: DialogOutcome): ExistingTopicMatch[] {
  return outcome.branches.slice(0, 2).map((branch) => ({
    id: `existing-topic-branch-${branch.id}`,
    kind: "branch",
    title: branch.title,
    summary:
      branch.reason ||
      "Dieser Zweig könnte einen vorhandenen Arbeitsstrang weiterführen.",
    strength:
      branch.status === "review_ready" || branch.status === "accepted_by_user"
        ? "strong"
        : "medium",
    status: isRejectedOutcome(outcome)
      ? "rejected"
      : mapBranchStatus(branch.status),
    reason:
      "Ein ähnlicher Zweig wurde bereits erkannt und kann getrennt weiterbearbeitet werden.",
    relatedTopicId: outcome.id,
    relatedBranchId: branch.id,
    requiresReview: false,
  }));
}

function buildParticipationSpaceMatch(
  outcome: DialogOutcome,
): ExistingTopicMatch | null {
  if (!outcome.handoffTargets.includes("participation_space_candidate")) {
    return null;
  }

  return {
    id: `existing-topic-space-${outcome.id}`,
    kind: "participation_space",
    title: `${outcome.topicTitle} im Beteiligungsraum weiterführen`,
    summary:
      "Ein vorhandener Beteiligungsraum könnte ähnliche Fragen, Perspektiven oder lokale Erfahrung bündeln.",
    strength:
      outcome.resultStatus === "review_ready" ||
      outcome.engagementMode === "prepare_dossier_or_space"
        ? "strong"
        : "medium",
    status: isRejectedOutcome(outcome)
      ? "rejected"
      : outcome.resultStatus === "review_ready" ||
          outcome.resultStatus === "needs_review"
        ? "needs_review"
        : "suggested",
    reason:
      "Das Thema wirkt anschlussfähig für einen bestehenden Beteiligungsraum, bleibt aber review-first.",
    relatedParticipationSpaceId: `preview-space-${outcome.id}`,
    requiresReview: true,
  };
}

function buildDossierMatch(outcome: DialogOutcome): ExistingTopicMatch | null {
  if (!outcome.handoffTargets.includes("dossier_candidate")) {
    return null;
  }

  return {
    id: `existing-topic-dossier-${outcome.id}`,
    kind: "dossier",
    title: `${outcome.topicTitle} als Dossier-Anknüpfung`,
    summary:
      "Ein bestehender Dossierpfad könnte Argumente, offene Fragen und spätere Evidenz gebündelt aufnehmen.",
    strength:
      outcome.resultStatus === "review_ready" ||
      outcome.resultStatus === "needs_review"
        ? "strong"
        : "medium",
    status: isRejectedOutcome(outcome)
      ? "rejected"
      : outcome.recognizedStandpoint.confirmedByUser
        ? "needs_review"
        : "suggested",
    reason:
      "Dossierpfade bleiben vorbereitend und brauchen bewusste Prüfung vor jedem weiteren Schritt.",
    relatedDossierId: `preview-dossier-${outcome.id}`,
    requiresReview: true,
  };
}

function buildOpinionClusterMatch(
  outcome: DialogOutcome,
): ExistingTopicMatch | null {
  if (!outcome.handoffTargets.includes("count_opinion") && !canCountOpinion(outcome)) {
    return null;
  }

  return {
    id: `existing-topic-opinion-${outcome.id}`,
    kind: "opinion_cluster",
    title: `Ähnliche Meinungen zu ${outcome.topicTitle}`,
    summary:
      "Ähnliche Beiträge können nur als vorsichtiger Meinungscluster vorgemerkt werden, nicht als repräsentative Statistik.",
    strength:
      outcome.userOpenness === "low" || outcome.engagementMode === "count_only"
        ? "medium"
        : "weak",
    status: isRejectedOutcome(outcome) ? "rejected" : "suggested",
    reason:
      "Der Beitrag kann auch nur als ähnliche Meinung eingeordnet werden, ohne einen Zweig zu übernehmen.",
    requiresReview: false,
  };
}

function buildSourceQuestionMatch(
  outcome: DialogOutcome,
): ExistingTopicMatch | null {
  if (
    !outcome.handoffTargets.includes("factcheck_request") &&
    !hasNeedsSourceClaim(outcome)
  ) {
    return null;
  }

  return {
    id: `existing-topic-source-${outcome.id}`,
    kind: "source_question",
    title: "Quellen- und Belegfrage vormerken",
    summary:
      "Zum Beitrag gibt es Aussagen, die eher in einen Quellenprüfungs- oder Belegpfad gehören als in eine automatische Einordnung.",
    strength: hasNeedsSourceClaim(outcome) ? "strong" : "medium",
    status: isRejectedOutcome(outcome) ? "rejected" : "needs_review",
    reason:
      "Hier wären Quellen oder überprüfbare Belege hilfreich, bevor mehr daraus abgeleitet wird.",
    requiresReview: true,
  };
}

export function getVisibleExistingTopicMatches(
  model: ExistingTopicMatchPanelModel,
): ExistingTopicMatch[] {
  return model.matches.filter((match) => match.status !== "rejected");
}

export function getPrimaryExistingTopicMatch(
  model: ExistingTopicMatchPanelModel,
): ExistingTopicMatch | null {
  const matches = getVisibleExistingTopicMatches(model).slice();
  if (matches.length === 0) return null;

  matches.sort((left, right) => {
    const strengthDiff = strengthRank(right.strength) - strengthRank(left.strength);
    if (strengthDiff !== 0) return strengthDiff;
    return statusRank(right.status) - statusRank(left.status);
  });

  return matches[0] ?? null;
}

export function getExistingTopicMatchCtaLabel(
  match: ExistingTopicMatch,
): string {
  if (match.kind === "opinion_cluster") {
    return "Als ähnliche Meinung zählen";
  }
  if (match.kind === "source_question") {
    return "Quelle prüfen";
  }
  if (match.kind === "dossier") {
    return "Dossier prüfen";
  }
  if (match.kind === "participation_space") {
    return "Beteiligung vorbereiten";
  }
  return "An Debatte anknüpfen";
}

export function getExistingTopicMatchGuardrailNote(
  model: ExistingTopicMatchPanelModel,
): string {
  return model.guardrailNote || EXISTING_TOPIC_MATCH_GUARDRAIL_NOTE;
}

export function canConnectToExistingTopic(
  match: ExistingTopicMatch,
): boolean {
  if (match.status === "rejected") return false;
  if (
    match.status !== "suggested" &&
    match.status !== "user_selected" &&
    match.status !== "needs_review"
  ) {
    return false;
  }

  return (
    match.kind === "topic" ||
    match.kind === "branch" ||
    match.kind === "participation_space" ||
    match.kind === "dossier"
  );
}

export function canStartNewBranch(
  model: ExistingTopicMatchPanelModel,
): boolean {
  return model.outcomeResultStatus !== "rejected";
}

export function canPrepareMatchForReview(
  match: ExistingTopicMatch,
): boolean {
  if (match.status === "rejected") return false;
  return (
    match.requiresReview ||
    match.strength === "medium" ||
    match.strength === "strong"
  );
}

export function createExistingTopicMatchPanelPreviewFromDialogOutcome(
  outcome: DialogOutcome,
): ExistingTopicMatchPanelModel {
  const matches = [
    buildTopicMatch(outcome),
    ...buildBranchMatches(outcome),
    buildParticipationSpaceMatch(outcome),
    buildDossierMatch(outcome),
    buildOpinionClusterMatch(outcome),
    buildSourceQuestionMatch(outcome),
  ].filter(Boolean) as ExistingTopicMatch[];

  const suggestedDecision = isRejectedOutcome(outcome)
    ? "ask_for_review"
    : hasNeedsSourceClaim(outcome)
      ? "ask_for_review"
      : outcome.handoffTargets.includes("participation_space_candidate")
        ? "prepare_anlassraum_candidate"
        : outcome.handoffTargets.includes("dossier_candidate")
          ? "prepare_dossier_candidate"
          : canCountOpinion(outcome) &&
              (outcome.engagementMode === "count_only" || outcome.userOpenness === "low")
            ? "count_only"
            : outcome.branches.length > 0
              ? "connect_to_existing"
              : "start_new_branch";

  return {
    topicTitle: outcome.topicTitle,
    introText: EXISTING_TOPIC_MATCH_PANEL_INTRO,
    matches,
    suggestedDecision,
    openQuestions: outcome.openQuestions,
    guardrailNote: EXISTING_TOPIC_MATCH_GUARDRAIL_NOTE,
    sourceKind: "preview",
    sourceLabel: "Preview auf Basis lokaler Beispieldaten",
    emptyStateText: null,
    outcomeResultStatus: outcome.resultStatus,
  };
}
