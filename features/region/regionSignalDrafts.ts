import { coreCol, ObjectId, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { z } from "zod";
import type { CommunitySignal } from "./contracts";
import {
  canCreateAnlassraumDraft,
  canCreateDossierDraft,
  type RegionAccessAuthoritySource,
  type RegionAccessContext,
} from "./access";
import type { DossierActorRole } from "@features/dossier/schemas";
import {
  getOperationalRegionById,
  getRegionalAdminCockpitReadModel,
  getRegionalCommunitySignalById,
  listOperationalRegions,
} from "./store";
import {
  type RegionFeedSignal,
  REGION_FEED_SIGNAL_FIXTURES,
  REGION_SIGNAL_REVIEW_STATUSES,
  parseRegionFeedSignal,
} from "./regionFeedSignals";
import {
  mapParticipationSignalToFeedSignalForDraft,
} from "./regionParticipationSignals";
import {
  getParticipationSignalReviewRuntimeRepo,
  serializeParticipationSignalForDashboard,
  syncParticipationSignalRecords,
  type RegionParticipationSignalRecord,
} from "./server/participationSignalReviewRuntime";
import {
  REGION_PUBLICATION_VISIBILITY_STATES,
  resolveReviewOnlyVisibilityState,
  type RegionPublicationVisibilityState,
} from "./publicationRiskLadder";

export const REGION_SIGNAL_DRAFT_TARGETS = ["dossier", "anlassraum"] as const;
export type RegionSignalDraftTarget = (typeof REGION_SIGNAL_DRAFT_TARGETS)[number];

export const REGION_SIGNAL_DRAFT_STATUSES = ["draft", "needs_review"] as const;
export type RegionSignalDraftStatus = (typeof REGION_SIGNAL_DRAFT_STATUSES)[number];

export const REGION_SIGNAL_DRAFT_BLOCK_REASONS = [
  "signal_not_found",
  "signal_not_accepted",
  "public_signal_not_found",
  "public_signal_not_accepted",
  "public_signal_region_unconfirmed",
  "public_signal_privacy_restricted",
  "missing_permission",
  "wrong_region",
  "tender_or_procurement_out_of_scope",
  "unsupported_target",
  "validation_error",
] as const;
export type RegionSignalDraftBlockedReason = (typeof REGION_SIGNAL_DRAFT_BLOCK_REASONS)[number];

const RegionSignalDraftGuardrailsSchema = z
  .object({
    noAutoPublish: z.literal(true),
    noAutoVote: z.literal(true),
    noAutoMandate: z.literal(true),
    noTenderMonitoring: z.literal(true),
    noProcurementMonitoring: z.literal(true),
    reviewRequired: z.literal(true),
  })
  .strict();

export type RegionSignalDraftGuardrails = z.infer<typeof RegionSignalDraftGuardrailsSchema>;

const RegionSignalDraftProvenanceSchema = z
  .object({
    sourceSignalId: z.string().trim().min(1),
    sourceRegionId: z.string().trim().min(1),
    createdFrom: z.literal("region_signal"),
    sourceReviewStatus: z.enum(REGION_SIGNAL_REVIEW_STATUSES),
    pilotFixture: z.boolean(),
    notProductionData: z.boolean(),
    notRealNews: z.boolean(),
  })
  .strict();

export type RegionSignalDraftProvenance = z.infer<typeof RegionSignalDraftProvenanceSchema>;

const RegionSignalDraftActionBaseSchema = z
  .object({
    signalId: z.string().trim().min(1),
    regionId: z.string().trim().min(1),
    target: z.enum(REGION_SIGNAL_DRAFT_TARGETS),
    requestedBy: z.string().trim().min(1),
    sourceSuggestionId: z.string().trim().min(1).nullable().optional(),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    relatedSignalIds: z.array(z.string().trim().min(1)).min(1),
    relatedTopics: z.array(z.string().trim().min(1)).default([]),
    relatedPlaces: z.array(z.string().trim().min(1)).default([]),
    openQuestions: z.array(z.string().trim().min(1)).default([]),
    provenance: RegionSignalDraftProvenanceSchema,
    reviewStatus: z.enum(REGION_SIGNAL_DRAFT_STATUSES),
    noAutoPublish: z.literal(true),
    noAutoVote: z.literal(true),
    noAutoMandate: z.literal(true),
    noTenderMonitoring: z.literal(true),
    noProcurementMonitoring: z.literal(true),
  })
  .strict();

export type RegionSignalDraftAction = z.infer<typeof RegionSignalDraftActionBaseSchema> & {
  accessContext: RegionAccessContext;
};

const RegionSignalDraftRecordSchema = z
  .object({
    id: z.string().trim().min(1),
    uniqueKey: z.string().trim().min(1),
    signalId: z.string().trim().min(1),
    regionId: z.string().trim().min(1),
    draftId: z.string().trim().min(1),
    draftType: z.enum(REGION_SIGNAL_DRAFT_TARGETS),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    reviewStatus: z.enum(REGION_SIGNAL_DRAFT_STATUSES),
    createdByUserId: z.string().trim().min(1),
    createdByRole: z.string().trim().min(1),
    authoritySource: z.enum([
      "admin_fallback",
      "verified_membership",
      "unverified_hint_only",
    ] satisfies RegionAccessAuthoritySource[]),
    adminFallback: z.boolean(),
    relatedSignalIds: z.array(z.string().trim().min(1)).min(1),
    relatedTopics: z.array(z.string().trim().min(1)).default([]),
    relatedPlaces: z.array(z.string().trim().min(1)).default([]),
    linkedTopicClusterIds: z.array(z.string().trim().min(1)).default([]),
    openQuestions: z.array(z.string().trim().min(1)).default([]),
    guardrails: RegionSignalDraftGuardrailsSchema,
    provenance: RegionSignalDraftProvenanceSchema,
    targetStatus: z.literal("draft"),
    visibilityState: z.enum(REGION_PUBLICATION_VISIBILITY_STATES),
    backingStore: z.enum(["dossiers", "anlassraum"]),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type RegionSignalDraftRecord = z.infer<typeof RegionSignalDraftRecordSchema>;

const RegionSignalDraftResultSchema = z
  .object({
    ok: z.boolean(),
    blockedReason: z.enum(REGION_SIGNAL_DRAFT_BLOCK_REASONS).optional(),
    draftId: z.string().trim().min(1).optional(),
    draftType: z.enum(REGION_SIGNAL_DRAFT_TARGETS),
    reviewStatus: z.enum(REGION_SIGNAL_DRAFT_STATUSES),
    visibilityState: z.enum(REGION_PUBLICATION_VISIBILITY_STATES),
    createdByRole: z.string().trim().min(1),
    guardrails: RegionSignalDraftGuardrailsSchema,
  })
  .strict();

export type RegionSignalDraftResult = z.infer<typeof RegionSignalDraftResultSchema>;

function resolveRegionSignalDraftVisibilityState(
  reviewStatus: RegionSignalDraftStatus,
): RegionPublicationVisibilityState {
  return resolveReviewOnlyVisibilityState({ reviewStatus });
}

type RegionSignalDraftPersistence = {
  getRecordByUniqueKey(uniqueKey: string): Promise<RegionSignalDraftRecord | null>;
  saveRecord(record: RegionSignalDraftRecord): Promise<void>;
  listRecords(): Promise<RegionSignalDraftRecord[]>;
  createDossierDraft(input: {
    draftId: string;
    statementId: string;
    title: string;
    openQuestions: string[];
    createdByUserId: string;
    createdByRole: DossierActorRole;
  }): Promise<{ draftId: string }>;
  createAnlassraumDraft(input: {
    draftId: string;
    title: string;
    summary: string;
    topicKey: string;
    regionKey: string;
    createdByUserId: string;
  }): Promise<{ draftId: string }>;
};

const DRAFT_GUARDRAILS: RegionSignalDraftGuardrails = {
  noAutoPublish: true,
  noAutoVote: true,
  noAutoMandate: true,
  noTenderMonitoring: true,
  noProcurementMonitoring: true,
  reviewRequired: true,
};

const REGION_SIGNAL_DRAFTS_COLLECTION = "edebatte_region_signal_drafts";

let draftPersistenceSingleton: RegionSignalDraftPersistence | null = null;
let draftIndexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildIsoNow() {
  return new Date().toISOString();
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function normalizeRegionKey(regionId: string) {
  return String(regionId || "").trim().toLowerCase();
}

function normalizeTopicKey(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "regionales-signal";
}

function buildUniqueKey(regionId: string, signalId: string, target: RegionSignalDraftTarget) {
  return `region-signal-draft:${normalizeRegionKey(regionId)}:${target}:${String(signalId || "").trim()}`;
}

function buildDraftId(regionId: string, signalId: string, target: RegionSignalDraftTarget) {
  return `${target}-draft-${stableHash(buildUniqueKey(regionId, signalId, target)).slice(0, 16)}`;
}

function buildStatementId(regionId: string, signalId: string) {
  return `region-signal:${normalizeRegionKey(regionId)}:${String(signalId || "").trim()}`;
}

function toDossierActorRole(context: RegionAccessContext): DossierActorRole {
  if (context.isAdmin) return "admin";
  return "member";
}

function isAcceptedSignal(signal: RegionFeedSignal) {
  return signal.reviewStatus === "accepted";
}

function isTenderOrProcurementOutOfScope(signal: RegionFeedSignal) {
  const haystack = [
    signal.title,
    signal.summary,
    ...signal.detectedTopics,
    ...signal.detectedPlaces,
  ]
    .join(" ")
    .toLowerCase();
  return (
    haystack.includes("ausschreibung") ||
    haystack.includes("vergabe") ||
    haystack.includes("procurement") ||
    haystack.includes("beschaffung")
  );
}

function buildDraftProvenance(signal: RegionFeedSignal): RegionSignalDraftProvenance {
  const pilotFixture = signal.provenance.dataOrigin === "pilot_fixture" || signal.provenance.isFixture;
  return RegionSignalDraftProvenanceSchema.parse({
    sourceSignalId: signal.id,
    sourceRegionId: signal.regionId,
    createdFrom: "region_signal",
    sourceReviewStatus: signal.reviewStatus,
    pilotFixture,
    notProductionData: pilotFixture,
    notRealNews: pilotFixture,
  });
}

function participationSignalBlockedForDraft(
  record: RegionParticipationSignalRecord,
): RegionSignalDraftBlockedReason | null {
  if (!record.regionId || record.needsRegionReview) return "public_signal_region_unconfirmed";
  if (
    record.privacyMode === "review_restricted" &&
    (!record.publicSafeTitle || !record.publicSafeSummary)
  ) {
    return "public_signal_privacy_restricted";
  }
  if (record.reviewStatus !== "accepted") return "public_signal_not_accepted";
  return null;
}

function mapRuntimeSignalToFeedSignal(input: {
  signal: CommunitySignal;
  regionId: string;
}): RegionFeedSignal {
  const signal = input.signal;
  const reviewStatus =
    signal.reviewStatus === "accepted"
      ? "accepted"
      : signal.reviewStatus === "rejected"
        ? "rejected"
        : "needs_review";
  const suggestedAction =
    signal.signalType === "source"
      ? "attach_source_to_dossier"
      : signal.signalType === "local_knowledge"
        ? "ask_clarifying_question"
        : signal.signalType === "topic_proposal"
          ? "create_anlassraum"
          : "create_dossier";

  return parseRegionFeedSignal({
    id: signal.id,
    kind: "region_feed_signal",
    regionId: input.regionId,
    sourceId: `community-signal:${signal.id}`,
    sourceType: "community_signal",
    title: signal.title,
    summary: signal.summary,
    url: signal.sourceUrls[0] ?? null,
    publishedAt: signal.updatedAt ?? signal.createdAt ?? null,
    detectedTopics: [],
    detectedPlaces: [],
    relatedClaims: [],
    relatedDossiers: [],
    relatedAnlassraumIds: [],
    suggestedAction,
    confidence: signal.reviewStatus === "accepted" ? 0.72 : 0.56,
    reviewStatus,
    noAutoPublish: true,
    noAutoCreateDossier: true,
    noAutoCreateAnlassraum: true,
    noTenderMonitoring: true,
    noProcurementMonitoring: true,
    provenance: {
      dataOrigin: "runtime_review_queue",
      isFixture: false,
      fixtureMarker: "runtime_review_queue",
    },
    clusterKey: null,
    openQuestions: [],
    reviewHint: signal.reviewStatus === "accepted" ? "Akzeptierter Runtime-Hinweis." : null,
    suggestedAnlassraumTitle: null,
    suggestedDossierTitle: null,
  });
}

function buildDraftAction(params: {
  signal: RegionFeedSignal;
  regionId: string;
  target: RegionSignalDraftTarget;
  requestedBy: string;
  accessContext: RegionAccessContext;
  title?: string | null;
  summary?: string | null;
  openQuestions?: string[] | null;
  sourceSuggestionId?: string | null;
}): RegionSignalDraftAction {
  const signal = params.signal;
  const title =
    String(params.title || "").trim() ||
    (params.target === "dossier" ? signal.suggestedDossierTitle : signal.suggestedAnlassraumTitle) ||
    signal.title;
  const summary = String(params.summary || "").trim() || signal.summary;
  const openQuestions = uniqueNonEmpty(params.openQuestions?.length ? params.openQuestions : signal.openQuestions);

  return {
    ...RegionSignalDraftActionBaseSchema.parse({
      signalId: signal.id,
      regionId: params.regionId,
      target: params.target,
      requestedBy: params.requestedBy,
      sourceSuggestionId: params.sourceSuggestionId ?? null,
      title,
      summary,
      relatedSignalIds: [signal.id],
      relatedTopics: signal.detectedTopics,
      relatedPlaces: signal.detectedPlaces,
      openQuestions,
      provenance: buildDraftProvenance(signal),
      reviewStatus: "needs_review",
      noAutoPublish: true,
      noAutoVote: true,
      noAutoMandate: true,
      noTenderMonitoring: true,
      noProcurementMonitoring: true,
    }),
    accessContext: params.accessContext,
  };
}

async function resolveRegionSignalForDraft(regionId: string, signalId: string) {
  const region = await getOperationalRegionById(regionId);
  if (!region) {
    return { region: null, signal: null, wrongRegion: false as const, participationSignalRecord: null };
  }

  const cockpit = await getRegionalAdminCockpitReadModel(region.id);
  const signal = cockpit.feedSignals.find((entry) => entry.id === signalId) ?? null;
  if (signal) return { region, signal, wrongRegion: false as const, participationSignalRecord: null };

  const fixtureSignal = REGION_FEED_SIGNAL_FIXTURES.find((entry) => entry.id === signalId) ?? null;
  if (fixtureSignal) {
    return {
      region,
      signal: fixtureSignal,
      wrongRegion: fixtureSignal.regionId !== region.id,
      participationSignalRecord: null,
    };
  }

  const runtimeSignal = await getRegionalCommunitySignalById(signalId);
  if (runtimeSignal) {
    if (runtimeSignal.regionId === region.id) {
      return {
        region,
        signal: mapRuntimeSignalToFeedSignal({ signal: runtimeSignal, regionId: region.id }),
        wrongRegion: false as const,
        participationSignalRecord: null,
      };
    }
    return {
      region,
      signal: null,
      wrongRegion: runtimeSignal.regionId !== region.id,
      participationSignalRecord: null,
    };
  }

  const allRegions = await listOperationalRegions();
  await syncParticipationSignalRecords(allRegions);
  const participationRepo = getParticipationSignalReviewRuntimeRepo();
  const participationSignalRecord = await participationRepo.getParticipationSignalRecordById(signalId);
  if (participationSignalRecord) {
    const wrongRegion =
      Boolean(participationSignalRecord.regionId && participationSignalRecord.regionId !== region.id) ||
      Boolean(
        !participationSignalRecord.regionId &&
          participationSignalRecord.proposedRegionId &&
          participationSignalRecord.proposedRegionId !== region.id &&
          !participationSignalRecord.matchedRegionIds.includes(region.id),
      );
    const dashboardSignal = serializeParticipationSignalForDashboard(participationSignalRecord);
    return {
      region,
      signal: dashboardSignal ? mapParticipationSignalToFeedSignalForDraft(dashboardSignal) : null,
      wrongRegion,
      participationSignalRecord,
    };
  }

  return { region, signal: null, wrongRegion: false as const, participationSignalRecord: null };
}

async function ensureDraftIndexes() {
  if (draftIndexesReady) return;
  const drafts = await coreCol<RegionSignalDraftRecord>(REGION_SIGNAL_DRAFTS_COLLECTION);
  await Promise.all([
    drafts.createIndex({ uniqueKey: 1 }, { unique: true }),
    drafts.createIndex({ draftId: 1 }, { unique: true }),
    drafts.createIndex({ regionId: 1, draftType: 1, createdAt: -1 }),
  ]);
  draftIndexesReady = true;
}

function createMongoRegionSignalDraftPersistence(): RegionSignalDraftPersistence {
  return {
    async getRecordByUniqueKey(uniqueKey) {
      await ensureDraftIndexes();
      const drafts = await coreCol<RegionSignalDraftRecord>(REGION_SIGNAL_DRAFTS_COLLECTION);
      const record = await drafts.findOne({ uniqueKey });
      return record ? RegionSignalDraftRecordSchema.parse(clone(record)) : null;
    },

    async saveRecord(record) {
      await ensureDraftIndexes();
      const drafts = await coreCol<RegionSignalDraftRecord>(REGION_SIGNAL_DRAFTS_COLLECTION);
      await drafts.updateOne(
        { uniqueKey: record.uniqueKey },
        {
          $set: clone(record),
        },
        { upsert: true },
      );
    },

    async listRecords() {
      await ensureDraftIndexes();
      const drafts = await coreCol<RegionSignalDraftRecord>(REGION_SIGNAL_DRAFTS_COLLECTION);
      const docs = await drafts.find({}).sort({ createdAt: -1 }).toArray();
      return docs.map((doc) => RegionSignalDraftRecordSchema.parse(clone(doc)));
    },

    async createDossierDraft(input) {
      const [{ dossiersCol }, { mutateDossierWithRevision }, { seedDossierFromAnalysis }] = await Promise.all([
        import("@features/dossier/db"),
        import("@features/dossier/revisions"),
        import("@features/dossier/seed"),
      ]);
      const dossiers = await dossiersCol();
      const now = new Date();
      const existing = await dossiers.findOne({
        $or: [{ dossierId: input.draftId }, { statementId: input.statementId }],
      } as any);
      if (!existing) {
        await mutateDossierWithRevision({
          dossierId: input.draftId,
          mutate: async (session) => {
            await dossiers.insertOne(
              {
                dossierId: input.draftId,
                statementId: input.statementId,
                title: input.title,
                status: "draft",
                counts: {
                  claims: 0,
                  sources: 0,
                  findings: 0,
                  edges: 0,
                  openQuestions: 0,
                },
                createdAt: now,
                updatedAt: now,
              } as any,
              { session },
            );
            return {
              result: null,
              revision: {
                entityType: "dossier",
                entityId: input.draftId,
                action: "create",
                diffSummary: "Dossier-Draft aus Region-Signal erstellt.",
                byRole: input.createdByRole,
                byUserId: input.createdByUserId,
              },
            };
          },
        });
      }

      if (input.openQuestions.length > 0) {
        await seedDossierFromAnalysis({
          dossierId: input.draftId,
          questions: input.openQuestions.map((text, idx) => ({
            id: `region-signal-question-${idx + 1}`,
            text,
          })),
          createdByRole: input.createdByRole,
        });
      }

      return { draftId: input.draftId };
    },

    async createAnlassraumDraft(input) {
      const { createManualAnlassraum } = await import("@features/anlassraum/service");
      const created = await createManualAnlassraum({
        entityId: new ObjectId(),
        type: "policy",
        title: input.title,
        summary: input.summary,
        topicKey: input.topicKey,
        regionKey: input.regionKey,
        scope: "regional",
        ownerType: "government",
        ownerId: input.regionKey,
        createdBy: input.createdByUserId,
      });

      return { draftId: created.anlassraumId.toHexString() };
    },
  };
}

export function createInMemoryRegionSignalDraftPersistence(): RegionSignalDraftPersistence {
  const records = new Map<string, RegionSignalDraftRecord>();
  const dossierDrafts = new Map<
    string,
    {
      draftId: string;
      statementId: string;
      title: string;
      status: "draft";
      openQuestions: string[];
      createdByUserId: string;
      createdByRole: DossierActorRole;
    }
  >();
  const anlassraumDrafts = new Map<
    string,
    {
      draftId: string;
      title: string;
      summary: string;
      status: "draft";
      isPublic: false;
      regionKey: string;
      topicKey: string;
      createdByUserId: string;
    }
  >();

  return {
    async getRecordByUniqueKey(uniqueKey) {
      const record = records.get(uniqueKey);
      return record ? clone(record) : null;
    },

    async saveRecord(record) {
      records.set(record.uniqueKey, clone(record));
    },

    async listRecords() {
      return Array.from(records.values()).map((record) => clone(record));
    },

    async createDossierDraft(input) {
      dossierDrafts.set(input.draftId, {
        draftId: input.draftId,
        statementId: input.statementId,
        title: input.title,
        status: "draft",
        openQuestions: [...input.openQuestions],
        createdByUserId: input.createdByUserId,
        createdByRole: input.createdByRole,
      });
      return { draftId: input.draftId };
    },

    async createAnlassraumDraft(input) {
      anlassraumDrafts.set(input.draftId, {
        draftId: input.draftId,
        title: input.title,
        summary: input.summary,
        status: "draft",
        isPublic: false,
        regionKey: input.regionKey,
        topicKey: input.topicKey,
        createdByUserId: input.createdByUserId,
      });
      return { draftId: input.draftId };
    },
  };
}

function getRegionSignalDraftPersistence(): RegionSignalDraftPersistence {
  if (shouldUseInMemoryMongoFallback()) {
    if (!draftPersistenceSingleton) {
      draftPersistenceSingleton = createInMemoryRegionSignalDraftPersistence();
    }
    return draftPersistenceSingleton;
  }
  if (!draftPersistenceSingleton) {
    draftPersistenceSingleton = createMongoRegionSignalDraftPersistence();
  }
  return draftPersistenceSingleton;
}

export function setRegionSignalDraftPersistenceForTests(
  persistence: RegionSignalDraftPersistence | null,
) {
  draftPersistenceSingleton = persistence;
}

export async function listRegionSignalDraftRecords(): Promise<RegionSignalDraftRecord[]> {
  return getRegionSignalDraftPersistence().listRecords();
}

export async function findRegionSignalDraftRecordByDraftId(
  draftId: string,
): Promise<RegionSignalDraftRecord | null> {
  const records = await getRegionSignalDraftPersistence().listRecords();
  const normalized = String(draftId || "").trim();
  const match = records.find((record) => record.draftId === normalized);
  return match ? clone(match) : null;
}

export async function createRegionSignalDraft(input: {
  signalId: string;
  regionId: string;
  target: RegionSignalDraftTarget;
  accessContext: RegionAccessContext;
  requestedBy: string;
  title?: string | null;
  summary?: string | null;
  openQuestions?: string[] | null;
  sourceSuggestionId?: string | null;
}): Promise<RegionSignalDraftResult> {
  const draftType = input.target;
  const createdByRole = input.accessContext.actorRole || "unknown";
  const persistence = getRegionSignalDraftPersistence();

  if (!REGION_SIGNAL_DRAFT_TARGETS.includes(input.target)) {
    return RegionSignalDraftResultSchema.parse({
      ok: false,
      blockedReason: "unsupported_target",
      draftType,
      reviewStatus: "needs_review",
      visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
      createdByRole,
      guardrails: DRAFT_GUARDRAILS,
    });
  }

  const resolved = await resolveRegionSignalForDraft(input.regionId, input.signalId);
  if (!resolved.region) {
    return RegionSignalDraftResultSchema.parse({
      ok: false,
      blockedReason: "validation_error",
      draftType,
      reviewStatus: "needs_review",
      visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
      createdByRole,
      guardrails: DRAFT_GUARDRAILS,
    });
  }

  if (resolved.wrongRegion) {
    return RegionSignalDraftResultSchema.parse({
      ok: false,
      blockedReason: "wrong_region",
      draftType,
      reviewStatus: "needs_review",
      visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
      createdByRole,
      guardrails: DRAFT_GUARDRAILS,
    });
  }

  if (resolved.participationSignalRecord) {
    const participationBlock = participationSignalBlockedForDraft(resolved.participationSignalRecord);
    if (participationBlock) {
      return RegionSignalDraftResultSchema.parse({
        ok: false,
        blockedReason: participationBlock,
        draftType,
        reviewStatus: "needs_review",
        visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
        createdByRole,
        guardrails: DRAFT_GUARDRAILS,
      });
    }
  }

  if (!resolved.signal) {
    return RegionSignalDraftResultSchema.parse({
      ok: false,
      blockedReason: resolved.participationSignalRecord ? "public_signal_not_found" : "signal_not_found",
      draftType,
      reviewStatus: "needs_review",
      visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
      createdByRole,
      guardrails: DRAFT_GUARDRAILS,
    });
  }

  const signal = resolved.signal;
  const hasPermission =
    input.target === "dossier"
      ? canCreateDossierDraft(input.accessContext, resolved.region.id)
      : canCreateAnlassraumDraft(input.accessContext, resolved.region.id);
  if (!hasPermission) {
    return RegionSignalDraftResultSchema.parse({
      ok: false,
      blockedReason: "missing_permission",
      draftType,
      reviewStatus: "needs_review",
      visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
      createdByRole,
      guardrails: DRAFT_GUARDRAILS,
    });
  }

  if (!isAcceptedSignal(signal)) {
    return RegionSignalDraftResultSchema.parse({
      ok: false,
      blockedReason: "signal_not_accepted",
      draftType,
      reviewStatus: "needs_review",
      visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
      createdByRole,
      guardrails: DRAFT_GUARDRAILS,
    });
  }

  if (isTenderOrProcurementOutOfScope(signal)) {
    return RegionSignalDraftResultSchema.parse({
      ok: false,
      blockedReason: "tender_or_procurement_out_of_scope",
      draftType,
      reviewStatus: "needs_review",
      visibilityState: resolveRegionSignalDraftVisibilityState("needs_review"),
      createdByRole,
      guardrails: DRAFT_GUARDRAILS,
    });
  }

  const action = buildDraftAction({
    signal,
    regionId: resolved.region.id,
    target: input.target,
    requestedBy: input.requestedBy,
    accessContext: input.accessContext,
    title: input.title,
    summary: input.summary,
    openQuestions: input.openQuestions,
    sourceSuggestionId: input.sourceSuggestionId,
  });

  const uniqueKey = buildUniqueKey(action.regionId, action.signalId, action.target);
  const existingRecord = await persistence.getRecordByUniqueKey(uniqueKey);
  if (existingRecord) {
    return RegionSignalDraftResultSchema.parse({
      ok: true,
      draftId: existingRecord.draftId,
      draftType: existingRecord.draftType,
      reviewStatus: existingRecord.reviewStatus,
      visibilityState: existingRecord.visibilityState,
      createdByRole: existingRecord.createdByRole,
      guardrails: existingRecord.guardrails,
    });
  }

  const draftId = buildDraftId(action.regionId, action.signalId, action.target);
  const now = buildIsoNow();

  if (action.target === "dossier") {
    await persistence.createDossierDraft({
      draftId,
      statementId: buildStatementId(action.regionId, action.signalId),
      title: action.title,
      openQuestions: action.openQuestions,
      createdByUserId: action.requestedBy,
      createdByRole: toDossierActorRole(action.accessContext),
    });
  } else {
    await persistence.createAnlassraumDraft({
      draftId,
      title: action.title,
      summary: action.summary,
      topicKey: normalizeTopicKey(action.relatedTopics[0] ?? action.title),
      regionKey: normalizeRegionKey(action.regionId),
      createdByUserId: action.requestedBy,
    });
  }

  const record = RegionSignalDraftRecordSchema.parse({
    id: `region-signal-draft-record-${stableHash(uniqueKey).slice(0, 16)}`,
    uniqueKey,
    signalId: action.signalId,
    regionId: action.regionId,
    draftId,
    draftType: action.target,
    title: action.title,
    summary: action.summary,
    reviewStatus: action.reviewStatus,
    createdByUserId: action.requestedBy,
    createdByRole,
    authoritySource: action.accessContext.authoritySource,
    adminFallback: action.accessContext.adminFallback,
    relatedSignalIds: action.relatedSignalIds,
    relatedTopics: action.relatedTopics,
    relatedPlaces: action.relatedPlaces,
    linkedTopicClusterIds: signal.clusterKey ? [signal.clusterKey] : [],
    openQuestions: action.openQuestions,
    guardrails: DRAFT_GUARDRAILS,
    provenance: action.provenance,
    targetStatus: "draft",
    visibilityState: resolveRegionSignalDraftVisibilityState(action.reviewStatus),
    backingStore: action.target === "dossier" ? "dossiers" : "anlassraum",
    createdAt: now,
    updatedAt: now,
  });

  await persistence.saveRecord(record);

  return RegionSignalDraftResultSchema.parse({
    ok: true,
    draftId,
    draftType: action.target,
    reviewStatus: action.reviewStatus,
    visibilityState: record.visibilityState,
    createdByRole,
    guardrails: DRAFT_GUARDRAILS,
  });
}

export function supportsAutomaticPublicationFromRegionSignalDrafts(): false {
  return false;
}
