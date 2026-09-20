import {
  assessSwipeQuestionQuality,
  buildSwipeQuestionAgentPromptFragment,
  type SwipeQuestionQualityAssessment,
} from "./questionQualityContract";
import type {
  SwipeConsequence,
  SwipeConsequenceEvidenceStatus,
  SwipeDecisionConsequences,
  SwipeItem,
} from "./types";

export type SwipeQuestionEvidenceIssue =
  | "missing_consequence_evidence_status"
  | "supported_consequence_missing_source"
  | "mixed_consequence_missing_source"
  | "unverified_consequence_uses_certain_language"
  | "hypothesis_consequence_uses_certain_language";

export type SwipeQuestionEvidenceAssessment = {
  consequenceCount: number;
  supportedCount: number;
  mixedCount: number;
  unverifiedCount: number;
  hypothesisCount: number;
  issues: SwipeQuestionEvidenceIssue[];
};

export type SwipeQuestionFinalizationNeed =
  | `question_quality:${SwipeQuestionQualityAssessment["issues"][number]}`
  | `evidence:${SwipeQuestionEvidenceIssue}`;

export type SwipeQuestionFinalizationResult = {
  item: SwipeItem;
  questionQualityAssessment: SwipeQuestionQualityAssessment;
  evidenceAssessment: SwipeQuestionEvidenceAssessment;
  finalizationNeeds: SwipeQuestionFinalizationNeed[];
  status: "ready_for_review" | "needs_review";
  humanReviewRequired: true;
  canAutoPublish: false;
};

const CERTAIN_CAUSAL_LANGUAGE = [
  /\bführt\s+zu\b/i,
  /\bbewirkt\b/i,
  /\bgarantiert\b/i,
  /\bverhindert\b/i,
  /\breduziert\b/i,
  /\berhöht\b/i,
  /\bsteigert\b/i,
  /\bsenkt\b/i,
] as const;

const UNCERTAINTY_LANGUAGE = [
  /\bkann\b/i,
  /\bkönnte\b/i,
  /\bmöglich/i,
  /\bje nach\b/i,
  /\bhängt\b.*\bab\b/i,
  /\bunter der voraussetzung\b/i,
  /\bbei entsprechender umsetzung\b/i,
] as const;

function normalizedSourceRefs(consequence: SwipeConsequence): string[] {
  return Array.from(
    new Set((consequence.sourceRefs ?? []).map((value) => value.trim()).filter(Boolean)),
  );
}

function usesUnsupportedCertainty(consequence: SwipeConsequence): boolean {
  const text = `${consequence.title} ${consequence.detail ?? ""}`.trim();
  if (!text) return false;
  if (UNCERTAINTY_LANGUAGE.some((pattern) => pattern.test(text))) return false;
  return CERTAIN_CAUSAL_LANGUAGE.some((pattern) => pattern.test(text));
}

function assessConsequence(
  consequence: SwipeConsequence,
  issues: SwipeQuestionEvidenceIssue[],
  counts: Record<SwipeConsequenceEvidenceStatus, number>,
) {
  const status = consequence.evidenceStatus;
  if (!status) {
    issues.push("missing_consequence_evidence_status");
    return;
  }

  counts[status] += 1;
  const sourceRefs = normalizedSourceRefs(consequence);
  if (status === "supported" && sourceRefs.length === 0) {
    issues.push("supported_consequence_missing_source");
  }
  if (status === "mixed" && sourceRefs.length === 0) {
    issues.push("mixed_consequence_missing_source");
  }
  if (status === "unverified" && usesUnsupportedCertainty(consequence)) {
    issues.push("unverified_consequence_uses_certain_language");
  }
  if (status === "hypothesis" && usesUnsupportedCertainty(consequence)) {
    issues.push("hypothesis_consequence_uses_certain_language");
  }
}

export function assessSwipeQuestionEvidence(
  consequences?: SwipeDecisionConsequences,
): SwipeQuestionEvidenceAssessment {
  const issues: SwipeQuestionEvidenceIssue[] = [];
  const counts: Record<SwipeConsequenceEvidenceStatus, number> = {
    supported: 0,
    mixed: 0,
    unverified: 0,
    hypothesis: 0,
  };

  const allConsequences = [
    ...(consequences?.agree ?? []),
    ...(consequences?.disagree ?? []),
  ];
  for (const consequence of allConsequences) {
    assessConsequence(consequence, issues, counts);
  }

  return {
    consequenceCount: allConsequences.length,
    supportedCount: counts.supported,
    mixedCount: counts.mixed,
    unverifiedCount: counts.unverified,
    hypothesisCount: counts.hypothesis,
    issues: Array.from(new Set(issues)),
  };
}

export function finalizeSwipeQuestionCandidate(item: SwipeItem): SwipeQuestionFinalizationResult {
  const questionQualityAssessment = assessSwipeQuestionQuality(item);
  const evidenceAssessment = assessSwipeQuestionEvidence(item.decisionConsequences);
  const finalizationNeeds: SwipeQuestionFinalizationNeed[] = [
    ...questionQualityAssessment.issues.map(
      (issue) => `question_quality:${issue}` as SwipeQuestionFinalizationNeed,
    ),
    ...evidenceAssessment.issues.map(
      (issue) => `evidence:${issue}` as SwipeQuestionFinalizationNeed,
    ),
  ];

  return {
    item,
    questionQualityAssessment,
    evidenceAssessment,
    finalizationNeeds,
    status: finalizationNeeds.length === 0 ? "ready_for_review" : "needs_review",
    humanReviewRequired: true,
    canAutoPublish: false,
  };
}

export function buildSwipeQuestionFinalizerAgentPrompt(): string {
  return [
    buildSwipeQuestionAgentPromptFragment(),
    "SWIPE-CONSEQUENCE-EVIDENCE:",
    "- Liefere für jede mögliche Folge genau einen evidenceStatus: supported, mixed, unverified oder hypothesis.",
    "- supported und mixed benötigen konkrete sourceRefs aus dem vorhandenen Evidenzkontext.",
    "- unverified und hypothesis dürfen als mögliche Folge erhalten bleiben, müssen aber sprachlich Unsicherheit zeigen und dürfen keine sichere Kausalität behaupten.",
    "- Erfinde niemals sourceRefs, Evidenz, Zahlen oder Kausalmechanismen.",
    "- Maximal fünf priorisierte Folgen je Richtung; Zustimmung und Ablehnung müssen getrennt und semantisch verschieden bleiben.",
    "- Der Output ist ein Review-Kandidat. Du darfst ihn nicht selbst veröffentlichen, freigeben oder als amtlich markieren.",
  ].join("\n");
}
