import type { NewsletterAudienceTier } from "./newsletterSubscriptionContract";
import type {
  NewsletterCandidate,
  NewsletterRelevanceDecision,
} from "./newsletterProfileRelevance";

export type NewsletterBriefingDepth = "compact" | "standard" | "deep";

export type NewsletterBriefingPolicy = {
  depth: NewsletterBriefingDepth;
  maxItems: number;
  maxItemsPerTopic: number;
  includeRelevanceExplanation: boolean;
  includeChangeSummary: boolean;
  includeEvidencePointers: boolean;
};

export function resolveNewsletterBriefingPolicy(
  audienceTier: NewsletterAudienceTier,
): NewsletterBriefingPolicy {
  if (audienceTier === "pro" || audienceTier === "organization" || audienceTier === "staff") {
    return {
      depth: "deep",
      maxItems: 10,
      maxItemsPerTopic: 3,
      includeRelevanceExplanation: true,
      includeChangeSummary: true,
      includeEvidencePointers: true,
    };
  }
  if (audienceTier === "plus") {
    return {
      depth: "standard",
      maxItems: 6,
      maxItemsPerTopic: 2,
      includeRelevanceExplanation: true,
      includeChangeSummary: true,
      includeEvidencePointers: false,
    };
  }
  return {
    depth: "compact",
    maxItems: 4,
    maxItemsPerTopic: 2,
    includeRelevanceExplanation: false,
    includeChangeSummary: false,
    includeEvidencePointers: false,
  };
}

export type RankedNewsletterCandidate = {
  candidate: NewsletterCandidate;
  relevance: NewsletterRelevanceDecision;
};

function primaryTopic(candidate: NewsletterCandidate) {
  return candidate.topicKeys?.map((entry) => entry.trim().toLowerCase()).find(Boolean) ?? "__general__";
}

/**
 * Selects a diverse briefing from already-eligible content.
 * Audience tier changes presentation depth/capacity only. It does not modify
 * relevance scores, political stance, factual claims or democratic rights.
 */
export function selectNewsletterBriefingItems(input: {
  audienceTier: NewsletterAudienceTier;
  items: readonly RankedNewsletterCandidate[];
}): RankedNewsletterCandidate[] {
  const policy = resolveNewsletterBriefingPolicy(input.audienceTier);
  const sorted = [...input.items]
    .filter((item) => item.relevance.relevant)
    .sort((left, right) => {
      const importance = (value: NewsletterCandidate["importance"]) =>
        value === "critical" ? 3 : value === "high" ? 2 : 1;
      const importanceDelta = importance(right.candidate.importance) - importance(left.candidate.importance);
      if (importanceDelta !== 0) return importanceDelta;
      if (right.relevance.score !== left.relevance.score) {
        return right.relevance.score - left.relevance.score;
      }
      return left.candidate.id.localeCompare(right.candidate.id);
    });

  const selected: RankedNewsletterCandidate[] = [];
  const topicCounts = new Map<string, number>();

  for (const item of sorted) {
    if (selected.length >= policy.maxItems) break;
    const topic = primaryTopic(item.candidate);
    const count = topicCounts.get(topic) ?? 0;
    if (count >= policy.maxItemsPerTopic && item.candidate.importance !== "critical") continue;
    selected.push(item);
    topicCounts.set(topic, count + 1);
  }

  return selected;
}
