import type {
  NewsletterAudienceTier,
  NewsletterPreferences,
} from "./newsletterSubscriptionContract";
import type { NewsletterProfileSignal } from "./newsletterProfileRelevance";

export type NewsletterAccountProfileSource = {
  preferredLocale?: string | null;
  readingLocale?: string | null;
  profile?: {
    topTopics?: readonly Array<{ key?: string | null } | string> | null;
    publicLocation?: {
      city?: string | null;
      region?: string | null;
      countryCode?: string | null;
    } | null;
  } | null;
};

export type NewsletterActivitySignalSource = {
  watchlistTopicKeys?: readonly string[] | null;
  watchlistRegionKeys?: readonly string[] | null;
  ownWorkTopicKeys?: readonly string[] | null;
  ownWorkRegionKeys?: readonly string[] | null;
};

function normalize(values: readonly (string | null | undefined)[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function profileTopicKeys(source?: NewsletterAccountProfileSource | null) {
  const topics = source?.profile?.topTopics ?? [];
  return normalize(
    topics.map((entry) =>
      typeof entry === "string" ? entry : entry?.key ?? null,
    ),
  );
}

function profileRegionKeys(source?: NewsletterAccountProfileSource | null) {
  const location = source?.profile?.publicLocation;
  if (!location) return [];
  return normalize([location.region, location.countryCode]);
}

/**
 * Builds the explicit, inspectable profile signal used by N3 relevance.
 * Subscription preferences and profile selections are additive; no hidden
 * ideology, demographic or voting-preference inference is performed here.
 */
export function buildNewsletterProfileSignal(input: {
  account?: NewsletterAccountProfileSource | null;
  preferences?: Partial<NewsletterPreferences> | null;
  activity?: NewsletterActivitySignalSource | null;
  audienceTier?: NewsletterAudienceTier | null;
}): NewsletterProfileSignal {
  const account = input.account ?? null;
  const preferences = input.preferences ?? null;
  const activity = input.activity ?? null;

  return {
    topicKeys: normalize([
      ...(preferences?.topicKeys ?? []),
      ...profileTopicKeys(account),
    ]),
    regionKeys: normalize([
      ...(preferences?.regionKeys ?? []),
      ...profileRegionKeys(account),
    ]),
    watchlistTopicKeys: normalize(activity?.watchlistTopicKeys ?? []),
    watchlistRegionKeys: normalize(activity?.watchlistRegionKeys ?? []),
    ownWorkTopicKeys: normalize(activity?.ownWorkTopicKeys ?? []),
    ownWorkRegionKeys: normalize(activity?.ownWorkRegionKeys ?? []),
    locale:
      account?.readingLocale?.trim() ||
      account?.preferredLocale?.trim() ||
      null,
    audienceTier: input.audienceTier ?? "public",
  };
}
