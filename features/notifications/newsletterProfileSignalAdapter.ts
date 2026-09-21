import type {
  NewsletterAudienceTier,
  NewsletterPreferences,
} from "./newsletterSubscriptionContract";
import type { NewsletterPersonalizationSources } from "./newsletterPreferenceCenterContract";
import { DEFAULT_PERSONALIZATION_SOURCES } from "./newsletterPreferenceCenterContract";
import type { NewsletterProfileSignal } from "./newsletterProfileRelevance";

export type NewsletterAccountProfileSource = {
  preferredLocale?: string | null;
  readingLocale?: string | null;
  regionKeys?: readonly string[] | null;
  profile?: {
    topTopics?: ReadonlyArray<{ key?: string | null } | string> | null;
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
  return normalize([
    ...(source?.regionKeys ?? []),
    location?.region,
    location?.countryCode,
  ]);
}

/**
 * Builds the explicit, inspectable profile signal used by N3 relevance.
 * Explicit newsletter topic/region preferences always remain available because
 * the user selected them for this communication channel. Account/activity
 * enrichment can be disabled source-by-source.
 */
export function buildNewsletterProfileSignal(input: {
  account?: NewsletterAccountProfileSource | null;
  preferences?: Partial<NewsletterPreferences> | null;
  activity?: NewsletterActivitySignalSource | null;
  personalizationSources?: Partial<NewsletterPersonalizationSources> | null;
  audienceTier?: NewsletterAudienceTier | null;
}): NewsletterProfileSignal {
  const account = input.account ?? null;
  const preferences = input.preferences ?? null;
  const activity = input.activity ?? null;
  const sources: NewsletterPersonalizationSources = {
    ...DEFAULT_PERSONALIZATION_SOURCES,
    ...(input.personalizationSources ?? {}),
  };

  return {
    topicKeys: normalize([
      ...(preferences?.topicKeys ?? []),
      ...(sources.profileTopics ? profileTopicKeys(account) : []),
    ]),
    regionKeys: normalize([
      ...(preferences?.regionKeys ?? []),
      ...(sources.profileRegion ? profileRegionKeys(account) : []),
    ]),
    watchlistTopicKeys: sources.watchlistActivity
      ? normalize(activity?.watchlistTopicKeys ?? [])
      : [],
    watchlistRegionKeys: sources.watchlistActivity
      ? normalize(activity?.watchlistRegionKeys ?? [])
      : [],
    ownWorkTopicKeys: sources.ownWorkActivity
      ? normalize(activity?.ownWorkTopicKeys ?? [])
      : [],
    ownWorkRegionKeys: sources.ownWorkActivity
      ? normalize(activity?.ownWorkRegionKeys ?? [])
      : [],
    locale:
      account?.readingLocale?.trim() ||
      account?.preferredLocale?.trim() ||
      null,
    audienceTier: input.audienceTier ?? "public",
  };
}
