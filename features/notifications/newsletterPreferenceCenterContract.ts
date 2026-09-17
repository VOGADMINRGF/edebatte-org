import {
  DEFAULT_NEWSLETTER_PREFERENCES,
  mergeNewsletterPreferences,
  type NewsletterPreferences,
} from "./newsletterSubscriptionContract";

export type NewsletterPersonalizationSources = {
  profileTopics: boolean;
  profileRegion: boolean;
  watchlistActivity: boolean;
  ownWorkActivity: boolean;
};

export type NewsletterQuietHours = {
  enabled: boolean;
  timezone: string;
  startHourLocal: number;
  endHourLocal: number;
};

export type NewsletterPreferenceCenter = {
  preferences: NewsletterPreferences;
  personalizationSources: NewsletterPersonalizationSources;
  quietHours: NewsletterQuietHours;
  showRelevanceExplanation: boolean;
};

export const DEFAULT_PERSONALIZATION_SOURCES: NewsletterPersonalizationSources = {
  profileTopics: true,
  profileRegion: true,
  watchlistActivity: true,
  ownWorkActivity: true,
};

export const DEFAULT_QUIET_HOURS: NewsletterQuietHours = {
  enabled: true,
  timezone: "Europe/Berlin",
  startHourLocal: 22,
  endHourLocal: 7,
};

function hour(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(23, Math.floor(number)));
}

function timezone(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 80 ? trimmed : fallback;
}

export function mergeNewsletterPreferenceCenter(
  value?: Partial<NewsletterPreferenceCenter> | null,
): NewsletterPreferenceCenter {
  return {
    preferences: mergeNewsletterPreferences(
      value?.preferences ?? DEFAULT_NEWSLETTER_PREFERENCES,
    ),
    personalizationSources: {
      profileTopics:
        value?.personalizationSources?.profileTopics ??
        DEFAULT_PERSONALIZATION_SOURCES.profileTopics,
      profileRegion:
        value?.personalizationSources?.profileRegion ??
        DEFAULT_PERSONALIZATION_SOURCES.profileRegion,
      watchlistActivity:
        value?.personalizationSources?.watchlistActivity ??
        DEFAULT_PERSONALIZATION_SOURCES.watchlistActivity,
      ownWorkActivity:
        value?.personalizationSources?.ownWorkActivity ??
        DEFAULT_PERSONALIZATION_SOURCES.ownWorkActivity,
    },
    quietHours: {
      enabled: value?.quietHours?.enabled ?? DEFAULT_QUIET_HOURS.enabled,
      timezone: timezone(value?.quietHours?.timezone, DEFAULT_QUIET_HOURS.timezone),
      startHourLocal: hour(
        value?.quietHours?.startHourLocal,
        DEFAULT_QUIET_HOURS.startHourLocal,
      ),
      endHourLocal: hour(
        value?.quietHours?.endHourLocal,
        DEFAULT_QUIET_HOURS.endHourLocal,
      ),
    },
    showRelevanceExplanation: value?.showRelevanceExplanation ?? true,
  };
}
