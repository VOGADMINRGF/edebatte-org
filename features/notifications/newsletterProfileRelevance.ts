import type { NewsletterAudienceTier } from "./newsletterSubscriptionContract";

export type NewsletterProfileSignal = {
  topicKeys?: readonly string[] | null;
  regionKeys?: readonly string[] | null;
  watchlistTopicKeys?: readonly string[] | null;
  watchlistRegionKeys?: readonly string[] | null;
  ownWorkTopicKeys?: readonly string[] | null;
  ownWorkRegionKeys?: readonly string[] | null;
  locale?: string | null;
  audienceTier?: NewsletterAudienceTier | null;
};

export type NewsletterCandidate = {
  id: string;
  topicKeys?: readonly string[] | null;
  regionKeys?: readonly string[] | null;
  locale?: string | null;
  kind:
    | "product_update"
    | "topic_update"
    | "region_update"
    | "watchlist_update"
    | "own_work_update"
    | "important_alert";
  importance?: "normal" | "high" | "critical";
  updatedAt?: Date | string | null;
};

export type NewsletterRelevanceReason =
  | "explicit_topic"
  | "explicit_region"
  | "watchlist_topic"
  | "watchlist_region"
  | "own_work_topic"
  | "own_work_region"
  | "locale_match"
  | "important_alert"
  | "no_profile_match";

export type NewsletterRelevanceDecision = {
  candidateId: string;
  score: number;
  relevant: boolean;
  reasons: NewsletterRelevanceReason[];
  audienceTier: NewsletterAudienceTier;
};

function normalizedSet(values?: readonly string[] | null) {
  return new Set(
    (values ?? [])
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
}

function intersects(left: Set<string>, right: Set<string>) {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
}

/**
 * N3 relevance is intentionally topic/region/activity based only.
 * It must never infer ideology, party preference, voting intention or viewpoint.
 */
export function resolveNewsletterProfileRelevance(input: {
  profile: NewsletterProfileSignal;
  candidate: NewsletterCandidate;
  minimumScore?: number;
}): NewsletterRelevanceDecision {
  const { profile, candidate } = input;
  const minimumScore = Math.max(0, input.minimumScore ?? 20);
  const reasons: NewsletterRelevanceReason[] = [];
  let score = 0;

  const explicitTopics = normalizedSet(profile.topicKeys);
  const explicitRegions = normalizedSet(profile.regionKeys);
  const watchlistTopics = normalizedSet(profile.watchlistTopicKeys);
  const watchlistRegions = normalizedSet(profile.watchlistRegionKeys);
  const ownWorkTopics = normalizedSet(profile.ownWorkTopicKeys);
  const ownWorkRegions = normalizedSet(profile.ownWorkRegionKeys);
  const candidateTopics = normalizedSet(candidate.topicKeys);
  const candidateRegions = normalizedSet(candidate.regionKeys);

  if (intersects(explicitTopics, candidateTopics)) {
    score += 30;
    reasons.push("explicit_topic");
  }
  if (intersects(explicitRegions, candidateRegions)) {
    score += 20;
    reasons.push("explicit_region");
  }
  if (intersects(watchlistTopics, candidateTopics)) {
    score += 40;
    reasons.push("watchlist_topic");
  }
  if (intersects(watchlistRegions, candidateRegions)) {
    score += 30;
    reasons.push("watchlist_region");
  }
  if (intersects(ownWorkTopics, candidateTopics)) {
    score += 50;
    reasons.push("own_work_topic");
  }
  if (intersects(ownWorkRegions, candidateRegions)) {
    score += 40;
    reasons.push("own_work_region");
  }

  const profileLocale = profile.locale?.trim().toLowerCase();
  const candidateLocale = candidate.locale?.trim().toLowerCase();
  if (profileLocale && candidateLocale && profileLocale === candidateLocale) {
    score += 5;
    reasons.push("locale_match");
  }

  const importance = candidate.importance ?? "normal";
  if (candidate.kind === "important_alert" || importance === "critical") {
    score += 100;
    reasons.push("important_alert");
  }

  if (reasons.length === 0) reasons.push("no_profile_match");

  return {
    candidateId: candidate.id,
    score,
    relevant: score >= minimumScore,
    reasons,
    audienceTier: profile.audienceTier ?? "public",
  };
}

export function explainNewsletterRelevance(
  decision: NewsletterRelevanceDecision,
): string[] {
  const labels: Record<NewsletterRelevanceReason, string> = {
    explicit_topic: "passt zu einem ausdrücklich gewählten Thema",
    explicit_region: "passt zu einer ausdrücklich gewählten Region",
    watchlist_topic: "betrifft ein beobachtetes Thema",
    watchlist_region: "betrifft eine beobachtete Region",
    own_work_topic: "betrifft ein eigenes Thema oder eine eigene Arbeit",
    own_work_region: "betrifft die Region einer eigenen Arbeit",
    locale_match: "passt zur bevorzugten Sprache",
    important_alert: "ist als wichtige plattformweite Information markiert",
    no_profile_match: "hat aktuell keinen erklärbaren Profilbezug",
  };
  return decision.reasons.map((reason) => labels[reason]);
}
