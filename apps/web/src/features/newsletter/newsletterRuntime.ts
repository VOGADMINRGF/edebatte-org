import crypto from "node:crypto";
import { ObjectId } from "mongodb";

import { coreCol, getCol, getDb } from "@core/db/triMongo";
import {
  deriveNewsletterAudienceTier,
  mergeNewsletterPreferences,
  resolveNewsletterEligibility,
  type NewsletterAudienceTier,
  type NewsletterPreferences,
  type NewsletterSubscriptionStatus,
} from "@features/notifications/newsletterSubscriptionContract";
import {
  mergeNewsletterPreferenceCenter,
  type NewsletterPreferenceCenter,
} from "@features/notifications/newsletterPreferenceCenterContract";
import {
  buildNewsletterProfileSignal,
  type NewsletterActivitySignalSource,
  type NewsletterAccountProfileSource,
} from "@features/notifications/newsletterProfileSignalAdapter";
import {
  explainNewsletterRelevance,
  resolveNewsletterProfileRelevance,
  type NewsletterCandidate,
  type NewsletterRelevanceDecision,
} from "@features/notifications/newsletterProfileRelevance";
import {
  resolveNewsletterBriefingPolicy,
  selectNewsletterBriefingItems,
  type RankedNewsletterCandidate,
} from "@features/notifications/newsletterBriefingPolicy";
import { resolveNewsletterDeliveryPolicy } from "@features/notifications/newsletterDeliveryPolicy";
import { newsletterFailureProvenBeforeExternalHandoff } from "@features/notifications/newsletterDeliveryLifecycle";
import { createNewsletterUnsubscribeToken } from "@features/notifications/newsletterUnsubscribeToken";
import { sendMail, type SendMailResult } from "@/utils/mailer";
import { publicOrigin } from "@/utils/publicOrigin";
import {
  buildNewsletterDigestMail,
  type NewsletterDigestMailItem,
} from "./newsletterMail";

const SUBSCRIBERS_COLLECTION = "public_updates_subscribers";
const DELIVERY_COLLECTION = "newsletter_delivery_ledger";
const SOCIAL_POSTS_COLLECTION = "social_distribution_posts";
const WATCHLIST_COLLECTION = "dossier_watchlists";
const ANLASSRAUM_COLLECTION = "anlassraum";
const REQUIRED_CONSENT_VERSION = process.env.UPDATES_CONSENT_VERSION || "updates_v1";
const APPROVED_SOCIAL_STATUSES = new Set([
  "approved",
  "queued",
  "scheduled_ready",
  "exported",
  "copied",
]);

export type NewsletterDigestCandidate = NewsletterCandidate & {
  title: string;
  summary: string;
  href: string;
  topicLabel?: string | null;
  regionLabel?: string | null;
  verificationLabel?: string | null;
  limitations?: string[];
  dossierId?: string | null;
  sourceCreatedByUserId?: string | null;
  sourceDistributionPostId?: string | null;
  sourceRevisionHash?: string | null;
};

type SubscriberDoc = {
  _id?: ObjectId | string;
  email: string;
  userId?: string | null;
  name?: string | null;
  status: NewsletterSubscriptionStatus;
  consentVersion: string;
  locale?: string | null;
  audienceTier?: NewsletterAudienceTier | null;
  preferences?: Partial<NewsletterPreferences> | null;
  preferenceCenter?: Partial<NewsletterPreferenceCenter> | null;
  confirmedAt?: Date | null;
  lastSentAt?: Date | null;
  lastDigestKey?: string | null;
  lastDigestKeys?: string[] | null;
  lastCandidateIds?: string[] | null;
  lastDeliveryBoundaryAt?: Date | null;
  updatedAt?: Date | null;
};

type UserDoc = {
  _id?: ObjectId;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  roles?: Array<string | { role?: string | null }> | null;
  accessTier?: string | null;
  tier?: string | null;
  regions?: string[] | null;
  settings?: {
    preferredLocale?: string | null;
    readingLocale?: string | null;
  } | null;
  profile?: {
    displayName?: string | null;
    topTopics?: Array<{ key?: string | null } | string> | null;
    publicLocation?: {
      city?: string | null;
      region?: string | null;
      countryCode?: string | null;
    } | null;
  } | null;
  edebatte?: { package?: string | null } | null;
};

type SocialDistributionPostDoc = {
  _id?: string;
  lastNewsletterDeliveryBoundaryAt?: Date | null;
  post?: {
    id?: string;
    dossierId?: string | null;
    regionId?: string | null;
    publicBrand?: string | null;
    sourceState?: string | null;
    title?: string | null;
    status?: string | null;
    channels?: string[] | null;
    channelTexts?: Record<string, string> | null;
    channelNotes?: Record<string, string> | null;
    assets?: Array<{
      kind?: string | null;
      channel?: string | null;
      href?: string | null;
      text?: string | null;
      verificationLabel?: string | null;
    }> | null;
    approval?: {
      reviewRequired?: boolean | null;
      approvedAt?: string | null;
    } | null;
    sourceSummary?: string | null;
    limitations?: string[] | null;
    noAutoPublish?: boolean | null;
    noAutoPublicationApproved?: boolean | null;
    createdByUserId?: string | null;
    updatedAt?: string | null;
  } | null;
  updatedAt?: Date | null;
};

type AnlassraumDoc = {
  dossierId?: ObjectId | null;
  topicKey?: string | null;
  regionKey?: string | null;
  regionCode?: { countryCode?: string | null; regionCode?: string | null } | string | null;
};

type WatchlistDoc = {
  userId?: string | null;
  dossierId?: string | ObjectId | null;
};

type DeliveryDoc = {
  _id: string;
  recipientHash: string;
  userId: string | null;
  digestKey: string;
  candidateIds: string[];
  audienceTier: NewsletterAudienceTier;
  frequency: string;
  status: "sending" | "sent" | "failed" | "skipped";
  attemptCount: number;
  messageId?: string | null;
  failureCategory?: string | null;
  retryable?: boolean | null;
  externalAttemptBoundaryAt?: Date | null;
  externalAttemptId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date | null;
};

export type NewsletterDigestPreview = {
  ok: boolean;
  eligible: boolean;
  skipReason?: string | null;
  email: string;
  audienceTier: NewsletterAudienceTier;
  frequency: NewsletterPreferences["frequency"];
  digestKey: string | null;
  candidateIds: string[];
  items: NewsletterDigestMailItem[];
  subject: string | null;
  html: string | null;
  text: string | null;
  deliveryAllowed: boolean;
  deliveryReason: string;
};

function normalize(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => normalize(value)).filter((value): value is string => Boolean(value))));
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function recipientHash(email: string) {
  return digest(email.trim().toLowerCase()).slice(0, 32);
}

function safeDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function newsletterSourceRevisionHash(doc: SocialDistributionPostDoc) {
  const post = doc.post;
  return digest(
    JSON.stringify({
      id: normalize(post?.id) ?? normalize(doc._id),
      status: normalize(post?.status),
      publicBrand: normalize(post?.publicBrand),
      sourceState: normalize(post?.sourceState),
      title: normalize(post?.title),
      channels: post?.channels ?? [],
      newsletterText: normalize(post?.channelTexts?.newsletter_draft),
      newsletterNote: normalize(post?.channelNotes?.newsletter_draft),
      newsletterAssets: (post?.assets ?? [])
        .filter((entry) => entry.kind === "newsletter_draft" || entry.channel === "newsletter_draft")
        .map((entry) => ({
          kind: normalize(entry.kind),
          channel: normalize(entry.channel),
          href: normalize(entry.href),
          text: normalize(entry.text),
          verificationLabel: normalize(entry.verificationLabel),
        })),
      approval: post?.approval ?? null,
      sourceSummary: normalize(post?.sourceSummary),
      limitations: post?.limitations ?? [],
      noAutoPublish: post?.noAutoPublish === true,
      noAutoPublicationApproved: post?.noAutoPublicationApproved === true,
      postUpdatedAt: safeDate(post?.updatedAt)?.toISOString() ?? null,
      documentUpdatedAt: safeDate(doc.updatedAt)?.toISOString() ?? null,
    }),
  );
}

function isNewsletterSourceEligible(doc: SocialDistributionPostDoc, now: Date) {
  const post = doc.post;
  if (!post) return false;
  if (!(post.channels ?? []).includes("newsletter_draft")) return false;
  if (!APPROVED_SOCIAL_STATUSES.has(String(post.status ?? ""))) return false;
  if (post.publicBrand && post.publicBrand !== "edebatte") return false;
  if (post.sourceState !== "approved_context") return false;
  if (post.noAutoPublish !== true || post.noAutoPublicationApproved !== true) return false;
  if (post.approval?.reviewRequired !== false && !post.approval?.approvedAt) return false;
  if (!normalize(post.title)) return false;
  const newsletterAsset = post.assets?.find(
    (entry) => entry.kind === "newsletter_draft" || entry.channel === "newsletter_draft",
  );
  if (!(normalize(post.channelTexts?.newsletter_draft) ?? normalize(newsletterAsset?.text) ?? normalize(post.sourceSummary))) {
    return false;
  }
  const maxAgeDays = Math.max(1, Math.min(90, Number(process.env.NEWSLETTER_CANDIDATE_MAX_AGE_DAYS || 21)));
  const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
  const updatedAt = safeDate(post.updatedAt) ?? safeDate(doc.updatedAt);
  return !updatedAt || updatedAt.getTime() >= cutoff;
}

function subscriberDeliveryFingerprint(subscriber: SubscriberDoc) {
  return digest(
    JSON.stringify({
      email: subscriber.email.trim().toLowerCase(),
      userId: subscriber.userId ?? null,
      status: subscriber.status,
      consentVersion: subscriber.consentVersion,
      locale: subscriber.locale ?? null,
      audienceTier: subscriber.audienceTier ?? null,
      preferences: subscriber.preferences ?? null,
      preferenceCenter: subscriber.preferenceCenter ?? null,
      confirmedAt: safeDate(subscriber.confirmedAt)?.toISOString() ?? null,
      updatedAt: safeDate(subscriber.updatedAt)?.toISOString() ?? null,
    }),
  );
}

function toObjectId(value: unknown) {
  const raw = normalize(value);
  return raw && ObjectId.isValid(raw) ? new ObjectId(raw) : null;
}

function labelFromKey(value?: string | null) {
  const normalized = normalize(value);
  if (!normalized) return null;
  return normalized
    .replace(/[_:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function rolesFromUser(user: UserDoc | null) {
  if (!user) return [];
  const roles = Array.isArray(user.roles)
    ? user.roles
        .map((entry) => (typeof entry === "string" ? entry : entry?.role ?? null))
        .filter((entry): entry is string => Boolean(entry))
    : [];
  if (roles.length) return roles;
  return user.role ? [user.role] : [];
}

function explicitPriority(note?: string | null): NewsletterCandidate["importance"] {
  const value = String(note ?? "").toLowerCase();
  if (value.includes("priority:critical") || value.includes("[critical]")) return "critical";
  if (value.includes("priority:high") || value.includes("[high]")) return "high";
  return "normal";
}

function localHour(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "12");
    return Number.isFinite(hour) ? hour : 12;
  } catch {
    return localHour(date, "Europe/Berlin");
  }
}

async function loadUserForSubscriber(subscriber: SubscriberDoc): Promise<UserDoc | null> {
  const users = await getCol<UserDoc>("users");
  const oid = toObjectId(subscriber.userId);
  if (oid) {
    const user = await users.findOne({ _id: oid });
    if (user) return user;
  }
  return users.findOne({ email: subscriber.email });
}

async function reloadCanonicalSubscriberForSend(subscriber: SubscriberDoc): Promise<SubscriberDoc | null> {
  const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
  const email = subscriber.email.trim().toLowerCase();
  if (subscriber.userId) {
    const byUserId = await subscribers.findOne({ userId: subscriber.userId } as never);
    if (byUserId) return byUserId;
  }
  return subscribers.findOne({ email } as never);
}

async function loadAnlassraumByDossierIds(dossierIds: string[]) {
  const ids = dossierIds.map(toObjectId).filter((value): value is ObjectId => Boolean(value));
  if (!ids.length) return new Map<string, AnlassraumDoc>();
  const col = await coreCol<AnlassraumDoc>(ANLASSRAUM_COLLECTION);
  const docs = await col
    .find({ dossierId: { $in: ids } } as never)
    .project({ dossierId: 1, topicKey: 1, regionKey: 1, regionCode: 1 })
    .toArray();
  return new Map(
    docs
      .map((doc) => [doc.dossierId?.toHexString?.() ?? "", doc] as const)
      .filter(([id]) => Boolean(id)),
  );
}

export async function loadNewsletterCandidates(now = new Date()): Promise<NewsletterDigestCandidate[]> {
  const col = await coreCol<SocialDistributionPostDoc>(SOCIAL_POSTS_COLLECTION);
  const docs = await col.find({ "post.channels": "newsletter_draft" } as never).sort({ updatedAt: -1 }).limit(300).toArray();
  const maxAgeDays = Math.max(1, Math.min(90, Number(process.env.NEWSLETTER_CANDIDATE_MAX_AGE_DAYS || 21)));
  const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;

  const eligibleDocs = docs.filter((doc) => isNewsletterSourceEligible(doc, now));

  const dossierIds = unique(eligibleDocs.map((doc) => doc.post?.dossierId ?? null));
  const anlassraumByDossier = await loadAnlassraumByDossierIds(dossierIds);

  return eligibleDocs.flatMap((doc) => {
    const post = doc.post!;
    const id = normalize(post.id) ?? normalize(doc._id);
    const title = normalize(post.title);
    if (!id || !title) return [];

    const asset = post.assets?.find((entry) => entry.kind === "newsletter_draft" || entry.channel === "newsletter_draft") ?? null;
    const summary = normalize(post.channelTexts?.newsletter_draft) ?? normalize(asset?.text) ?? normalize(post.sourceSummary);
    if (!summary) return [];

    const dossierId = normalize(post.dossierId);
    const room = dossierId ? anlassraumByDossier.get(dossierId) ?? null : null;
    const topicKeys = unique([room?.topicKey]);
    const regionCode =
      typeof room?.regionCode === "string"
        ? room.regionCode
        : room?.regionCode?.regionCode ?? room?.regionCode?.countryCode ?? null;
    const regionKeys = unique([post.regionId, room?.regionKey, regionCode]);
    const href = normalize(asset?.href) ?? (dossierId ? `/dossier/${encodeURIComponent(dossierId)}` : "/");
    const updatedAt = safeDate(post.updatedAt) ?? safeDate(doc.updatedAt) ?? now;
    const importance = explicitPriority(post.channelNotes?.newsletter_draft);
    const kind: NewsletterCandidate["kind"] = topicKeys.length
      ? "topic_update"
      : regionKeys.length
        ? "region_update"
        : importance === "critical"
          ? "important_alert"
          : "product_update";

    return [{
      id,
      title,
      summary,
      href,
      topicKeys,
      regionKeys,
      locale: "de",
      kind,
      importance,
      updatedAt,
      topicLabel: labelFromKey(topicKeys[0]),
      regionLabel: labelFromKey(regionKeys[0]),
      verificationLabel: normalize(asset?.verificationLabel) ?? "analysiert",
      limitations: (post.limitations ?? []).map((value) => String(value).trim()).filter(Boolean),
      dossierId,
      sourceCreatedByUserId: normalize(post.createdByUserId),
      sourceDistributionPostId: normalize(doc._id) ?? id,
      sourceRevisionHash: newsletterSourceRevisionHash(doc),
    } satisfies NewsletterDigestCandidate];
  });
}

function profileSourceFromUser(user: UserDoc | null): NewsletterAccountProfileSource {
  return {
    preferredLocale: user?.settings?.preferredLocale ?? null,
    readingLocale: user?.settings?.readingLocale ?? null,
    regionKeys: user?.regions ?? [],
    profile: {
      topTopics: user?.profile?.topTopics ?? [],
      publicLocation: user?.profile?.publicLocation ?? null,
    },
  };
}

async function activitySource(input: {
  userId: string | null;
  candidates: NewsletterDigestCandidate[];
}): Promise<NewsletterActivitySignalSource> {
  if (!input.userId) return {};
  const watchlists = await coreCol<WatchlistDoc>(WATCHLIST_COLLECTION);
  const watched = await watchlists.find({ userId: input.userId }).project({ dossierId: 1 }).limit(300).toArray();
  const watchedIds = new Set(watched.map((entry) => String(entry.dossierId ?? "")).filter(Boolean));
  const owned = input.candidates.filter((candidate) => candidate.sourceCreatedByUserId === input.userId);
  const watchedCandidates = input.candidates.filter((candidate) => candidate.dossierId && watchedIds.has(candidate.dossierId));
  return {
    watchlistTopicKeys: unique(watchedCandidates.flatMap((candidate) => [...(candidate.topicKeys ?? [])])),
    watchlistRegionKeys: unique(watchedCandidates.flatMap((candidate) => [...(candidate.regionKeys ?? [])])),
    ownWorkTopicKeys: unique(owned.flatMap((candidate) => [...(candidate.topicKeys ?? [])])),
    ownWorkRegionKeys: unique(owned.flatMap((candidate) => [...(candidate.regionKeys ?? [])])),
  };
}

function relevanceAllowedByPreferences(
  candidate: NewsletterDigestCandidate,
  relevance: NewsletterRelevanceDecision,
  preferences: NewsletterPreferences,
) {
  if (candidate.importance === "critical" || candidate.kind === "important_alert") return preferences.importantAlerts;
  if (relevance.reasons.some((reason) => reason === "watchlist_topic" || reason === "watchlist_region")) {
    return preferences.watchlistUpdates;
  }
  if (relevance.reasons.some((reason) => reason === "own_work_topic" || reason === "own_work_region")) {
    return preferences.ownWorkUpdates;
  }
  if (candidate.kind === "product_update") return preferences.productUpdates;
  if (candidate.kind === "region_update") return preferences.regionUpdates;
  if (candidate.kind === "topic_update") return preferences.topicUpdates;
  return false;
}

function hasPersonalizationSignal(signal: ReturnType<typeof buildNewsletterProfileSignal>) {
  return Boolean(
    signal.topicKeys?.length ||
      signal.regionKeys?.length ||
      signal.watchlistTopicKeys?.length ||
      signal.watchlistRegionKeys?.length ||
      signal.ownWorkTopicKeys?.length ||
      signal.ownWorkRegionKeys?.length,
  );
}

function backfillGeneralItems(input: {
  selected: RankedNewsletterCandidate[];
  candidates: NewsletterDigestCandidate[];
  audienceTier: NewsletterAudienceTier;
  preferences: NewsletterPreferences;
}) {
  if (input.preferences.frequency === "important_only") return input.selected;
  const policy = resolveNewsletterBriefingPolicy(input.audienceTier);
  if (input.selected.length >= Math.min(2, policy.maxItems)) return input.selected;
  const selectedIds = new Set(input.selected.map((entry) => entry.candidate.id));
  const additional = input.candidates
    .filter((candidate) => !selectedIds.has(candidate.id))
    .filter((candidate) =>
      candidate.kind === "product_update"
        ? input.preferences.productUpdates
        : candidate.kind === "region_update"
          ? input.preferences.regionUpdates
          : input.preferences.topicUpdates,
    )
    .sort((left, right) => (safeDate(right.updatedAt)?.getTime() ?? 0) - (safeDate(left.updatedAt)?.getTime() ?? 0))
    .slice(0, Math.min(2, policy.maxItems) - input.selected.length)
    .map((candidate) => ({
      candidate,
      relevance: {
        candidateId: candidate.id,
        score: 0,
        relevant: true,
        reasons: ["no_profile_match" as const],
        audienceTier: input.audienceTier,
      },
    }));
  return [...input.selected, ...additional];
}

function digestKeyFor(candidateIds: string[]) {
  return digest(candidateIds.slice().sort().join("|")).slice(0, 32);
}

function buildMailItems(selected: RankedNewsletterCandidate[], showExplanations: boolean): NewsletterDigestMailItem[] {
  return selected.map(({ candidate, relevance }) => {
    const rich = candidate as NewsletterDigestCandidate;
    return {
      id: candidate.id,
      title: rich.title,
      summary: rich.summary,
      href: rich.href,
      topicLabel: rich.topicLabel ?? null,
      regionLabel: rich.regionLabel ?? null,
      relevanceReasons: showExplanations ? explainNewsletterRelevance(relevance) : [],
      verificationLabel: rich.verificationLabel ?? null,
      limitations: rich.limitations ?? [],
    };
  });
}

function preferenceUrl() {
  return "/account/notifications";
}

function unsubscribeUrl(email: string) {
  const secret = String(process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ?? "").trim();
  if (!secret) return "/updates/unsubscribe?error=not-configured";
  const token = createNewsletterUnsubscribeToken({
    email,
    secret,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  });
  return token ? `/updates/unsubscribe?token=${encodeURIComponent(token)}` : "/updates/unsubscribe?error=invalid";
}

export async function buildNewsletterDigestPreviewForSubscriber(
  subscriber: SubscriberDoc,
  options: { now?: Date; ignoreDeliveryPolicy?: boolean; candidates?: NewsletterDigestCandidate[] } = {},
): Promise<NewsletterDigestPreview> {
  const now = options.now ?? new Date();
  const email = subscriber.email.trim().toLowerCase();
  const eligibility = resolveNewsletterEligibility({
    email,
    status: subscriber.status,
    consentVersion: subscriber.consentVersion,
    requiredConsentVersion: REQUIRED_CONSENT_VERSION,
    channel: "email",
  });

  const user = await loadUserForSubscriber(subscriber);
  const audienceTier = subscriber.audienceTier ?? deriveNewsletterAudienceTier({
    roles: rolesFromUser(user),
    accessTier: user?.accessTier ?? user?.tier ?? null,
    packageId: user?.edebatte?.package ?? null,
  });
  const center = mergeNewsletterPreferenceCenter({
    ...(subscriber.preferenceCenter ?? {}),
    preferences: subscriber.preferenceCenter?.preferences ?? subscriber.preferences ?? undefined,
  });
  const preferences = mergeNewsletterPreferences(center.preferences);

  if (!eligibility.eligible) {
    return {
      ok: true,
      eligible: false,
      skipReason: eligibility.reason,
      email,
      audienceTier,
      frequency: preferences.frequency,
      digestKey: null,
      candidateIds: [],
      items: [],
      subject: null,
      html: null,
      text: null,
      deliveryAllowed: false,
      deliveryReason: eligibility.reason,
    };
  }

  const candidates = options.candidates ?? (await loadNewsletterCandidates(now));
  const recentCandidateIds = new Set(subscriber.lastCandidateIds ?? []);
  const freshCandidates = candidates.filter((candidate) => !recentCandidateIds.has(candidate.id));
  const userId = subscriber.userId ?? (user?._id ? String(user._id) : null);
  const activity = await activitySource({ userId, candidates: freshCandidates });
  const profile = buildNewsletterProfileSignal({
    account: profileSourceFromUser(user),
    preferences,
    activity,
    personalizationSources: center.personalizationSources,
    audienceTier,
  });
  const minimumScore = hasPersonalizationSignal(profile) ? 20 : 0;
  const ranked = freshCandidates
    .map((candidate) => ({
      candidate,
      relevance: resolveNewsletterProfileRelevance({ profile, candidate, minimumScore }),
    }))
    .filter(({ candidate, relevance }) => relevance.relevant && relevanceAllowedByPreferences(candidate, relevance, preferences));

  let selected = selectNewsletterBriefingItems({ audienceTier, items: ranked });
  selected = backfillGeneralItems({ selected, candidates: freshCandidates, audienceTier, preferences });
  selected = selectNewsletterBriefingItems({ audienceTier, items: selected });

  if (!selected.length) {
    return {
      ok: true,
      eligible: true,
      skipReason: "no_relevant_new_items",
      email,
      audienceTier,
      frequency: preferences.frequency,
      digestKey: null,
      candidateIds: [],
      items: [],
      subject: null,
      html: null,
      text: null,
      deliveryAllowed: false,
      deliveryReason: "no_relevant_new_items",
    };
  }

  const candidateIds = selected.map((entry) => entry.candidate.id);
  const digestKey = digestKeyFor(candidateIds);
  const isCritical = selected.some((entry) => entry.candidate.importance === "critical" || entry.candidate.kind === "important_alert");
  const delivery = options.ignoreDeliveryPolicy
    ? { allowed: true, reason: "preview_override" }
    : resolveNewsletterDeliveryPolicy({
        frequency: preferences.frequency,
        audienceTier,
        isCritical,
        now,
        lastSentAt: subscriber.lastSentAt ?? null,
        lastCandidateIds: subscriber.lastDigestKeys ?? (subscriber.lastDigestKey ? [subscriber.lastDigestKey] : []),
        candidateId: digestKey,
        quietHours: {
          enabled: center.quietHours.enabled,
          startHourLocal: center.quietHours.startHourLocal,
          endHourLocal: center.quietHours.endHourLocal,
          localHour: localHour(now, center.quietHours.timezone),
        },
      });

  const items = buildMailItems(selected, center.showRelevanceExplanation);
  const mail = buildNewsletterDigestMail({
    recipientName: normalize(subscriber.name) ?? normalize(user?.profile?.displayName) ?? normalize(user?.name),
    locale: subscriber.locale ?? user?.settings?.preferredLocale ?? "de",
    audienceTier,
    items,
    preferenceUrl: preferenceUrl(),
    unsubscribeUrl: unsubscribeUrl(email),
    generatedAt: now,
  });

  return {
    ok: true,
    eligible: true,
    skipReason: delivery.allowed ? null : delivery.reason,
    email,
    audienceTier,
    frequency: preferences.frequency,
    digestKey,
    candidateIds,
    items,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    deliveryAllowed: delivery.allowed,
    deliveryReason: delivery.reason,
  };
}

async function ensureDeliveryIndexes() {
  const ledger = await coreCol<DeliveryDoc>(DELIVERY_COLLECTION);
  await Promise.all([
    ledger.createIndex({ recipientHash: 1, createdAt: -1 }),
    ledger.createIndex({ status: 1, createdAt: -1 }),
    ledger.createIndex({ sentAt: -1 }, { sparse: true }),
  ]);
  return ledger;
}

function mailResultFailure(result: SendMailResult) {
  return result.ok
    ? null
    : {
        category: result.category,
        retryable: result.retryable,
      };
}

type NewsletterHandoffReservation =
  | { ok: true; subscriber: SubscriberDoc }
  | { ok: false; status: "blocked" | "skipped"; reason: string };

class NewsletterHandoffAbort extends Error {
  constructor(readonly result: Exclude<NewsletterHandoffReservation, { ok: true }>) {
    super(`newsletter_handoff_abort:${result.reason}`);
  }
}

async function reserveNewsletterExternalHandoff(input: {
  subscriber: SubscriberDoc;
  subscriberFingerprint: string;
  candidates: NewsletterDigestCandidate[];
  candidateIds: string[];
  ledger: Awaited<ReturnType<typeof ensureDeliveryIndexes>>;
  deliveryId: string;
  preview: NewsletterDigestPreview;
  now: Date;
}): Promise<NewsletterHandoffReservation> {
  const selected = input.candidateIds.map((candidateId) =>
    input.candidates.find((candidate) => candidate.id === candidateId),
  );
  if (
    selected.some(
      (candidate) =>
        !candidate?.sourceDistributionPostId || !candidate?.sourceRevisionHash,
    )
  ) {
    return { ok: false, status: "blocked", reason: "candidate_state_unavailable" };
  }

  const db = await getDb("core");
  const client = (db as any)?.client;
  if (!client?.startSession) {
    return { ok: false, status: "blocked", reason: "handoff_transaction_unavailable" };
  }

  const session = client.startSession();
  let reservedSubscriber: SubscriberDoc | null = null;
  try {
    await session.withTransaction(async () => {
      const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
      const sources = await coreCol<SocialDistributionPostDoc>(SOCIAL_POSTS_COLLECTION);
      const email = input.subscriber.email.trim().toLowerCase();
      const canonicalSubscriber = input.subscriber.userId
        ? await subscribers.findOne({ userId: input.subscriber.userId } as never, { session })
        : await subscribers.findOne({ email } as never, { session });
      const currentSubscriber =
        canonicalSubscriber ??
        (input.subscriber.userId
          ? await subscribers.findOne({ email } as never, { session })
          : null);
      if (!currentSubscriber) {
        throw new NewsletterHandoffAbort({ ok: false, status: "blocked", reason: "subscriber_not_found" });
      }
      if (subscriberDeliveryFingerprint(currentSubscriber) !== input.subscriberFingerprint) {
        throw new NewsletterHandoffAbort({ ok: false, status: "skipped", reason: "subscriber_state_changed" });
      }

      const subscriberSelector = currentSubscriber._id
        ? { _id: currentSubscriber._id }
        : currentSubscriber.userId
          ? { userId: currentSubscriber.userId }
          : { email: currentSubscriber.email.trim().toLowerCase() };
      const subscriberBoundary = await subscribers.updateOne(
        subscriberSelector as never,
        { $set: { lastDeliveryBoundaryAt: input.now } },
        { session },
      );
      if (subscriberBoundary.matchedCount !== 1) {
        throw new NewsletterHandoffAbort({ ok: false, status: "skipped", reason: "subscriber_state_changed" });
      }

      for (const candidate of selected) {
        const sourceId = candidate!.sourceDistributionPostId!;
        const source = await sources.findOne({ _id: sourceId } as never, { session });
        if (
          !source ||
          !isNewsletterSourceEligible(source, input.now) ||
          newsletterSourceRevisionHash(source) !== candidate!.sourceRevisionHash
        ) {
          throw new NewsletterHandoffAbort({ ok: false, status: "skipped", reason: "candidate_state_changed" });
        }
        const sourceBoundary = await sources.updateOne(
          { _id: sourceId } as never,
          { $set: { lastNewsletterDeliveryBoundaryAt: input.now } },
          { session },
        );
        if (sourceBoundary.matchedCount !== 1) {
          throw new NewsletterHandoffAbort({ ok: false, status: "skipped", reason: "candidate_state_changed" });
        }
      }

      const existing = await input.ledger.findOne({ _id: input.deliveryId }, { session });
      if (existing?.status === "sent") {
        throw new NewsletterHandoffAbort({ ok: false, status: "skipped", reason: "already_sent" });
      }
      if (existing?.status === "sending") {
        throw new NewsletterHandoffAbort({ ok: false, status: "skipped", reason: "ambiguous_previous_attempt" });
      }
      if (existing?.status === "failed" && existing.retryable === false) {
        throw new NewsletterHandoffAbort({ ok: false, status: "skipped", reason: "non_retryable_previous_failure" });
      }

      await input.ledger.updateOne(
        { _id: input.deliveryId },
        {
          $setOnInsert: {
            _id: input.deliveryId,
            recipientHash: recipientHash(input.preview.email),
            userId: currentSubscriber.userId ?? null,
            digestKey: input.preview.digestKey!,
            candidateIds: input.preview.candidateIds,
            audienceTier: input.preview.audienceTier,
            frequency: input.preview.frequency,
            createdAt: input.now,
          },
          $set: {
            status: "sending",
            retryable: false,
            externalAttemptBoundaryAt: input.now,
            externalAttemptId: crypto.randomUUID(),
            updatedAt: input.now,
          },
          $unset: { failureCategory: "" },
          $inc: { attemptCount: 1 },
        },
        { upsert: true, session },
      );
      reservedSubscriber = currentSubscriber;
    });
  } catch (error) {
    if (error instanceof NewsletterHandoffAbort) return error.result;
    return { ok: false, status: "blocked", reason: "handoff_transaction_failed" };
  } finally {
    await session.endSession();
  }

  return reservedSubscriber
    ? { ok: true, subscriber: reservedSubscriber }
    : { ok: false, status: "blocked", reason: "handoff_transaction_failed" };
}

export async function sendNewsletterDigestForSubscriber(
  subscriber: SubscriberDoc,
  options: {
    now?: Date;
    candidates?: NewsletterDigestCandidate[];
    expectedEmail?: string;
    expectedDigestKey?: string;
    expectedCandidateIds?: string[];
  } = {},
) {
  const now = options.now ?? new Date();
  let currentSubscriber: SubscriberDoc | null;
  try {
    currentSubscriber = await reloadCanonicalSubscriberForSend(subscriber);
  } catch {
    return { ok: false as const, status: "blocked" as const, reason: "subscriber_state_unavailable" as const };
  }
  if (!currentSubscriber) {
    return { ok: false as const, status: "blocked" as const, reason: "subscriber_not_found" as const };
  }
  const candidates = options.candidates ?? await loadNewsletterCandidates(now);
  const preview = await buildNewsletterDigestPreviewForSubscriber(currentSubscriber, {
    now,
    candidates,
  });
  if (!preview.deliveryAllowed || !preview.digestKey || !preview.subject || !preview.html || !preview.text) {
    return { ok: true as const, status: "skipped" as const, reason: preview.deliveryReason, preview };
  }
  const expectedEmail = options.expectedEmail?.trim().toLowerCase();
  if (
    (expectedEmail && preview.email !== expectedEmail) ||
    (options.expectedDigestKey && preview.digestKey !== options.expectedDigestKey) ||
    (options.expectedCandidateIds &&
      preview.candidateIds.join("|") !== options.expectedCandidateIds.join("|"))
  ) {
    return { ok: true as const, status: "skipped" as const, reason: "subscriber_state_changed", preview };
  }
  if (!String(process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ?? "").trim()) {
    return { ok: false as const, status: "blocked" as const, reason: "unsubscribe_secret_missing", preview };
  }

  const ledger = await ensureDeliveryIndexes();
  const id = digest(`${preview.email}|${preview.digestKey}`).slice(0, 48);
  const existing = await ledger.findOne({ _id: id });
  if (existing?.status === "sent") {
    return { ok: true as const, status: "skipped" as const, reason: "already_sent", preview };
  }
  if (existing?.status === "sending") {
    return { ok: true as const, status: "skipped" as const, reason: "ambiguous_previous_attempt", preview };
  }
  if (existing?.status === "failed" && existing.retryable === false) {
    return { ok: true as const, status: "skipped" as const, reason: "non_retryable_previous_failure", preview };
  }

  const reservation = await reserveNewsletterExternalHandoff({
    subscriber: currentSubscriber,
    subscriberFingerprint: subscriberDeliveryFingerprint(currentSubscriber),
    candidates,
    candidateIds: preview.candidateIds,
    ledger,
    deliveryId: id,
    preview,
    now,
  });
  if ("status" in reservation) {
    return { ok: reservation.status === "skipped", status: reservation.status, reason: reservation.reason, preview };
  }
  currentSubscriber = reservation.subscriber;

  const mail = {
    subject: preview.subject,
    preheader: preview.subject,
    html: preview.html,
    text: preview.text,
    locale: String(currentSubscriber.locale ?? "de").toLowerCase().startsWith("en") ? "en" as const : "de" as const,
  };
  // Re-rendered provenance is required by the central mailer; build the final mail again.
  const finalMail = buildNewsletterDigestMail({
    recipientName: currentSubscriber.name ?? null,
    locale: currentSubscriber.locale ?? "de",
    audienceTier: preview.audienceTier,
    items: preview.items,
    preferenceUrl: preferenceUrl(),
    unsubscribeUrl: unsubscribeUrl(preview.email),
    generatedAt: now,
  });
  void mail;

  const result = await sendMail({
    to: preview.email,
    mail: finalMail,
    delivery: "required_delivery",
    tag: "newsletter_personalized_digest",
  });

  if (!result.ok) {
    const failure = mailResultFailure(result)!;
    const provenPreHandoffFailure =
      result.attemptedCount === 0 &&
      result.deliveredCount === 0 &&
      newsletterFailureProvenBeforeExternalHandoff(failure.category);
    await ledger.updateOne(
      { _id: id },
      {
        $set: {
          status: "failed",
          failureCategory: failure.category,
          retryable: provenPreHandoffFailure && failure.retryable,
          messageId: result.messageId,
          updatedAt: new Date(),
        },
      },
    );
    return {
      ok: false as const,
      status: "failed" as const,
      reason: provenPreHandoffFailure ? result.category : "ambiguous_delivery_state",
      preview,
      delivery: result,
    };
  }

  const sentAt = new Date();
  await ledger.updateOne(
    { _id: id },
    {
      $set: {
        status: "sent",
        messageId: result.messageId,
        retryable: false,
        sentAt,
        updatedAt: sentAt,
      },
      $unset: { failureCategory: "" },
    },
  );
  const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
  const previousDigestKeys = [preview.digestKey, ...(currentSubscriber.lastDigestKeys ?? [])].filter(Boolean).slice(0, 24);
  const previousCandidateIds = [...preview.candidateIds, ...(currentSubscriber.lastCandidateIds ?? [])].filter(Boolean).slice(0, 100);
  await subscribers.updateOne(
    { email: preview.email },
    {
      $set: {
        lastSentAt: sentAt,
        lastDigestKey: preview.digestKey,
        lastDigestKeys: Array.from(new Set(previousDigestKeys)),
        lastCandidateIds: Array.from(new Set(previousCandidateIds)),
        audienceTier: preview.audienceTier,
        updatedAt: sentAt,
      },
    },
  );
  return { ok: true as const, status: "sent" as const, preview, delivery: result };
}

export async function runNewsletterDeliveryBatch(options: { now?: Date; limit?: number } = {}) {
  const now = options.now ?? new Date();
  const configuredLimit = Number(process.env.NEWSLETTER_BATCH_SIZE || 100);
  const limit = Math.max(1, Math.min(500, options.limit ?? configuredLimit));
  const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
  const candidates = await loadNewsletterCandidates(now);
  const docs = await subscribers
    .find({ status: "active", consentVersion: REQUIRED_CONSENT_VERSION })
    .sort({ lastSentAt: 1, confirmedAt: 1 })
    .limit(limit)
    .toArray();

  const results: Array<Awaited<ReturnType<typeof sendNewsletterDigestForSubscriber>>> = [];
  const concurrency = Math.max(1, Math.min(10, Number(process.env.NEWSLETTER_SEND_CONCURRENCY || 4)));
  for (let index = 0; index < docs.length; index += concurrency) {
    const chunk = docs.slice(index, index + concurrency);
    results.push(...(await Promise.all(chunk.map((subscriber) => sendNewsletterDigestForSubscriber(subscriber, { now, candidates })))))
  }

  return {
    ok: results.every((result) => result.ok),
    checked: docs.length,
    candidates: candidates.length,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed" || result.status === "blocked").length,
    reasons: results.reduce<Record<string, number>>((acc, result) => {
      const reason = "reason" in result ? String(result.reason ?? result.status) : result.status;
      acc[reason] = (acc[reason] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

export async function getNewsletterOperationsSnapshot() {
  const [subscribers, ledger, candidates] = await Promise.all([
    coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION),
    ensureDeliveryIndexes(),
    loadNewsletterCandidates(),
  ]);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [active, pending, unsubscribed, suppressed, sent7d, failed7d] = await Promise.all([
    subscribers.countDocuments({ status: "active", consentVersion: REQUIRED_CONSENT_VERSION }),
    subscribers.countDocuments({ status: "pending" }),
    subscribers.countDocuments({ status: "unsubscribed" }),
    subscribers.countDocuments({ status: "suppressed" }),
    ledger.countDocuments({ status: "sent", sentAt: { $gte: since } }),
    ledger.countDocuments({ status: "failed", updatedAt: { $gte: since } }),
  ]);
  const latest = await ledger.find({}).sort({ updatedAt: -1 }).limit(20).toArray();
  return {
    sourceOfTruth: SUBSCRIBERS_COLLECTION,
    consentVersion: REQUIRED_CONSENT_VERSION,
    subscriberCounts: { active, pending, unsubscribed, suppressed },
    candidateCount: candidates.length,
    delivery7d: { sent: sent7d, failed: failed7d },
    latest: latest.map((entry) => ({
      id: entry._id,
      recipientHash: entry.recipientHash,
      audienceTier: entry.audienceTier,
      status: entry.status,
      candidateCount: entry.candidateIds.length,
      attemptCount: entry.attemptCount,
      failureCategory: entry.failureCategory ?? null,
      retryable: entry.retryable ?? null,
      updatedAt: entry.updatedAt.toISOString(),
      sentAt: entry.sentAt?.toISOString() ?? null,
    })),
  };
}

export async function getNewsletterPreferenceStateForUser(userId: string) {
  const users = await getCol<UserDoc>("users");
  const oid = toObjectId(userId);
  if (!oid) return null;
  const user = await users.findOne({ _id: oid });
  if (!user?.email) return null;
  const email = user.email.trim().toLowerCase();
  const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
  const subscriber = await subscribers.findOne({ $or: [{ userId }, { email }] } as never);
  if (!subscriber) {
    return {
      email,
      status: "not_subscribed" as const,
      audienceTier: deriveNewsletterAudienceTier({
        roles: rolesFromUser(user),
        accessTier: user.accessTier ?? user.tier ?? null,
        packageId: user.edebatte?.package ?? null,
      }),
      center: mergeNewsletterPreferenceCenter(null),
    };
  }
  return {
    email,
    status: subscriber.status,
    audienceTier: subscriber.audienceTier ?? deriveNewsletterAudienceTier({
      roles: rolesFromUser(user),
      accessTier: user.accessTier ?? user.tier ?? null,
      packageId: user.edebatte?.package ?? null,
    }),
    center: mergeNewsletterPreferenceCenter({
      ...(subscriber.preferenceCenter ?? {}),
      preferences: subscriber.preferenceCenter?.preferences ?? subscriber.preferences ?? undefined,
    }),
  };
}

export async function updateNewsletterPreferenceStateForUser(
  userId: string,
  patch: Partial<NewsletterPreferenceCenter>,
) {
  const users = await getCol<UserDoc>("users");
  const oid = toObjectId(userId);
  if (!oid) return { ok: false as const, error: "invalid_user" };
  const user = await users.findOne({ _id: oid });
  if (!user?.email) return { ok: false as const, error: "email_required" };
  const email = user.email.trim().toLowerCase();
  const subscribers = await coreCol<SubscriberDoc>(SUBSCRIBERS_COLLECTION);
  const existing = await subscribers.findOne({ $or: [{ userId }, { email }] } as never);
  if (!existing) return { ok: false as const, error: "subscription_required" };

  const current = mergeNewsletterPreferenceCenter({
    ...(existing.preferenceCenter ?? {}),
    preferences: existing.preferenceCenter?.preferences ?? existing.preferences ?? undefined,
  });
  const next = mergeNewsletterPreferenceCenter({
    ...current,
    ...patch,
    preferences: patch.preferences ? { ...current.preferences, ...patch.preferences } : current.preferences,
    personalizationSources: patch.personalizationSources
      ? { ...current.personalizationSources, ...patch.personalizationSources }
      : current.personalizationSources,
    quietHours: patch.quietHours ? { ...current.quietHours, ...patch.quietHours } : current.quietHours,
  });
  const audienceTier = deriveNewsletterAudienceTier({
    roles: rolesFromUser(user),
    accessTier: user.accessTier ?? user.tier ?? null,
    packageId: user.edebatte?.package ?? null,
  });
  const now = new Date();
  await subscribers.updateOne(
    { email },
    {
      $set: {
        userId,
        preferenceCenter: next,
        preferences: next.preferences,
        audienceTier,
        locale: existing.locale ?? user.settings?.preferredLocale ?? "de",
        updatedAt: now,
      },
    },
  );
  return { ok: true as const, state: await getNewsletterPreferenceStateForUser(userId) };
}

export function newsletterRuntimeConfiguration() {
  return {
    origin: publicOrigin(),
    consentVersion: REQUIRED_CONSENT_VERSION,
    unsubscribeConfigured: Boolean(String(process.env.NEWSLETTER_UNSUBSCRIBE_SECRET ?? "").trim()),
    cronConfigured: Boolean(String(process.env.CRON_SECRET ?? "").trim()),
    batchSize: Math.max(1, Math.min(500, Number(process.env.NEWSLETTER_BATCH_SIZE || 100))),
  };
}
