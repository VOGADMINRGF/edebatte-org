import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { z } from "zod";
import type { RegionPublicationVisibilityState } from "@features/region/publicationRiskLadder";
import {
  REGION_PUBLICATION_VISIBILITY_STATES,
} from "@features/region/publicationRiskLadder";
import {
  SOCIAL_DISTRIBUTION_CHANNELS,
  type SocialDistributionChannel,
  type SocialScheduleMode,
} from "./socialDistribution";
import {
  buildSocialChannelConnections,
  buildSocialSchedulerEntries,
  SocialChannelConnectionSchema,
  SocialSchedulerEntrySchema,
  transitionSocialSchedulerEntry,
  type SocialSchedulerStatus,
} from "./socialConnectorScheduler";
import { buildShareOutputAsset } from "@features/share/socialOutputContract";
import {
  SOCIAL_DISTRIBUTION_V1_STATUSES,
  socialDistributionStatusLabel as socialDistributionStatusLabelFromContract,
  type SocialDistributionV1Status,
} from "./socialDistributionStatusContract";

export const SOCIAL_DISTRIBUTION_STATUSES = SOCIAL_DISTRIBUTION_V1_STATUSES;

export type SocialDistributionStatus = SocialDistributionV1Status;

export const SOCIAL_DISTRIBUTION_AUDIT_ACTIONS = [
  "create_draft",
  "generate_assets",
  "request_review",
  "approve",
  "queue",
  "mark_scheduled_ready",
  "schedule_channel",
  "posting_started",
  "posting_succeeded",
  "posting_failed",
  "cancel_channel",
  "mark_exported",
  "mark_copied",
  "block",
  "fail",
  "archive",
] as const;

export type SocialDistributionAuditAction =
  (typeof SOCIAL_DISTRIBUTION_AUDIT_ACTIONS)[number];

export const SOCIAL_DISTRIBUTION_ASSET_KINDS = [
  "channel_text",
  "newsletter_draft",
  "embed_snippet",
  "qr_asset",
  "instagram_asset",
  "press_note",
  "share_reference",
] as const;

export type SocialDistributionAssetKind =
  (typeof SOCIAL_DISTRIBUTION_ASSET_KINDS)[number];

export const SOCIAL_DISTRIBUTION_CONTEXT_TYPES = [
  "dossier",
  "topic_page",
  "round",
  "claim",
  "marketing_campaign",
] as const;

export type SocialDistributionContextType =
  (typeof SOCIAL_DISTRIBUTION_CONTEXT_TYPES)[number];

export const SOCIAL_DISTRIBUTION_PUBLIC_BRANDS = [
  "edebatte",
  "voiceopengov",
  "vote4gov",
] as const;

export type SocialDistributionPublicBrand =
  (typeof SOCIAL_DISTRIBUTION_PUBLIC_BRANDS)[number];

export const SOCIAL_DISTRIBUTION_SOURCE_STATES = [
  "review_only",
  "approved_context",
  "internal_only",
] as const;

export type SocialDistributionSourceState =
  (typeof SOCIAL_DISTRIBUTION_SOURCE_STATES)[number];

export const SocialDistributionAssetSchema = z
  .object({
    id: z.string().trim().min(1),
    channel: z.enum(SOCIAL_DISTRIBUTION_CHANNELS),
    kind: z.enum(SOCIAL_DISTRIBUTION_ASSET_KINDS),
    label: z.string().trim().min(1),
    href: z.string().trim().min(1).nullable(),
    text: z.string().trim().min(1).nullable(),
    verificationLabel: z.enum(["analysiert", "geprueft", "verifiziert"]).default("analysiert"),
    sealGranted: z.boolean().default(false),
    publicSafe: z.literal(true),
  })
  .strict();

export type SocialDistributionAsset = z.infer<typeof SocialDistributionAssetSchema>;

export const SocialDistributionApprovalSchema = z
  .object({
    reviewRequired: z.boolean(),
    approvedByUserId: z.string().trim().min(1).nullable(),
    approvedAt: z.string().datetime({ offset: true }).nullable(),
    note: z.string().trim().min(1).nullable(),
  })
  .strict();

export type SocialDistributionApproval = z.infer<typeof SocialDistributionApprovalSchema>;

export const SocialDistributionPostSchema = z
  .object({
    id: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    regionId: z.string().trim().min(1).nullable(),
    dossierId: z.string().trim().min(1).nullable(),
    sourceContextType: z.enum(SOCIAL_DISTRIBUTION_CONTEXT_TYPES),
    sourceContextId: z.string().trim().min(1),
    publicBrand: z.enum(SOCIAL_DISTRIBUTION_PUBLIC_BRANDS).default("edebatte"),
    marketingCampaignId: z.string().trim().min(1).nullable().default(null),
    marketingContentId: z.string().trim().min(1).nullable().default(null),
    sourceVisibilityState: z.enum(REGION_PUBLICATION_VISIBILITY_STATES),
    sourceState: z.enum(SOCIAL_DISTRIBUTION_SOURCE_STATES),
    title: z.string().trim().min(1),
    status: z.enum(SOCIAL_DISTRIBUTION_STATUSES),
    channels: z.array(z.enum(SOCIAL_DISTRIBUTION_CHANNELS)).min(1),
    scheduleMode: z.enum(["manual", "suggested_window", "scheduled_at", "immediate_after_review"]),
    channelTexts: z.record(z.string(), z.string().trim().min(1)),
    channelNotes: z.record(z.string(), z.string().trim().min(1)),
    assets: z.array(SocialDistributionAssetSchema),
    channelConnections: z.array(SocialChannelConnectionSchema).default([]),
    scheduler: z.array(SocialSchedulerEntrySchema).default([]),
    approval: SocialDistributionApprovalSchema,
    sourceSummary: z.string().trim().min(1),
    limitations: z.array(z.string().trim().min(1)),
    noAutoPublish: z.literal(true),
    noAutoPublicationApproved: z.literal(true),
    noPublicOfficial: z.literal(true),
    externalPosting: z.literal(false),
    createdByUserId: z.string().trim().min(1),
    updatedByUserId: z.string().trim().min(1),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((post, context) => {
    if (post.sourceContextType !== "marketing_campaign") return;
    if (!post.marketingCampaignId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "marketing_campaign source requires marketingCampaignId",
        path: ["marketingCampaignId"],
      });
    }
    if (!post.marketingContentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "marketing_campaign source requires marketingContentId",
        path: ["marketingContentId"],
      });
    }
    if (post.marketingCampaignId && post.sourceContextId !== post.marketingCampaignId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "marketing_campaign sourceContextId must equal marketingCampaignId",
        path: ["sourceContextId"],
      });
    }
  });

export type SocialDistributionPost = z.infer<typeof SocialDistributionPostSchema>;

export const SocialDistributionAuditEventSchema = z
  .object({
    id: z.string().trim().min(1),
    postId: z.string().trim().min(1),
    organizationId: z.string().trim().min(1),
    action: z.enum(SOCIAL_DISTRIBUTION_AUDIT_ACTIONS),
    previousStatus: z.enum(SOCIAL_DISTRIBUTION_STATUSES).nullable(),
    nextStatus: z.enum(SOCIAL_DISTRIBUTION_STATUSES),
    note: z.string().trim().min(1).nullable(),
    channels: z.array(z.enum(SOCIAL_DISTRIBUTION_CHANNELS)).min(1),
    createdByUserId: z.string().trim().min(1),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type SocialDistributionAuditEvent = z.infer<
  typeof SocialDistributionAuditEventSchema
>;

export type CreateSocialDistributionPostInput = {
  organizationId: string;
  regionId?: string | null;
  dossierId?: string | null;
  sourceContextType: SocialDistributionContextType;
  sourceContextId: string;
  publicBrand?: SocialDistributionPublicBrand;
  marketingCampaignId?: string | null;
  marketingContentId?: string | null;
  sourceVisibilityState: RegionPublicationVisibilityState;
  title: string;
  channels: SocialDistributionChannel[];
  scheduleMode: SocialScheduleMode;
  channelTexts: Partial<Record<SocialDistributionChannel, string>>;
  channelNotes?: Partial<Record<SocialDistributionChannel, string>>;
  sourceSummary: string;
  backlinkHref: string;
  embedHref?: string | null;
  qrHref?: string | null;
  reviewRequired: boolean;
  createdByUserId: string;
  note?: string | null;
  initialStatus?: SocialDistributionStatus | null;
  factcheck?: {
    verificationMode?: "none" | "precheck" | "sealed" | null;
    researchUsed?: "none" | "lite" | "search" | "deep_search" | "gemini" | null;
    sealEligible?: boolean | null;
    sealGranted?: boolean | null;
  } | null;
};

export type UpdateSocialDistributionStatusInput = {
  postId: string;
  organizationId: string;
  nextStatus: SocialDistributionStatus;
  updatedByUserId: string;
  note?: string | null;
};

export type UpdateSocialDistributionSchedulerInput = {
  postId: string;
  organizationId: string;
  channel: SocialDistributionChannel;
  nextStatus: SocialSchedulerStatus;
  updatedByUserId: string;
  scheduledAt?: string | null;
  note?: string | null;
};

export type SocialDistributionRepo = {
  createOrReplaceDraft(input: CreateSocialDistributionPostInput): Promise<SocialDistributionPost>;
  updateStatus(input: UpdateSocialDistributionStatusInput): Promise<SocialDistributionPost | null>;
  updateScheduler(input: UpdateSocialDistributionSchedulerInput): Promise<SocialDistributionPost | null>;
  getPost(postId: string): Promise<SocialDistributionPost | null>;
  listAllPosts(limit?: number): Promise<SocialDistributionPost[]>;
  listPostsByOrganizationIds(organizationIds: string[]): Promise<SocialDistributionPost[]>;
  listPostsBySourceContext(input: {
    sourceContextType: SocialDistributionContextType;
    sourceContextId: string;
  }): Promise<SocialDistributionPost[]>;
  listAuditEventsByPostIds(postIds: string[]): Promise<Map<string, SocialDistributionAuditEvent[]>>;
};

type SocialDistributionPostDoc = {
  _id: string;
  post: SocialDistributionPost;
  createdAt: Date;
  updatedAt: Date;
};

type SocialDistributionAuditEventDoc = {
  _id: string;
  event: SocialDistributionAuditEvent;
  createdAt: Date;
};

const POSTS_COLLECTION = "social_distribution_posts";
const AUDIT_COLLECTION = "social_distribution_audit_events";

let repoSingleton: SocialDistributionRepo | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isoNow() {
  return new Date().toISOString();
}

function postIdFor(input: {
  organizationId: string;
  sourceContextType: SocialDistributionContextType;
  sourceContextId: string;
  marketingContentId?: string | null;
}) {
  return `social-dist-${stableHash(
    `${input.organizationId}:${input.sourceContextType}:${input.sourceContextId}:${input.marketingContentId ?? "-"}`,
  ).slice(0, 18)}`;
}

function auditIdFor(postId: string, action: SocialDistributionAuditAction, at: string) {
  return `social-dist-audit-${stableHash(`${postId}:${action}:${at}`).slice(0, 18)}`;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function redactPotentialPersonalData(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/\+?\d[\d\s()/-]{7,}\d/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim();
}

function channelLabel(channel: SocialDistributionChannel) {
  switch (channel) {
    case "website_update":
      return "Website-Update";
    case "newsletter_draft":
      return "Newsletter-Entwurf";
    case "embed_snippet":
      return "Embed-Snippet";
    case "qr_asset":
      return "QR-Asset";
    case "linkedin_draft":
      return "LinkedIn-Entwurf";
    case "x_draft":
      return "X-Entwurf";
    case "mastodon_draft":
      return "Mastodon-Entwurf";
    case "instagram_asset":
      return "Instagram-Asset";
    case "press_note":
      return "Pressenotiz";
  }
}

function assetKindForChannel(channel: SocialDistributionChannel): SocialDistributionAssetKind {
  switch (channel) {
    case "newsletter_draft":
      return "newsletter_draft";
    case "embed_snippet":
      return "embed_snippet";
    case "qr_asset":
      return "qr_asset";
    case "instagram_asset":
      return "instagram_asset";
    case "press_note":
      return "press_note";
    default:
      return "channel_text";
  }
}

function sourceStateFromVisibility(
  visibilityState: RegionPublicationVisibilityState,
): SocialDistributionSourceState {
  if (visibilityState === "internal_review") return "review_only";
  return "approved_context";
}

function brandLabel(brand: SocialDistributionPublicBrand) {
  if (brand === "voiceopengov") return "VoiceOpenGov";
  if (brand === "vote4gov") return "Vote4Gov";
  return "eDebatte";
}

function buildMarketingAssets(input: {
  title: string;
  sourceSummary: string;
  channels: SocialDistributionChannel[];
  channelTexts: Partial<Record<SocialDistributionChannel, string>>;
  backlinkHref: string;
  embedHref?: string | null;
  qrHref?: string | null;
  publicBrand: SocialDistributionPublicBrand;
}) {
  const backlink = normalizeOptionalText(input.backlinkHref);
  const assets: SocialDistributionAsset[] = input.channels.map((channel) =>
    SocialDistributionAssetSchema.parse({
      id: `social-asset-${stableHash(`${input.publicBrand}:${channel}:${input.title}`).slice(0, 12)}`,
      channel,
      kind: assetKindForChannel(channel),
      label: channelLabel(channel),
      href:
        channel === "embed_snippet"
          ? normalizeOptionalText(input.embedHref)
          : channel === "qr_asset"
            ? normalizeOptionalText(input.qrHref)
            : backlink,
      text:
        channel === "embed_snippet" || channel === "qr_asset"
          ? backlink
          : redactPotentialPersonalData(
              input.channelTexts[channel] ?? `${input.title}. ${input.sourceSummary}`,
            ),
      verificationLabel: "analysiert",
      sealGranted: false,
      publicSafe: true,
    }),
  );

  assets.push(
    SocialDistributionAssetSchema.parse({
      id: `social-share-${stableHash(`${input.publicBrand}:${input.title}`).slice(0, 12)}`,
      channel: "website_update",
      kind: "share_reference",
      label: `${brandLabel(input.publicBrand)} · Marketing-Referenz`,
      href: backlink,
      text: redactPotentialPersonalData(`${input.title}. ${input.sourceSummary}`),
      verificationLabel: "analysiert",
      sealGranted: false,
      publicSafe: true,
    }),
  );

  return assets;
}

function buildAssets(input: {
  title: string;
  sourceSummary: string;
  channels: SocialDistributionChannel[];
  channelTexts: Partial<Record<SocialDistributionChannel, string>>;
  backlinkHref: string;
  embedHref?: string | null;
  qrHref?: string | null;
  factcheck?: CreateSocialDistributionPostInput["factcheck"];
  sourceContextType: SocialDistributionContextType;
  publicBrand: SocialDistributionPublicBrand;
}) {
  if (input.sourceContextType === "marketing_campaign") {
    return buildMarketingAssets(input);
  }

  const shareAsset = buildShareOutputAsset({
    baseUrl: "https://edebatte.org",
    canonicalPathOrUrl: input.backlinkHref,
    objectType: "dossier",
    title: input.title,
    subtitle: input.sourceSummary,
    verificationMode: input.factcheck?.verificationMode ?? "none",
    researchUsed: input.factcheck?.researchUsed ?? "none",
    sealEligible: input.factcheck?.sealEligible ?? false,
    sealGranted: input.factcheck?.sealGranted ?? false,
  });

  const assets: SocialDistributionAsset[] = input.channels.map((channel) =>
    SocialDistributionAssetSchema.parse({
      id: `social-asset-${stableHash(`${channel}:${input.title}`).slice(0, 12)}`,
      channel,
      kind: assetKindForChannel(channel),
      label: channelLabel(channel),
      href:
        channel === "embed_snippet"
          ? normalizeOptionalText(input.embedHref)
          : channel === "qr_asset"
            ? normalizeOptionalText(input.qrHref)
            : normalizeOptionalText(input.backlinkHref),
      text:
        channel === "embed_snippet" || channel === "qr_asset"
          ? shareAsset.sharePayload.url
          : redactPotentialPersonalData(
              input.channelTexts[channel] ?? `${input.title}. ${input.sourceSummary}`,
            ),
      verificationLabel: shareAsset.verification.verificationLabel,
      sealGranted: shareAsset.verification.sealGranted,
      publicSafe: true,
    }),
  );

  assets.push(
    SocialDistributionAssetSchema.parse({
      id: `social-share-${stableHash(input.title).slice(0, 12)}`,
      channel: "website_update",
      kind: "share_reference",
      label: "Share-Referenz",
      href: shareAsset.canonicalUrl,
      text: redactPotentialPersonalData(shareAsset.sharePayload.text),
      verificationLabel: shareAsset.verification.verificationLabel,
      sealGranted: shareAsset.verification.sealGranted,
      publicSafe: true,
    }),
  );

  return assets;
}

function auditActionForStatus(status: SocialDistributionStatus): SocialDistributionAuditAction {
  switch (status) {
    case "asset_generated":
      return "generate_assets";
    case "needs_review":
    case "review_requested":
      return "request_review";
    case "approved":
      return "approve";
    case "queued":
      return "queue";
    case "scheduled_ready":
      return "mark_scheduled_ready";
    case "exported":
      return "mark_exported";
    case "copied":
      return "mark_copied";
    case "error":
      return "fail";
    case "blocked":
      return "block";
    case "archived":
      return "archive";
    case "draft_created":
    default:
      return "create_draft";
  }
}

function auditActionForSchedulerStatus(status: SocialSchedulerStatus): SocialDistributionAuditAction {
  switch (status) {
    case "scheduled":
      return "schedule_channel";
    case "posting":
      return "posting_started";
    case "posted":
      return "posting_succeeded";
    case "failed":
      return "posting_failed";
    case "cancelled":
      return "cancel_channel";
    default:
      return "queue";
  }
}

function updatePostStatusFromScheduler(
  current: SocialDistributionStatus,
  nextSchedulerStatus: SocialSchedulerStatus,
): SocialDistributionStatus {
  if (nextSchedulerStatus === "failed") return "error";
  if (nextSchedulerStatus === "posting") return "queued";
  if (nextSchedulerStatus === "scheduled") return "scheduled_ready";
  return current;
}

function buildPost(input: CreateSocialDistributionPostInput): SocialDistributionPost {
  const now = isoNow();
  const sourceState = sourceStateFromVisibility(input.sourceVisibilityState);
  const defaultStatus: SocialDistributionStatus =
    sourceState === "approved_context"
      ? input.reviewRequired
        ? "needs_review"
        : "draft_created"
      : "draft_created";
  const status = input.initialStatus ?? defaultStatus;
  const publicBrand = input.publicBrand ?? "edebatte";
  const marketingCampaignId = normalizeOptionalText(input.marketingCampaignId) ?? null;
  const marketingContentId = normalizeOptionalText(input.marketingContentId) ?? null;
  const channelConnections = buildSocialChannelConnections({
    channels: input.channels,
    organizationId: input.organizationId,
    createdBy: input.createdByUserId,
    checkedAt: now,
  });

  const draftLike = {
    id: postIdFor({
      organizationId: input.organizationId,
      sourceContextType: input.sourceContextType,
      sourceContextId: input.sourceContextId,
      marketingContentId,
    }),
    organizationId: input.organizationId,
    regionId: normalizeOptionalText(input.regionId) ?? null,
    dossierId: normalizeOptionalText(input.dossierId) ?? null,
    sourceContextType: input.sourceContextType,
    sourceContextId: input.sourceContextId,
    publicBrand,
    marketingCampaignId,
    marketingContentId,
    sourceVisibilityState: input.sourceVisibilityState,
    sourceState,
    title: redactPotentialPersonalData(input.title),
    status,
    channels: input.channels,
    scheduleMode: input.scheduleMode,
    channelTexts: Object.fromEntries(
      Object.entries(input.channelTexts).map(([channel, text]) => [
        channel,
        redactPotentialPersonalData(String(text ?? "")),
      ]),
    ),
    channelNotes: Object.fromEntries(
      Object.entries(input.channelNotes ?? {}).map(([channel, note]) => [
        channel,
        redactPotentialPersonalData(String(note ?? "")),
      ]),
    ),
    assets: buildAssets({
      title: input.title,
      sourceSummary: input.sourceSummary,
      channels: input.channels,
      channelTexts: input.channelTexts,
      backlinkHref: input.backlinkHref,
      embedHref: input.embedHref ?? null,
      qrHref: input.qrHref ?? null,
      factcheck: input.factcheck ?? null,
      sourceContextType: input.sourceContextType,
      publicBrand,
    }),
    approval: {
      reviewRequired: true,
      approvedByUserId: null,
      approvedAt: null,
      note: normalizeOptionalText(input.note),
    },
    sourceSummary: redactPotentialPersonalData(input.sourceSummary),
    limitations: [
      "Kein Auto-Publish.",
      "Keine externe API-Verteilung im v1-Pfad.",
      ...(input.sourceContextType === "marketing_campaign"
        ? ["Marketing-Content bleibt markengebunden und review-first."]
        : []),
      sourceState === "review_only"
        ? "Review-only-Kontext erzeugt keinen freigegebenen Social-Output."
        : "Verteilung bleibt review-first und manuell veröffentlicht.",
    ],
    noAutoPublish: true,
    noAutoPublicationApproved: true,
    noPublicOfficial: true,
    externalPosting: false,
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };
  const scheduler = buildSocialSchedulerEntries({
    post: {
      id: draftLike.id,
      channels: draftLike.channels,
      status: draftLike.status,
      approval: draftLike.approval,
      organizationId: draftLike.organizationId,
      createdByUserId: draftLike.createdByUserId,
    },
    connections: channelConnections,
  });

  return SocialDistributionPostSchema.parse({
    ...draftLike,
    channelConnections,
    scheduler,
  });
}

async function ensureMongoIndexes() {
  if (indexesReady) return;
  const [posts, audit] = await Promise.all([
    coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION),
    coreCol<SocialDistributionAuditEventDoc>(AUDIT_COLLECTION),
  ]);
  await Promise.all([
    posts.createIndex({ "post.organizationId": 1, "post.updatedAt": -1 }),
    posts.createIndex({ "post.sourceContextType": 1, "post.sourceContextId": 1 }),
    posts.createIndex({ "post.marketingCampaignId": 1, "post.marketingContentId": 1 }),
    posts.createIndex({ "post.dossierId": 1 }),
    posts.createIndex({ "post.status": 1, "post.updatedAt": -1 }),
    audit.createIndex({ "event.postId": 1, createdAt: -1 }),
    audit.createIndex({ "event.organizationId": 1, createdAt: -1 }),
  ]);
  indexesReady = true;
}

async function appendAuditEventMongo(event: SocialDistributionAuditEvent) {
  await ensureMongoIndexes();
  await (await coreCol<SocialDistributionAuditEventDoc>(AUDIT_COLLECTION)).insertOne({
    _id: event.id,
    event: clone(event),
    createdAt: new Date(event.createdAt),
  });
}

function buildAuditEvent(input: {
  post: SocialDistributionPost;
  action: SocialDistributionAuditAction;
  previousStatus: SocialDistributionStatus | null;
  nextStatus: SocialDistributionStatus;
  createdByUserId: string;
  note?: string | null;
}) {
  const at = isoNow();
  return SocialDistributionAuditEventSchema.parse({
    id: auditIdFor(input.post.id, input.action, at),
    postId: input.post.id,
    organizationId: input.post.organizationId,
    action: input.action,
    previousStatus: input.previousStatus,
    nextStatus: input.nextStatus,
    note: normalizeOptionalText(input.note),
    channels: input.post.channels,
    createdByUserId: input.createdByUserId,
    createdAt: at,
  });
}

function createMongoSocialDistributionRepo(): SocialDistributionRepo {
  return {
    async createOrReplaceDraft(input) {
      await ensureMongoIndexes();
      const post = buildPost(input);
      const col = await coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION);
      await col.updateOne(
        { _id: post.id },
        {
          $set: {
            post: clone(post),
            updatedAt: new Date(post.updatedAt),
          },
          $setOnInsert: {
            createdAt: new Date(post.createdAt),
          },
        },
        { upsert: true },
      );
      const auditEvent = buildAuditEvent({
        post,
        action: "create_draft",
        previousStatus: null,
        nextStatus: post.status,
        createdByUserId: input.createdByUserId,
        note: input.note ?? null,
      });
      await appendAuditEventMongo(auditEvent);
      return post;
    },

    async updateStatus(input) {
      await ensureMongoIndexes();
      const col = await coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION);
      const existing = await col.findOne({ _id: input.postId, "post.organizationId": input.organizationId });
      if (!existing?.post) return null;
      const next = SocialDistributionPostSchema.parse({
        ...existing.post,
        status: input.nextStatus,
        approval:
          input.nextStatus === "approved"
            ? {
                reviewRequired: false,
                approvedByUserId: input.updatedByUserId,
                approvedAt: isoNow(),
                note: normalizeOptionalText(input.note),
              }
            : existing.post.approval,
        updatedByUserId: input.updatedByUserId,
        updatedAt: isoNow(),
      });
      await col.updateOne(
        { _id: input.postId },
        { $set: { post: clone(next), updatedAt: new Date(next.updatedAt) } },
      );
      const auditEvent = buildAuditEvent({
        post: next,
        action: auditActionForStatus(input.nextStatus),
        previousStatus: existing.post.status,
        nextStatus: input.nextStatus,
        createdByUserId: input.updatedByUserId,
        note: input.note ?? null,
      });
      await appendAuditEventMongo(auditEvent);
      return next;
    },

    async updateScheduler(input) {
      await ensureMongoIndexes();
      const col = await coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION);
      const existing = await col.findOne({ _id: input.postId, "post.organizationId": input.organizationId });
      if (!existing?.post) return null;
      const connection = existing.post.channelConnections.find((entry) => entry.channel === input.channel) ?? null;
      const currentEntry = existing.post.scheduler.find((entry) => entry.channel === input.channel);
      if (!currentEntry) return null;
      const transitioned = transitionSocialSchedulerEntry({
        entry: currentEntry,
        nextStatus: input.nextStatus,
        post: existing.post,
        connection,
        scheduledAt: normalizeOptionalText(input.scheduledAt) ?? null,
        error: normalizeOptionalText(input.note) ?? null,
      });
      if (transitioned.ok !== true) {
        throw new Error(transitioned.error);
      }
      const nextScheduler = existing.post.scheduler.map((entry) =>
        entry.channel === input.channel ? transitioned.entry : entry,
      );
      const nextPost = SocialDistributionPostSchema.parse({
        ...existing.post,
        status: updatePostStatusFromScheduler(existing.post.status, input.nextStatus),
        scheduler: nextScheduler,
        updatedByUserId: input.updatedByUserId,
        updatedAt: isoNow(),
      });
      await col.updateOne(
        { _id: input.postId },
        { $set: { post: clone(nextPost), updatedAt: new Date(nextPost.updatedAt) } },
      );
      const auditEvent = buildAuditEvent({
        post: nextPost,
        action: auditActionForSchedulerStatus(input.nextStatus),
        previousStatus: existing.post.status,
        nextStatus: nextPost.status,
        createdByUserId: input.updatedByUserId,
        note: input.note ?? `${input.channel}:${input.nextStatus}`,
      });
      await appendAuditEventMongo(auditEvent);
      return nextPost;
    },

    async getPost(postId) {
      await ensureMongoIndexes();
      const doc = await (await coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION)).findOne({
        _id: postId,
      });
      return doc?.post ? clone(doc.post) : null;
    },

    async listAllPosts(limit = 200) {
      await ensureMongoIndexes();
      const rows = await (await coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION))
        .find({})
        .sort({ "post.updatedAt": -1 })
        .limit(Math.max(1, Math.min(500, limit)))
        .toArray();
      return rows.map((row) => clone(row.post));
    },

    async listPostsByOrganizationIds(organizationIds) {
      await ensureMongoIndexes();
      const normalized = Array.from(
        new Set(organizationIds.map((value) => String(value ?? "").trim()).filter(Boolean)),
      );
      if (normalized.length === 0) return [];
      const rows = await (await coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION))
        .find({ "post.organizationId": { $in: normalized } })
        .sort({ "post.updatedAt": -1 })
        .toArray();
      return rows.map((row) => clone(row.post));
    },

    async listPostsBySourceContext(input) {
      await ensureMongoIndexes();
      const rows = await (await coreCol<SocialDistributionPostDoc>(POSTS_COLLECTION))
        .find({
          "post.sourceContextType": input.sourceContextType,
          "post.sourceContextId": input.sourceContextId,
        })
        .sort({ "post.updatedAt": -1 })
        .toArray();
      return rows.map((row) => clone(row.post));
    },

    async listAuditEventsByPostIds(postIds) {
      await ensureMongoIndexes();
      const normalized = Array.from(
        new Set(postIds.map((value) => String(value ?? "").trim()).filter(Boolean)),
      );
      if (normalized.length === 0) return new Map();
      const rows = await (await coreCol<SocialDistributionAuditEventDoc>(AUDIT_COLLECTION))
        .find({ "event.postId": { $in: normalized } })
        .sort({ createdAt: -1 })
        .toArray();
      const map = new Map<string, SocialDistributionAuditEvent[]>();
      for (const row of rows) {
        const current = map.get(row.event.postId) ?? [];
        current.push(clone(row.event));
        map.set(row.event.postId, current);
      }
      return map;
    },
  };
}

export function createInMemorySocialDistributionRepo(
  seed?: { posts?: SocialDistributionPost[]; auditEvents?: SocialDistributionAuditEvent[] },
): SocialDistributionRepo {
  const posts = new Map<string, SocialDistributionPost>();
  const events = new Map<string, SocialDistributionAuditEvent[]>();

  for (const post of seed?.posts ?? []) {
    posts.set(post.id, clone(SocialDistributionPostSchema.parse(post)));
  }
  for (const event of seed?.auditEvents ?? []) {
    const parsed = clone(SocialDistributionAuditEventSchema.parse(event));
    const current = events.get(parsed.postId) ?? [];
    current.push(parsed);
    events.set(parsed.postId, current);
  }

  return {
    async createOrReplaceDraft(input) {
      const post = buildPost(input);
      posts.set(post.id, clone(post));
      const auditEvent = buildAuditEvent({
        post,
        action: "create_draft",
        previousStatus: null,
        nextStatus: post.status,
        createdByUserId: input.createdByUserId,
        note: input.note ?? null,
      });
      events.set(post.id, [auditEvent, ...(events.get(post.id) ?? [])]);
      return clone(post);
    },

    async updateStatus(input) {
      const existing = posts.get(input.postId);
      if (!existing || existing.organizationId !== input.organizationId) return null;
      const next = SocialDistributionPostSchema.parse({
        ...existing,
        status: input.nextStatus,
        approval:
          input.nextStatus === "approved"
            ? {
                reviewRequired: false,
                approvedByUserId: input.updatedByUserId,
                approvedAt: isoNow(),
                note: normalizeOptionalText(input.note),
              }
            : existing.approval,
        updatedByUserId: input.updatedByUserId,
        updatedAt: isoNow(),
      });
      posts.set(next.id, clone(next));
      const auditEvent = buildAuditEvent({
        post: next,
        action: auditActionForStatus(input.nextStatus),
        previousStatus: existing.status,
        nextStatus: input.nextStatus,
        createdByUserId: input.updatedByUserId,
        note: input.note ?? null,
      });
      events.set(next.id, [auditEvent, ...(events.get(next.id) ?? [])]);
      return clone(next);
    },

    async updateScheduler(input) {
      const existing = posts.get(input.postId);
      if (!existing || existing.organizationId !== input.organizationId) return null;
      const connection = existing.channelConnections.find((entry) => entry.channel === input.channel) ?? null;
      const currentEntry = existing.scheduler.find((entry) => entry.channel === input.channel);
      if (!currentEntry) return null;
      const transitioned = transitionSocialSchedulerEntry({
        entry: currentEntry,
        nextStatus: input.nextStatus,
        post: existing,
        connection,
        scheduledAt: normalizeOptionalText(input.scheduledAt) ?? null,
        error: normalizeOptionalText(input.note) ?? null,
      });
      if (transitioned.ok !== true) {
        throw new Error(transitioned.error);
      }
      const next = SocialDistributionPostSchema.parse({
        ...existing,
        status: updatePostStatusFromScheduler(existing.status, input.nextStatus),
        scheduler: existing.scheduler.map((entry) =>
          entry.channel === input.channel ? transitioned.entry : entry,
        ),
        updatedByUserId: input.updatedByUserId,
        updatedAt: isoNow(),
      });
      posts.set(next.id, clone(next));
      const auditEvent = buildAuditEvent({
        post: next,
        action: auditActionForSchedulerStatus(input.nextStatus),
        previousStatus: existing.status,
        nextStatus: next.status,
        createdByUserId: input.updatedByUserId,
        note: input.note ?? `${input.channel}:${input.nextStatus}`,
      });
      events.set(next.id, [auditEvent, ...(events.get(next.id) ?? [])]);
      return clone(next);
    },

    async getPost(postId) {
      const post = posts.get(postId);
      return post ? clone(post) : null;
    },

    async listAllPosts(limit = 200) {
      return Array.from(posts.values())
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
        .slice(0, Math.max(1, Math.min(500, limit)))
        .map((post) => clone(post));
    },

    async listPostsByOrganizationIds(organizationIds) {
      const allowed = new Set(
        organizationIds.map((value) => String(value ?? "").trim()).filter(Boolean),
      );
      return Array.from(posts.values())
        .filter((post) => allowed.has(post.organizationId))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
        .map((post) => clone(post));
    },

    async listPostsBySourceContext(input) {
      return Array.from(posts.values())
        .filter(
          (post) =>
            post.sourceContextType === input.sourceContextType &&
            post.sourceContextId === input.sourceContextId,
        )
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
        .map((post) => clone(post));
    },

    async listAuditEventsByPostIds(postIds) {
      const map = new Map<string, SocialDistributionAuditEvent[]>();
      for (const postId of postIds) {
        map.set(postId, (events.get(postId) ?? []).map((event) => clone(event)));
      }
      return map;
    },
  };
}

export function setSocialDistributionRepoForTests(repo: SocialDistributionRepo | null) {
  repoSingleton = repo;
}

export function getSocialDistributionRepo(): SocialDistributionRepo {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemorySocialDistributionRepo()
    : createMongoSocialDistributionRepo();
  return repoSingleton;
}

export function socialDistributionStatusLabel(status: SocialDistributionStatus) {
  return socialDistributionStatusLabelFromContract(status);
}
