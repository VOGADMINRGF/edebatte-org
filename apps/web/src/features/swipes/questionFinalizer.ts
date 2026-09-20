import { assessSwipeQuestionQuality } from "./questionQualityContract";
import type {
  SwipeConsequence,
  SwipeConsequenceEvidenceStatus,
  SwipeDecisionConsequences,
  SwipeItem,
} from "./types";

export type SwipeQuestionFinalizerStatus = "ready_for_review" | "needs_review";

export type SwipeQuestionFinalizerInput = {
  id: string;
  title: string;
  text?: string;
  humanContext?: string | null;
  tradeoff?: string | null;
  decisionConsequences?: SwipeDecisionConsequences | null;
  category?: string | null;
  level?: SwipeItem["level"];
  topicTags?: string[];
  responsibilityLabel?: string | null;
  domainLabel?: string | null;
  evidenceCount?: number;
};

export type SwipeQuestionFinalizerQuality = {
  ready: boolean;
  issues: string[];
};

export type SwipeQuestionFinalizerResult = {
  item: SwipeItem;
  status: SwipeQuestionFinalizerStatus;
  quality: SwipeQuestionFinalizerQuality;
  requiresHumanReview: boolean;
};

function validEvidenceRefs(consequence: SwipeConsequence) {
  return consequence.evidenceRefs?.filter((ref) => Boolean(ref?.id?.trim())) ?? [];
}

function normalizeEvidenceStatus(
  consequence: SwipeConsequence,
): SwipeConsequenceEvidenceStatus {
  return consequence.evidenceStatus ?? "unverified";
}

function normalizeConsequence(consequence: SwipeConsequence): SwipeConsequence {
  const evidenceRefs = validEvidenceRefs(consequence);
  return {
    ...consequence,
    title: consequence.title.trim(),
    detail: consequence.detail?.trim() || undefined,
    evidenceRefs,
    evidenceStatus: normalizeEvidenceStatus(consequence),
  };
}

function normalizeConsequences(
  consequences?: SwipeDecisionConsequences | null,
): SwipeDecisionConsequences | undefined {
  if (!consequences) return undefined;
  return {
    agree: consequences.agree.slice(0, 5).map(normalizeConsequence),
    disagree: consequences.disagree.slice(0, 5).map(normalizeConsequence),
  };
}

function hasUnsafeCertaintyWithoutEvidence(consequence: SwipeConsequence): boolean {
  const status = normalizeEvidenceStatus(consequence);
  if (status === "verified" || status === "supported") return false;
  const text = `${consequence.title} ${consequence.detail ?? ""}`.toLocaleLowerCase("de-DE");
  return /\b(wird|führt zu|verhindert|senkt|erhöht|garantiert|bewirkt|beseitigt)\b/.test(text);
}

function evidenceIssues(consequences?: SwipeDecisionConsequences): string[] {
  if (!consequences) return [];
  const issues: string[] = [];
  for (const [direction, entries] of [
    ["agree", consequences.agree],
    ["disagree", consequences.disagree],
  ] as const) {
    entries.forEach((entry, index) => {
      const status = normalizeEvidenceStatus(entry);
      const refCount = validEvidenceRefs(entry).length;
      if ((status === "verified" || status === "supported") && refCount === 0) {
        issues.push(`evidence_status_without_refs:${direction}:${index}`);
      }
      if (hasUnsafeCertaintyWithoutEvidence(entry)) {
        issues.push(`unsupported_causal_certainty:${direction}:${index}`);
      }
    });
  }
  return issues;
}

export function finalizeSwipeQuestionCandidate(
  input: SwipeQuestionFinalizerInput,
): SwipeQuestionFinalizerResult {
  const decisionConsequences = normalizeConsequences(input.decisionConsequences);
  const item: SwipeItem = {
    id: input.id,
    title: input.title.trim(),
    text: input.text?.trim() || undefined,
    humanContext: input.humanContext?.trim() || undefined,
    tradeoff: input.tradeoff?.trim() || undefined,
    decisionConsequences,
    category: input.category?.trim() || "Thema",
    level: input.level ?? "Bund",
    topicTags: input.topicTags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
    evidenceCount: Math.max(0, input.evidenceCount ?? 0),
    responsibilityLabel: input.responsibilityLabel?.trim() || "Zuständigkeit offen",
    domainLabel: input.domainLabel?.trim() || input.category?.trim() || "Thema",
    hasEventualities: false,
    eventualitiesCount: 0,
  };

  const baseQuality = assessSwipeQuestionQuality(item);
  const provenanceIssues = evidenceIssues(decisionConsequences);
  const quality: SwipeQuestionFinalizerQuality = {
    ready: baseQuality.ready && provenanceIssues.length === 0,
    issues: [...baseQuality.issues, ...provenanceIssues],
  };

  item.questionQualityAssessment = {
    ready: quality.ready,
    issues: quality.issues,
    assessedAt: null,
  };

  return {
    item,
    status: quality.ready ? "ready_for_review" : "needs_review",
    quality,
    requiresHumanReview: !quality.ready,
  };
}
