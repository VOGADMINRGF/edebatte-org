import { ObjectId, coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { normalizeGermanSlug } from "@features/common/utils/textNormalization";
import {
  createEmptyParticipationSpace,
  getParticipationSpaceStatusLabel,
  type ParticipationSpace,
} from "@/features/participation/spaceContainer";
import {
  activateParticipationSpaceAfterReview,
  approveParticipationSpaceActivation as approveParticipationSpaceActivationRecord,
  approveParticipationSpacePublication as approveParticipationSpacePublicationRecord,
  buildParticipationSpacePublishDraft,
  getParticipationSpacePublishBlockers,
  publishParticipationSpaceAfterReview,
  reviewParticipationSpaceQuestionGuard as reviewParticipationSpaceQuestionGuardRecord,
  type ParticipationSpacePublishAuditContext,
  type ParticipationSpacePublishAuditEntry,
  type ParticipationSpacePublishRecord,
} from "@/features/create/participationSpacePublishWorkflow";
import {
  buildParticipationSpaceRuntimeDraftFromHandoff,
  createParticipationSpaceRuntimeAfterReview,
  getParticipationSpaceRuntimeCreationBlockers,
  type ParticipationSpaceRuntimeAuditContext,
  type ParticipationSpaceRuntimeAuditEntry,
  type ParticipationSpaceRuntimeRecord,
  type ParticipationSpaceRuntimeSourceStatus,
} from "@/features/create/participationSpaceRuntime";
import { listCommunitySourceReviewRecords } from "@/features/create/communitySourceReviewServer";
import {
  getPersistedCreateHandoffRecord,
  listPersistedCreateHandoffRecords,
  type PersistedCreateHandoffRecord,
} from "@/features/create/persistedHandoffReviewQueue";
import {
  holdQuestionGuardForSerializedReview,
  normalizeWorkflowRecordVersion,
  persistQuestionGuardReviewFailClosed,
} from "@/features/create/safety/questionGuardReviewPersistence";
import type { PublicQuestionActorContext } from "@/features/create/safety/publicQuestionGeneralization";

export type ParticipationSpaceRuntimePersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  label: string;
  summary: string;
  repositoryInterface: "ParticipationSpaceRuntimeRepository";
  storeKind: "mongo_collection" | "in_memory";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
};

export type ParticipationSpacePublishWorkflowPersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  label: string;
  summary: string;
  repositoryInterface: "ParticipationSpacePublishWorkflowRepository";
  storeKind: "mongo_collection" | "in_memory";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
  publicRouteRuntime: "fixture_only" | "runtime_wired";
};

type ParticipationSpaceRuntimeCreatedSpaceRecord = {
  id: string;
  slug: string;
  space: ParticipationSpace;
  sourceHandoffId: string;
  sourceReviewItemId: string;
  statementId: string;
  title: string;
  description: string;
  participationQuestion: string;
  relatedAnlassraumId: string | null;
  relatedDossierId: string | null;
  sourceStatus: ParticipationSpaceRuntimeSourceStatus;
  recognizedStandpoints: string[];
  argumentLines: string[];
  openQuestions: string[];
  communitySignals: ParticipationSpaceRuntimeRecord["communitySignals"];
  graphReferences: string[];
  topicReferences: string[];
  regionId: string | null;
  organizationId: string | null;
  createdByUserId: string | null;
  auditContext: ParticipationSpaceRuntimeAuditContext;
  createdAt: string;
  updatedAt: string;
};

export type ParticipationSpaceRuntimeRepository = {
  get(sourceHandoffId: string): Promise<ParticipationSpaceRuntimeRecord | null>;
  save(record: ParticipationSpaceRuntimeRecord): Promise<ParticipationSpaceRuntimeRecord>;
  list(limit?: number): Promise<ParticipationSpaceRuntimeRecord[]>;
  insertAudit(
    entry: ParticipationSpaceRuntimeAuditEntry,
  ): Promise<ParticipationSpaceRuntimeAuditEntry>;
  listAudits(params?: {
    sourceHandoffId?: string | null;
    limit?: number;
  }): Promise<ParticipationSpaceRuntimeAuditEntry[]>;
  saveCreatedSpace(
    record: ParticipationSpaceRuntimeCreatedSpaceRecord,
  ): Promise<ParticipationSpaceRuntimeCreatedSpaceRecord>;
  getCreatedSpaceById(
    participationSpaceId: string,
  ): Promise<ParticipationSpaceRuntimeCreatedSpaceRecord | null>;
  getCreatedSpaceBySourceHandoffId(
    sourceHandoffId: string,
  ): Promise<ParticipationSpaceRuntimeCreatedSpaceRecord | null>;
  updateCreatedSpace(
    record: ParticipationSpaceRuntimeCreatedSpaceRecord,
  ): Promise<ParticipationSpaceRuntimeCreatedSpaceRecord>;
  getPublishRecord(
    sourceHandoffId: string,
  ): Promise<ParticipationSpacePublishRecord | null>;
  savePublishRecord(
    record: ParticipationSpacePublishRecord,
  ): Promise<ParticipationSpacePublishRecord>;
  compareAndSwapPublishRecord(input: {
    record: ParticipationSpacePublishRecord;
    expectedVersion: number;
  }): Promise<ParticipationSpacePublishRecord>;
  listPublishRecords(limit?: number): Promise<ParticipationSpacePublishRecord[]>;
  insertPublishAudit(
    entry: ParticipationSpacePublishAuditEntry,
  ): Promise<ParticipationSpacePublishAuditEntry>;
  listPublishAudits(params?: {
    sourceHandoffId?: string | null;
    limit?: number;
  }): Promise<ParticipationSpacePublishAuditEntry[]>;
  getPersistenceState(): ParticipationSpaceRuntimePersistenceState;
  getPublishPersistenceState(): ParticipationSpacePublishWorkflowPersistenceState;
};

const RUNTIME_COLLECTION = "participation_space_runtime_records";
const AUDIT_COLLECTION = "participation_space_runtime_audits";
const SPACE_COLLECTION = "participation_space_runtime_spaces";
const PUBLISH_COLLECTION = "participation_space_publish_records";
const PUBLISH_AUDIT_COLLECTION = "participation_space_publish_audits";

let repoSingleton: ParticipationSpaceRuntimeRepository | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

function trimOrNull(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function buildPersistenceState(
  mode: ParticipationSpaceRuntimePersistenceState["mode"],
): ParticipationSpaceRuntimePersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    label: persistent
      ? "Persistente Beteiligungsraum-Runtime-Creation"
      : "In-Memory-Fallback für Beteiligungsraum-Runtime-Creation",
    summary: persistent
      ? "Review-bestätigte Beteiligungsraum-Creation-Drafts, Freigaben, Audit-Spuren und interne Raumobjekte liegen dauerhaft vor. Erstellung bleibt strikt von Veröffentlichung, öffentlicher Aktivierung, Wahrheit, Verifikation und Graph-/Merge-Automatik getrennt."
      : "Nur Dev-/Test-Fallback: Beteiligungsraum-Creation-Drafts und interne Raumobjekte leben pro Runtime und sind keine belastbare Produktionswahrheit.",
    repositoryInterface: "ParticipationSpaceRuntimeRepository",
    storeKind: persistent ? "mongo_collection" : "in_memory",
    productionTruth: persistent,
    restartReconstructable: persistent,
    deploymentReconstructable: persistent,
  };
}

function buildPublishPersistenceState(
  mode: ParticipationSpacePublishWorkflowPersistenceState["mode"],
): ParticipationSpacePublishWorkflowPersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    label: persistent
      ? "Persistenter Beteiligungsraum-Publish-/Activation-Workflow"
      : "In-Memory-Fallback für Beteiligungsraum-Publish-/Activation-Workflow",
    summary: persistent
      ? "Aktivierungs- und Veröffentlichungsfreigaben liegen dauerhaft vor. Öffentliche Sichtbarkeit entsteht nur nach expliziter Freigabe, Audit und Blocker-Prüfung; die öffentliche /beteiligung-Route liest veröffentlichte Runtime-Räume read-only und nutzt Fixtures nur noch als klar gekennzeichneten Fallback ohne Runtime-Mutation."
      : "Nur Dev-/Test-Fallback: Aktivierungs- und Veröffentlichungszustände leben pro Runtime und sind keine belastbare Produktionswahrheit.",
    repositoryInterface: "ParticipationSpacePublishWorkflowRepository",
    storeKind: persistent ? "mongo_collection" : "in_memory",
    productionTruth: persistent,
    restartReconstructable: persistent,
    deploymentReconstructable: persistent,
    publicRouteRuntime: "runtime_wired",
  };
}

function auditIdFor(input: {
  sourceHandoffId: string;
  action: ParticipationSpaceRuntimeAuditEntry["action"];
  at: string;
}) {
  return `participation-space-runtime-audit-${stableHash(
    `${input.sourceHandoffId}:${input.action}:${input.at}`,
  ).slice(0, 22)}`;
}

function publishAuditIdFor(input: {
  sourceHandoffId: string;
  action: ParticipationSpacePublishAuditEntry["action"];
  at: string;
}) {
  return `participation-space-publish-audit-${stableHash(
    `${input.sourceHandoffId}:${input.action}:${input.at}`,
  ).slice(0, 22)}`;
}

function runtimeRecordId(sourceHandoffId: string) {
  return `participation-space-runtime:${stableHash(
    String(sourceHandoffId).trim(),
  ).slice(0, 18)}`;
}

function getRepo() {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemoryParticipationSpaceRuntimeRepository()
    : createMongoParticipationSpaceRuntimeRepository();
  return repoSingleton;
}

export function setParticipationSpaceRuntimeRepositoryForTests(
  repo: ParticipationSpaceRuntimeRepository | null,
) {
  repoSingleton = repo;
}

export function createInMemoryParticipationSpaceRuntimeRepository(): ParticipationSpaceRuntimeRepository {
  const records = new Map<string, ParticipationSpaceRuntimeRecord>();
  const audits = new Map<string, ParticipationSpaceRuntimeAuditEntry>();
  const spaces = new Map<string, ParticipationSpaceRuntimeCreatedSpaceRecord>();
  const publishRecords = new Map<string, ParticipationSpacePublishRecord>();
  const publishAudits = new Map<string, ParticipationSpacePublishAuditEntry>();

  return {
    async get(sourceHandoffId) {
      const record = records.get(sourceHandoffId);
      return record ? clone(record) : null;
    },
    async save(record) {
      records.set(record.sourceHandoffId, clone(record));
      return clone(record);
    },
    async list(limit) {
      const list = Array.from(records.values()).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
      return (typeof limit === "number" ? list.slice(0, limit) : list).map(clone);
    },
    async insertAudit(entry) {
      audits.set(entry.id, clone(entry));
      return clone(entry);
    },
    async listAudits(params) {
      const list = Array.from(audits.values())
        .filter((entry) => {
          if (
            params?.sourceHandoffId &&
            entry.sourceHandoffId !== params.sourceHandoffId
          ) {
            return false;
          }
          return true;
        })
        .sort((left, right) => right.at.localeCompare(left.at));
      return (typeof params?.limit === "number" ? list.slice(0, params.limit) : list).map(
        clone,
      );
    },
    async saveCreatedSpace(record) {
      spaces.set(record.id, clone(record));
      return clone(record);
    },
    async getCreatedSpaceById(participationSpaceId) {
      const record = spaces.get(participationSpaceId);
      return record ? clone(record) : null;
    },
    async getCreatedSpaceBySourceHandoffId(sourceHandoffId) {
      const record = Array.from(spaces.values()).find(
        (entry) => entry.sourceHandoffId === sourceHandoffId,
      );
      return record ? clone(record) : null;
    },
    async updateCreatedSpace(record) {
      spaces.set(record.id, clone(record));
      return clone(record);
    },
    async getPublishRecord(sourceHandoffId) {
      const record = publishRecords.get(sourceHandoffId);
      return record ? clone(record) : null;
    },
    async savePublishRecord(record) {
      publishRecords.set(record.sourceHandoffId, clone(record));
      return clone(record);
    },
    async compareAndSwapPublishRecord(input) {
      const current = publishRecords.get(input.record.sourceHandoffId);
      const currentVersion = normalizeWorkflowRecordVersion(current?.version);
      if (
        (current && currentVersion !== input.expectedVersion) ||
        (!current && input.expectedVersion !== 0)
      ) {
        throw new Error("participation_space_publish_state_conflict");
      }
      const nextRecord = {
        ...input.record,
        version: input.expectedVersion + 1,
      };
      publishRecords.set(nextRecord.sourceHandoffId, clone(nextRecord));
      return clone(nextRecord);
    },
    async listPublishRecords(limit) {
      const list = Array.from(publishRecords.values()).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      );
      return (typeof limit === "number" ? list.slice(0, limit) : list).map(clone);
    },
    async insertPublishAudit(entry) {
      publishAudits.set(entry.id, clone(entry));
      return clone(entry);
    },
    async listPublishAudits(params) {
      const list = Array.from(publishAudits.values())
        .filter((entry) => {
          if (
            params?.sourceHandoffId &&
            entry.sourceHandoffId !== params.sourceHandoffId
          ) {
            return false;
          }
          return true;
        })
        .sort((left, right) => right.at.localeCompare(left.at));
      return (typeof params?.limit === "number" ? list.slice(0, params.limit) : list).map(
        clone,
      );
    },
    getPersistenceState() {
      return buildPersistenceState("in_memory_fallback");
    },
    getPublishPersistenceState() {
      return buildPublishPersistenceState("in_memory_fallback");
    },
  };
}

function createMongoParticipationSpaceRuntimeRepository(): ParticipationSpaceRuntimeRepository {
  return {
    async get(sourceHandoffId) {
      const col = await coreCol<{ _id: string; record: ParticipationSpaceRuntimeRecord }>(
        RUNTIME_COLLECTION,
      );
      const doc = await col.findOne({ _id: runtimeRecordId(sourceHandoffId) } as any);
      return doc?.record ? clone(doc.record) : null;
    },
    async save(record) {
      const col = await coreCol<{ _id: string; record: ParticipationSpaceRuntimeRecord }>(
        RUNTIME_COLLECTION,
      );
      await col.updateOne(
        { _id: runtimeRecordId(record.sourceHandoffId) } as any,
        {
          $set: {
            record: clone(record),
            sourceHandoffId: record.sourceHandoffId,
            status: record.status,
            updatedAt: record.updatedAt,
            createdParticipationSpaceId: record.createdParticipationSpaceId,
          } as any,
        },
        { upsert: true },
      );
      return clone(record);
    },
    async list(limit) {
      const col = await coreCol<{ _id: string; record: ParticipationSpaceRuntimeRecord }>(
        RUNTIME_COLLECTION,
      );
      const cursor = col.find({} as any).sort({ updatedAt: -1 });
      if (typeof limit === "number") cursor.limit(limit);
      const docs = await cursor.toArray();
      return docs
        .map((doc) => clone(doc.record))
        .filter((record): record is ParticipationSpaceRuntimeRecord => Boolean(record));
    },
    async insertAudit(entry) {
      const col = await coreCol<ParticipationSpaceRuntimeAuditEntry>(
        AUDIT_COLLECTION,
      );
      await col.updateOne({ id: entry.id } as any, { $set: clone(entry) as any }, { upsert: true });
      return clone(entry);
    },
    async listAudits(params) {
      const col = await coreCol<ParticipationSpaceRuntimeAuditEntry>(
        AUDIT_COLLECTION,
      );
      const filter: Record<string, unknown> = {};
      if (params?.sourceHandoffId) {
        filter.sourceHandoffId = params.sourceHandoffId;
      }
      const cursor = col.find(filter as any).sort({ at: -1 });
      if (typeof params?.limit === "number") cursor.limit(params.limit);
      const docs = await cursor.toArray();
      return docs.map(clone);
    },
    async saveCreatedSpace(record) {
      const col = await coreCol<{ _id: string; record: ParticipationSpaceRuntimeCreatedSpaceRecord }>(
        SPACE_COLLECTION,
      );
      await col.updateOne(
        { _id: record.id } as any,
        {
          $set: {
            record: clone(record),
            sourceHandoffId: record.sourceHandoffId,
            slug: record.slug,
            regionId: record.regionId,
            organizationId: record.organizationId,
            updatedAt: record.updatedAt,
          } as any,
        },
        { upsert: true },
      );
      return clone(record);
    },
    async getCreatedSpaceById(participationSpaceId) {
      const col = await coreCol<{ _id: string; record: ParticipationSpaceRuntimeCreatedSpaceRecord }>(
        SPACE_COLLECTION,
      );
      const doc = await col.findOne({ _id: participationSpaceId } as any);
      return doc?.record ? clone(doc.record) : null;
    },
    async getCreatedSpaceBySourceHandoffId(sourceHandoffId) {
      const col = await coreCol<{ _id: string; record: ParticipationSpaceRuntimeCreatedSpaceRecord }>(
        SPACE_COLLECTION,
      );
      const doc = await col.findOne({ sourceHandoffId } as any);
      return doc?.record ? clone(doc.record) : null;
    },
    async updateCreatedSpace(record) {
      const col = await coreCol<{ _id: string; record: ParticipationSpaceRuntimeCreatedSpaceRecord }>(
        SPACE_COLLECTION,
      );
      await col.updateOne(
        { _id: record.id } as any,
        {
          $set: {
            record: clone(record),
            sourceHandoffId: record.sourceHandoffId,
            slug: record.slug,
            regionId: record.regionId,
            organizationId: record.organizationId,
            updatedAt: record.updatedAt,
          } as any,
        },
        { upsert: true },
      );
      return clone(record);
    },
    async getPublishRecord(sourceHandoffId) {
      const col = await coreCol<{ _id: string; record: ParticipationSpacePublishRecord }>(
        PUBLISH_COLLECTION,
      );
      const doc = await col.findOne({ _id: runtimeRecordId(sourceHandoffId) } as any);
      return doc?.record ? clone(doc.record) : null;
    },
    async savePublishRecord(record) {
      const col = await coreCol<{ _id: string; record: ParticipationSpacePublishRecord }>(
        PUBLISH_COLLECTION,
      );
      await col.updateOne(
        { _id: runtimeRecordId(record.sourceHandoffId) } as any,
        {
          $set: {
            record: clone(record),
            sourceHandoffId: record.sourceHandoffId,
            status: record.status,
            updatedAt: record.updatedAt,
            participationSpaceId: record.participationSpaceId,
          } as any,
        },
        { upsert: true },
      );
      return clone(record);
    },
    async compareAndSwapPublishRecord(input) {
      const expectedVersion = normalizeWorkflowRecordVersion(
        input.expectedVersion,
      );
      const nextRecord = {
        ...input.record,
        version: expectedVersion + 1,
      };
      const col = await coreCol<{
        _id: string;
        record: ParticipationSpacePublishRecord;
      }>(PUBLISH_COLLECTION);
      try {
        const result = await col.updateOne(
          {
            _id: runtimeRecordId(input.record.sourceHandoffId),
            ...(expectedVersion === 0
              ? {
                  $or: [
                    { version: 0 },
                    { version: { $exists: false } },
                  ],
                }
              : { version: expectedVersion }),
          } as any,
          {
            $set: {
              record: clone(nextRecord),
              sourceHandoffId: nextRecord.sourceHandoffId,
              status: nextRecord.status,
              updatedAt: nextRecord.updatedAt,
              participationSpaceId: nextRecord.participationSpaceId,
              version: nextRecord.version,
            } as any,
          },
          { upsert: expectedVersion === 0 },
        );
        if (result.modifiedCount + result.upsertedCount !== 1) {
          throw new Error("participation_space_publish_state_conflict");
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "participation_space_publish_state_conflict"
        ) {
          throw error;
        }
        if ((error as { code?: number })?.code === 11000) {
          throw new Error("participation_space_publish_state_conflict");
        }
        throw error;
      }
      return clone(nextRecord);
    },
    async listPublishRecords(limit) {
      const col = await coreCol<{ _id: string; record: ParticipationSpacePublishRecord }>(
        PUBLISH_COLLECTION,
      );
      const cursor = col.find({} as any).sort({ updatedAt: -1 });
      if (typeof limit === "number") cursor.limit(limit);
      const docs = await cursor.toArray();
      return docs
        .map((doc) => clone(doc.record))
        .filter((record): record is ParticipationSpacePublishRecord => Boolean(record));
    },
    async insertPublishAudit(entry) {
      const col = await coreCol<ParticipationSpacePublishAuditEntry>(
        PUBLISH_AUDIT_COLLECTION,
      );
      await col.updateOne({ id: entry.id } as any, { $set: clone(entry) as any }, { upsert: true });
      return clone(entry);
    },
    async listPublishAudits(params) {
      const col = await coreCol<ParticipationSpacePublishAuditEntry>(
        PUBLISH_AUDIT_COLLECTION,
      );
      const filter: Record<string, unknown> = {};
      if (params?.sourceHandoffId) {
        filter.sourceHandoffId = params.sourceHandoffId;
      }
      const cursor = col.find(filter as any).sort({ at: -1 });
      if (typeof params?.limit === "number") cursor.limit(params.limit);
      const docs = await cursor.toArray();
      return docs.map(clone);
    },
    getPersistenceState() {
      return buildPersistenceState("persistent_primary");
    },
    getPublishPersistenceState() {
      return buildPublishPersistenceState("persistent_primary");
    },
  };
}

async function recordAudit(
  sourceHandoffId: string,
  entry: Omit<ParticipationSpaceRuntimeAuditEntry, "id" | "sourceHandoffId">,
) {
  const auditEntry: ParticipationSpaceRuntimeAuditEntry = {
    ...entry,
    sourceHandoffId,
    id: auditIdFor({
      sourceHandoffId,
      action: entry.action,
      at: entry.at,
    }),
  };
  return getRepo().insertAudit(auditEntry);
}

async function recordPublishAudit(
  sourceHandoffId: string,
  entry: Omit<ParticipationSpacePublishAuditEntry, "id" | "sourceHandoffId">,
) {
  const auditEntry: ParticipationSpacePublishAuditEntry = {
    ...entry,
    sourceHandoffId,
    id: publishAuditIdFor({
      sourceHandoffId,
      action: entry.action,
      at: entry.at,
    }),
  };
  return getRepo().insertPublishAudit(auditEntry);
}

function buildSpaceSlug(record: ParticipationSpaceRuntimeRecord) {
  return normalizeGermanSlug(record.title, {
    maxLength: 72,
    fallback: "beteiligungsraum",
  });
}

function buildSpaceModules(): ParticipationSpace["modules"] {
  return [
    "topic_overview",
    "status_timeline",
    "open_questions",
    "minority_positions",
    "next_steps",
    "result_feedback",
    "dossier_references",
    "operator_cockpit",
  ];
}

async function materializeRuntimeParticipationSpace(input: {
  record: ParticipationSpaceRuntimeRecord;
  auditContext: ParticipationSpaceRuntimeAuditContext;
}) {
  const sourceRecord = await getPersistedCreateHandoffRecord(input.record.sourceHandoffId);
  if (!sourceRecord) {
    return { ok: false, error: "source_handoff_missing" } as const;
  }

  const createdAt = nowIso();
  const spaceId = `participation-space-${new ObjectId().toHexString()}`;
  const slug = buildSpaceSlug(input.record);
  const space = createEmptyParticipationSpace({
    id: spaceId,
    title: input.record.title,
    slug,
    summary: input.record.description,
    updatedAt: createdAt,
    status: "review_active",
    visibility: "review_only",
    modules: buildSpaceModules(),
  });

  const spaceRecord: ParticipationSpaceRuntimeCreatedSpaceRecord = {
    id: spaceId,
    slug,
    space: {
      ...space,
      publicSummary: {
        ...space.publicSummary,
        headline: input.record.participationQuestion,
        shortSummary: input.record.description,
        openQuestionCount: input.record.openQuestions.length,
        minorityPositionCount: Math.min(
          input.record.recognizedStandpoints.length,
          3,
        ),
        nextStepCount: Math.min(input.record.argumentLines.length, 3),
        lastUpdatedAt: createdAt,
      },
      updatedAt: createdAt,
    },
    sourceHandoffId: input.record.sourceHandoffId,
    sourceReviewItemId: input.record.sourceReviewItemId,
    statementId: input.record.statementId,
    title: input.record.title,
    description: input.record.description,
    participationQuestion: input.record.participationQuestion,
    relatedAnlassraumId: input.record.relatedAnlassraumId,
    relatedDossierId: input.record.relatedDossierId,
    sourceStatus: input.record.sourceStatus,
    recognizedStandpoints: input.record.recognizedStandpoints,
    argumentLines: input.record.argumentLines,
    openQuestions: input.record.openQuestions,
    communitySignals: input.record.communitySignals,
    graphReferences: input.record.graphReferences,
    topicReferences: input.record.topicReferences,
    regionId: sourceRecord.regionId,
    organizationId: sourceRecord.organizationId,
    createdByUserId: trimOrNull(input.auditContext.actorUserId),
    auditContext: input.auditContext,
    createdAt,
    updatedAt: createdAt,
  };

  await getRepo().saveCreatedSpace(spaceRecord);

  return {
    ok: true,
    participationSpaceId: spaceId,
    participationSpaceSlug: slug,
    createdAt,
  } as const;
}

async function communitySignalsForHandoff(sourceHandoffId: string) {
  const records = await listCommunitySourceReviewRecords(200).catch(() => []);
  return records.filter(
    (record) =>
      record.target === "handoff_review_item" &&
      record.targetId === sourceHandoffId,
  );
}

async function buildRuntimeRecord(
  handoff: PersistedCreateHandoffRecord,
): Promise<ParticipationSpaceRuntimeRecord> {
  const [existing, communityContributions, audits] = await Promise.all([
    getRepo().get(handoff.id),
    communitySignalsForHandoff(handoff.id),
    getRepo().listAudits({ sourceHandoffId: handoff.id, limit: 40 }),
  ]);

  const draft = buildParticipationSpaceRuntimeDraftFromHandoff(handoff, {
    communityContributions,
    status: existing?.status ?? "queued_for_review",
    createdParticipationSpaceId: existing?.createdParticipationSpaceId ?? null,
    createdParticipationSpaceSlug: existing?.createdParticipationSpaceSlug ?? null,
    approvedForSetup: true,
    visibility: existing?.visibility ?? "internal_review",
    graphContextPending: existing?.graphContextPending,
    dossierContextPending: existing?.dossierContextPending,
    anlassraumContextPending: existing?.anlassraumContextPending,
    auditContext: existing?.auditContext ?? {},
  });

  return {
    ...draft,
    id: existing?.id ?? draft.id,
    blockers:
      existing?.status === "approved_for_creation" ||
      existing?.status === "created"
        ? getParticipationSpaceRuntimeCreationBlockers(draft)
        : draft.blockers,
    auditTrail:
      audits.length > 0
        ? audits
        : [
            {
              id: `participation-space-runtime-derived-${handoff.id}`,
              sourceHandoffId: handoff.id,
              at: handoff.updatedAt,
              action: "draft_derived",
              actorUserId: handoff.createdByUserId,
              note:
                "Beteiligungsraum-Creation-Draft aus bestehendem Create-Handoff abgeleitet. Noch nicht erstellt, aktiviert oder veröffentlicht.",
              blockers: draft.blockers,
              status: draft.status,
            },
          ],
    approvedForCreationAt: existing?.approvedForCreationAt ?? null,
    approvedForCreationBy: existing?.approvedForCreationBy ?? null,
    rejectedAt: existing?.rejectedAt ?? null,
    rejectedBy: existing?.rejectedBy ?? null,
  };
}

async function saveRecord(record: ParticipationSpaceRuntimeRecord) {
  return getRepo().save(record);
}

async function savePublishRecord(record: ParticipationSpacePublishRecord) {
  return getRepo().compareAndSwapPublishRecord({
    record,
    expectedVersion: normalizeWorkflowRecordVersion(record.version),
  });
}

function hasRuntimeCreatedAudit(record: ParticipationSpaceRuntimeRecord) {
  return record.auditTrail.some((entry) => entry.action === "runtime_created");
}

function buildPublishWorkflowDraftAudit(
  sourceHandoffId: string,
  record: ParticipationSpacePublishRecord,
): ParticipationSpacePublishAuditEntry {
  return {
    id: `participation-space-publish-derived-${sourceHandoffId}`,
    sourceHandoffId,
    participationSpaceId: record.participationSpaceId,
    at: record.updatedAt,
    action: "activation_requested",
    actorUserId: record.auditContext.actorUserId,
    note:
      "Separater Aktivierungs-/Veröffentlichungsworkflow aus intern erzeugtem Beteiligungsraum abgeleitet. Noch nicht aktiviert und noch nicht veröffentlicht.",
    blockers: record.blockers,
    status: record.status,
  };
}

function buildSpaceStatusForPublication(record: ParticipationSpacePublishRecord) {
  return record.publicFeedbackAvailable ? "public_feedback_live" : "feedback_prepared";
}

function applyPublishRecordToCreatedSpace(
  spaceRecord: ParticipationSpaceRuntimeCreatedSpaceRecord,
  publishRecord: ParticipationSpacePublishRecord,
) {
  const nextStatus = publishRecord.spaceStatus ?? spaceRecord.space.status;
  const nextVisibility = publishRecord.spaceVisibility ?? spaceRecord.space.visibility;
  const updatedAt = publishRecord.updatedAt;

  return {
    ...spaceRecord,
    title: publishRecord.title,
    description: publishRecord.description,
    participationQuestion: publishRecord.participationQuestion,
    relatedAnlassraumId: publishRecord.relatedAnlassraumId,
    relatedDossierId: publishRecord.relatedDossierId,
    sourceStatus: publishRecord.sourceStatus,
    recognizedStandpoints: publishRecord.recognizedStandpoints,
    argumentLines: publishRecord.argumentLines,
    openQuestions: publishRecord.openQuestions,
    communitySignals: publishRecord.communitySignals,
    graphReferences: publishRecord.graphReferences,
    topicReferences: publishRecord.topicReferences,
    auditContext: {
      actorUserId: publishRecord.auditContext.actorUserId,
      reason: publishRecord.auditContext.reason,
      origin:
        publishRecord.auditContext.origin === "participation_space_publish_workflow"
          ? "participation_space_runtime"
          : publishRecord.auditContext.origin,
      approvedAt: publishRecord.auditContext.approvedAt,
    },
    space: {
      ...spaceRecord.space,
      title: publishRecord.title,
      summary: publishRecord.description,
      status: nextStatus,
      visibility: nextVisibility,
      updatedAt,
      publicSummary: {
        ...spaceRecord.space.publicSummary,
        headline: publishRecord.publicHeadline,
        shortSummary: publishRecord.publicSummary,
        feedbackAvailable: publishRecord.publicFeedbackAvailable,
        statusLabel: getParticipationSpaceStatusLabel(nextStatus),
        lastUpdatedAt: updatedAt,
      },
    },
    updatedAt,
  } satisfies ParticipationSpaceRuntimeCreatedSpaceRecord;
}

async function updateRuntimeRecordVisibility(input: {
  sourceHandoffId: string;
  visibility: ParticipationSpaceRuntimeRecord["visibility"];
}) {
  const runtimeRecord = await getParticipationSpaceRuntimeRecord(input.sourceHandoffId);
  if (!runtimeRecord) return null;
  const updatedRecord: ParticipationSpaceRuntimeRecord = {
    ...runtimeRecord,
    visibility: input.visibility,
    updatedAt: nowIso(),
  };
  await saveRecord(updatedRecord);
  return updatedRecord;
}

async function buildParticipationSpacePublishRecord(
  runtimeRecord: ParticipationSpaceRuntimeRecord,
): Promise<ParticipationSpacePublishRecord | null> {
  if (!runtimeRecord.createdParticipationSpaceId) return null;

  const [existing, createdSpace, audits] = await Promise.all([
    getRepo().getPublishRecord(runtimeRecord.sourceHandoffId),
    getRepo().getCreatedSpaceById(runtimeRecord.createdParticipationSpaceId),
    getRepo().listPublishAudits({
      sourceHandoffId: runtimeRecord.sourceHandoffId,
      limit: 40,
    }),
  ]);

  const draft = buildParticipationSpacePublishDraft({
    version: normalizeWorkflowRecordVersion(existing?.version),
    runtimeRecord,
    createdSpace: createdSpace
      ? {
          id: createdSpace.id,
          slug: createdSpace.slug,
          status: createdSpace.space.status,
          visibility: createdSpace.space.visibility,
          publicHeadline: createdSpace.space.publicSummary.headline,
          publicSummary: createdSpace.space.publicSummary.shortSummary,
          publicFeedbackAvailable:
            createdSpace.space.publicSummary.feedbackAvailable,
          updatedAt: createdSpace.updatedAt,
        }
      : {
          id: runtimeRecord.createdParticipationSpaceId,
          slug: runtimeRecord.createdParticipationSpaceSlug,
          status: null,
          visibility: null,
          updatedAt: runtimeRecord.updatedAt,
        },
    creationAudited: hasRuntimeCreatedAudit(runtimeRecord),
    questionGuard: existing?.questionGuard ?? null,
    status: existing?.status ?? "draft",
    visibility: existing?.visibility ?? "editorial_workspace",
    publicHeadline: existing?.publicHeadline ?? null,
    publicSummary: existing?.publicSummary ?? null,
    moderationPolicy: existing?.moderationPolicy ?? null,
    auditContext: existing?.auditContext ?? {
      actorUserId: runtimeRecord.auditContext.actorUserId,
      reason: runtimeRecord.auditContext.reason,
      origin: "admin_review",
      approvedAt: runtimeRecord.auditContext.approvedAt,
    },
    approvedForActivationAt: existing?.approvedForActivationAt ?? null,
    approvedForActivationBy: existing?.approvedForActivationBy ?? null,
    approvedForPublicationAt: existing?.approvedForPublicationAt ?? null,
    approvedForPublicationBy: existing?.approvedForPublicationBy ?? null,
    rejectedAt: existing?.rejectedAt ?? null,
    rejectedBy: existing?.rejectedBy ?? null,
    createdAt: existing?.createdAt ?? runtimeRecord.createdAt,
    updatedAt: existing?.updatedAt ?? createdSpace?.updatedAt ?? runtimeRecord.updatedAt,
  });

  const publishRecord: ParticipationSpacePublishRecord = {
    ...draft,
    auditTrail:
      audits.length > 0
        ? audits
        : [buildPublishWorkflowDraftAudit(runtimeRecord.sourceHandoffId, draft as ParticipationSpacePublishRecord)],
    approvedForActivationAt: existing?.approvedForActivationAt ?? null,
    approvedForActivationBy: existing?.approvedForActivationBy ?? null,
    approvedForPublicationAt: existing?.approvedForPublicationAt ?? null,
    approvedForPublicationBy: existing?.approvedForPublicationBy ?? null,
    rejectedAt: existing?.rejectedAt ?? null,
    rejectedBy: existing?.rejectedBy ?? null,
  };

  return publishRecord;
}

export function getParticipationSpaceRuntimePersistenceState() {
  return getRepo().getPersistenceState();
}

export function getParticipationSpacePublishWorkflowPersistenceState() {
  return getRepo().getPublishPersistenceState();
}

export async function listParticipationSpaceRuntimeRecords(limit = 40) {
  const records = await listPersistedCreateHandoffRecords();
  const handoffs = records
    .filter(
      (record) => record.selectedAction === "prepare_participation_space",
    )
    .slice(0, limit);
  const runtimeRecords = await Promise.all(handoffs.map(buildRuntimeRecord));
  return runtimeRecords.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function getParticipationSpaceRuntimeRecord(sourceHandoffId: string) {
  const handoff = await getPersistedCreateHandoffRecord(sourceHandoffId);
  if (!handoff || handoff.selectedAction !== "prepare_participation_space") {
    return null;
  }
  return buildRuntimeRecord(handoff);
}

export async function listParticipationSpaceRuntimeAudits(params?: {
  sourceHandoffId?: string | null;
  limit?: number;
}) {
  return getRepo().listAudits(params);
}

export async function listParticipationSpacePublishRecords(limit = 40) {
  const runtimeRecords = await listParticipationSpaceRuntimeRecords(limit * 2);
  const createdRuntimeRecords = runtimeRecords
    .filter((record) => record.status === "created" && record.createdParticipationSpaceId)
    .slice(0, limit);
  const publishRecords = await Promise.all(
    createdRuntimeRecords.map(buildParticipationSpacePublishRecord),
  );
  return publishRecords
    .filter((record): record is ParticipationSpacePublishRecord => Boolean(record))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getParticipationSpacePublishRecord(sourceHandoffId: string) {
  const runtimeRecord = await getParticipationSpaceRuntimeRecord(sourceHandoffId);
  if (!runtimeRecord || runtimeRecord.status !== "created") {
    return null;
  }
  return buildParticipationSpacePublishRecord(runtimeRecord);
}

export async function listParticipationSpacePublishAudits(params?: {
  sourceHandoffId?: string | null;
  limit?: number;
}) {
  return getRepo().listPublishAudits(params);
}

export async function approveParticipationSpaceCreation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpaceRuntimeRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_runtime_record_not_found");
  }

  const approvedAt = nowIso();
  const candidate: ParticipationSpaceRuntimeRecord = {
    ...record,
    status: "approved_for_creation",
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        "Review-approved Beteiligungsraum-Creation im bestehenden Admin-Review freigegeben.",
      origin: "admin_review",
      approvedAt,
    },
    approvedForCreationAt: approvedAt,
    approvedForCreationBy: input.actorUserId,
    updatedAt: approvedAt,
  };

  const blockers = getParticipationSpaceRuntimeCreationBlockers(candidate).filter(
    (blocker) => blocker !== "review_not_approved",
  );
  if (blockers.length > 0) {
    const blockedRecord: ParticipationSpaceRuntimeRecord = {
      ...candidate,
      status: "blocked",
      blockers,
    };
    await saveRecord(blockedRecord);
    await recordAudit(input.sourceHandoffId, {
      at: approvedAt,
      action: "creation_blocked",
      actorUserId: input.actorUserId,
      note:
        trimOrNull(input.note) ??
        "Freigabeversuch blockiert, weil Guardrail- oder Review-Blocker offen sind.",
      blockers,
      status: "blocked",
    });
    return blockedRecord;
  }

  const approvedRecord: ParticipationSpaceRuntimeRecord = {
    ...candidate,
    blockers: [],
  };
  await saveRecord(approvedRecord);
  await recordAudit(input.sourceHandoffId, {
    at: approvedAt,
    action: "creation_approved",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Beteiligungsraum-Erstellung explizit freigegeben. Erstellung bleibt getrennt von Veröffentlichung und öffentlicher Aktivierung.",
    blockers: [],
    status: "approved_for_creation",
  });
  return approvedRecord;
}

export async function rejectParticipationSpaceCreation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpaceRuntimeRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_runtime_record_not_found");
  }

  const rejectedAt = nowIso();
  const rejectedRecord: ParticipationSpaceRuntimeRecord = {
    ...record,
    status: "rejected",
    blockers: [],
    rejectedAt,
    rejectedBy: input.actorUserId,
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        "Beteiligungsraum-Erstellung im Review zurückgewiesen.",
      origin: "admin_review",
      approvedAt: record.auditContext.approvedAt,
    },
    updatedAt: rejectedAt,
  };

  await saveRecord(rejectedRecord);
  await recordAudit(input.sourceHandoffId, {
    at: rejectedAt,
    action: "creation_rejected",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Beteiligungsraum-Erstellung abgelehnt. Kein Beteiligungsraum und keine öffentliche Sichtbarkeit wurden erzeugt.",
    blockers: [],
    status: "rejected",
  });
  return rejectedRecord;
}

export async function createApprovedParticipationSpace(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpaceRuntimeRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_runtime_record_not_found");
  }

  const result = await createParticipationSpaceRuntimeAfterReview(record, {
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        record.auditContext.reason ??
        "Review-approved Beteiligungsraum-Creation in bestehende Runtime geschrieben.",
      origin: "participation_space_runtime",
      approvedAt: record.approvedForCreationAt ?? nowIso(),
    },
    creator: materializeRuntimeParticipationSpace,
  });

  if (result.ok === false) {
    const blockedRecord: ParticipationSpaceRuntimeRecord = {
      ...record,
      status: result.error === "blocked" ? "blocked" : record.status,
      blockers: result.blockers,
      updatedAt: nowIso(),
    };
    await saveRecord(blockedRecord);
    await recordAudit(input.sourceHandoffId, {
      at: blockedRecord.updatedAt,
      action: "creation_blocked",
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? result.message,
      blockers: result.blockers,
      status: blockedRecord.status,
    });
    return blockedRecord;
  }

  const createdRecord: ParticipationSpaceRuntimeRecord = {
    ...result.record,
    blockers: [],
    approvedForCreationAt: record.approvedForCreationAt,
    approvedForCreationBy: record.approvedForCreationBy,
    rejectedAt: record.rejectedAt,
    rejectedBy: record.rejectedBy,
    auditTrail: record.auditTrail,
  };
  await saveRecord(createdRecord);
  await recordAudit(input.sourceHandoffId, {
    at: createdRecord.updatedAt,
    action: "runtime_created",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Beteiligungsraum-Runtime erstellt. Der Status bleibt interner Arbeitsstand und nicht öffentlich.",
    blockers: [],
    status: "created",
    participationSpaceId: createdRecord.createdParticipationSpaceId,
    participationSpaceSlug: createdRecord.createdParticipationSpaceSlug,
  });
  return createdRecord;
}

export async function approveParticipationSpaceActivation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpacePublishRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_publish_record_not_found");
  }

  const at = nowIso();
  await recordPublishAudit(input.sourceHandoffId, {
    at,
    action: "activation_requested",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Aktivierungsprüfung für Beteiligungsraum angefordert.",
    blockers: record.blockers,
    status: record.status,
    participationSpaceId: record.participationSpaceId,
  });

  const approvedRecord = approveParticipationSpaceActivationRecord(record, {
    actorUserId: input.actorUserId,
    reason:
      trimOrNull(input.note) ??
      "Aktivierung ist ein separater Freigabeschritt und wurde explizit bestätigt.",
    origin: "admin_review",
    approvedAt: at,
  });

  await savePublishRecord(approvedRecord);
  await recordPublishAudit(input.sourceHandoffId, {
    at,
    action:
      approvedRecord.status === "blocked"
        ? "activation_rejected"
        : "activation_approved",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      (approvedRecord.status === "blocked"
        ? "Aktivierungsfreigabe blockiert, bis alle Review- und Audit-Blocker geschlossen sind."
        : "Aktivierungsfreigabe erteilt. Öffentliche Sichtbarkeit bleibt weiterhin aus."),
    blockers: approvedRecord.blockers,
    status: approvedRecord.status,
    participationSpaceId: approvedRecord.participationSpaceId,
  });
  return approvedRecord;
}

export async function reviewParticipationSpaceQuestionGuard(input: {
  sourceHandoffId: string;
  actorUserId: string;
  actorExtractionSource: "entity_registry" | "actor_graph" | "human_review";
  evidenceRefs: string[];
  actorContexts?: PublicQuestionActorContext[];
  noNamedActorsConfirmed?: boolean;
  note?: string | null;
}) {
  const record = await getParticipationSpacePublishRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_publish_record_not_found");
  }

  const reviewedAt = nowIso();
  const reviewedRecord = reviewParticipationSpaceQuestionGuardRecord(record, {
    actorExtractionSource: input.actorExtractionSource,
    evidenceRefs: input.evidenceRefs,
    actorContexts: input.actorContexts,
    noNamedActorsConfirmed: input.noNamedActorsConfirmed,
    reviewedAt,
  });

  const auditEntry = {
    at: reviewedAt,
    action: "question_guard_reviewed" as const,
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      `Public-Question-Guard erneut bewertet: ${reviewedRecord.questionGuard.releaseState}.`,
    blockers: reviewedRecord.blockers,
    status: reviewedRecord.status,
    participationSpaceId: reviewedRecord.participationSpaceId,
    questionGuardReleaseState: reviewedRecord.questionGuard.releaseState,
    questionGuardActorExtractionSource: input.actorExtractionSource,
    questionGuardEvidenceRefs:
      reviewedRecord.questionGuard.actorExtraction.evidenceRefs,
    questionGuardActorContexts: reviewedRecord.questionGuard.actorContexts,
    questionGuardHumanReviewFinding:
      reviewedRecord.questionGuard.actorExtraction.humanReviewFinding ?? null,
  } satisfies Omit<
    ParticipationSpacePublishAuditEntry,
    "id" | "sourceHandoffId"
  >;

  const reviewReservationDraft: ParticipationSpacePublishRecord = {
    ...reviewedRecord,
    questionGuard: holdQuestionGuardForSerializedReview(record.questionGuard),
  };
  const reviewReservation: ParticipationSpacePublishRecord = {
    ...reviewReservationDraft,
    blockers: getParticipationSpacePublishBlockers(reviewReservationDraft),
  };

  return persistQuestionGuardReviewFailClosed({
    reviewReservation,
    auditEntry,
    persistAudit: (entry) =>
      recordPublishAudit(input.sourceHandoffId, entry),
    persistRecord: savePublishRecord,
    buildReleasedRecord: (reservation) => ({
      ...reviewedRecord,
      version: reservation.version,
    }),
  });
}

export async function rejectParticipationSpaceActivation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpacePublishRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_publish_record_not_found");
  }

  const rejectedAt = nowIso();
  const rejectedRecord: ParticipationSpacePublishRecord = {
    ...record,
    status: "rejected",
    visibility: "editorial_workspace",
    blockers: [],
    rejectedAt,
    rejectedBy: input.actorUserId,
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        "Aktivierung für Beteiligungsraum im Review abgelehnt.",
      origin: "admin_review",
      approvedAt: record.auditContext.approvedAt,
    },
    updatedAt: rejectedAt,
  };

  await savePublishRecord(rejectedRecord);
  await recordPublishAudit(input.sourceHandoffId, {
    at: rejectedAt,
    action: "activation_rejected",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Aktivierung abgelehnt. Beteiligungsraum bleibt intern und nicht öffentlich.",
    blockers: [],
    status: "rejected",
    participationSpaceId: rejectedRecord.participationSpaceId,
  });
  return rejectedRecord;
}

export async function activateApprovedParticipationSpace(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpacePublishRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_publish_record_not_found");
  }
  const createdSpace = record.participationSpaceId
    ? await getRepo().getCreatedSpaceById(record.participationSpaceId)
    : null;
  if (!createdSpace) {
    throw new Error("participation_space_missing");
  }

  const result = activateParticipationSpaceAfterReview(record, {
    actorUserId: input.actorUserId,
    reason:
      trimOrNull(input.note) ??
      "Interne Aktivierung wird nach expliziter Freigabe ausgeführt.",
    origin: "participation_space_publish_workflow",
    approvedAt: nowIso(),
  });

  if (!result.ok) {
    const blockedRecord: ParticipationSpacePublishRecord = {
      ...record,
      status: "blocked",
      blockers: result.blockers,
      updatedAt: nowIso(),
    };
    await savePublishRecord(blockedRecord);
    await recordPublishAudit(input.sourceHandoffId, {
      at: blockedRecord.updatedAt,
      action: "activation_rejected",
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? result.message,
      blockers: result.blockers,
      status: blockedRecord.status,
      participationSpaceId: blockedRecord.participationSpaceId,
    });
    return blockedRecord;
  }

  const persistedRecord = await savePublishRecord(result.record);
  const updatedSpace = applyPublishRecordToCreatedSpace(
    createdSpace,
    persistedRecord,
  );
  await getRepo().updateCreatedSpace(updatedSpace);
  await recordPublishAudit(input.sourceHandoffId, {
    at: persistedRecord.updatedAt,
    action: "activated_internal",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Beteiligungsraum intern aktiviert. Öffentliche Sichtbarkeit bleibt weiterhin aus.",
    blockers: [],
    status: persistedRecord.status,
    participationSpaceId: persistedRecord.participationSpaceId,
  });
  return persistedRecord;
}

export async function approveParticipationSpacePublication(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpacePublishRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_publish_record_not_found");
  }

  const at = nowIso();
  await recordPublishAudit(input.sourceHandoffId, {
    at,
    action: "publication_requested",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Veröffentlichungsprüfung für Beteiligungsraum angefordert.",
    blockers: record.blockers,
    status: record.status,
    participationSpaceId: record.participationSpaceId,
  });

  const approvedRecord = approveParticipationSpacePublicationRecord(record, {
    actorUserId: input.actorUserId,
    reason:
      trimOrNull(input.note) ??
      "Veröffentlichung ist nicht Teil der Erstellung und wurde separat freigegeben.",
    origin: "admin_review",
    approvedAt: at,
  });

  await savePublishRecord(approvedRecord);
  await updateRuntimeRecordVisibility({
    sourceHandoffId: input.sourceHandoffId,
    visibility:
      approvedRecord.status === "blocked"
        ? record.runtimeVisibility
        : "ready_for_publication_review",
  });
  await recordPublishAudit(input.sourceHandoffId, {
    at,
    action:
      approvedRecord.status === "blocked"
        ? "publication_rejected"
        : "publication_approved",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      (approvedRecord.status === "blocked"
        ? "Veröffentlichungsfreigabe blockiert, bis alle Public- und Review-Blocker geschlossen sind."
        : "Veröffentlichungsfreigabe erteilt. Öffentlich wird der Raum erst durch den expliziten Publish-Schritt."),
    blockers: approvedRecord.blockers,
    status: approvedRecord.status,
    participationSpaceId: approvedRecord.participationSpaceId,
  });
  return approvedRecord;
}

export async function rejectParticipationSpacePublication(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpacePublishRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_publish_record_not_found");
  }

  const rejectedAt = nowIso();
  const rejectedRecord: ParticipationSpacePublishRecord = {
    ...record,
    status: "rejected",
    visibility: "active_internal",
    blockers: [],
    rejectedAt,
    rejectedBy: input.actorUserId,
    auditContext: {
      actorUserId: input.actorUserId,
      reason:
        trimOrNull(input.note) ??
        "Veröffentlichung für Beteiligungsraum im Review abgelehnt.",
      origin: "admin_review",
      approvedAt: record.auditContext.approvedAt,
    },
    updatedAt: rejectedAt,
  };

  await savePublishRecord(rejectedRecord);
  await updateRuntimeRecordVisibility({
    sourceHandoffId: input.sourceHandoffId,
    visibility: "active_internal",
  });
  await recordPublishAudit(input.sourceHandoffId, {
    at: rejectedAt,
    action: "publication_rejected",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Veröffentlichung abgelehnt. Beteiligungsraum bleibt intern sichtbar.",
    blockers: [],
    status: rejectedRecord.status,
    participationSpaceId: rejectedRecord.participationSpaceId,
  });
  return rejectedRecord;
}

export async function publishApprovedParticipationSpace(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getParticipationSpacePublishRecord(input.sourceHandoffId);
  if (!record) {
    throw new Error("participation_space_publish_record_not_found");
  }
  const createdSpace = record.participationSpaceId
    ? await getRepo().getCreatedSpaceById(record.participationSpaceId)
    : null;
  if (!createdSpace) {
    throw new Error("participation_space_missing");
  }

  const result = publishParticipationSpaceAfterReview(record, {
    actorUserId: input.actorUserId,
    reason:
      trimOrNull(input.note) ??
      "Öffentliche Sichtbarkeit wird explizit nach separater Freigabe gesetzt.",
    origin: "participation_space_publish_workflow",
    approvedAt: nowIso(),
  });

  if (!result.ok) {
    const blockedRecord: ParticipationSpacePublishRecord = {
      ...record,
      status: "blocked",
      blockers: result.blockers,
      updatedAt: nowIso(),
    };
    await savePublishRecord(blockedRecord);
    await recordPublishAudit(input.sourceHandoffId, {
      at: blockedRecord.updatedAt,
      action: "publication_rejected",
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? result.message,
      blockers: result.blockers,
      status: blockedRecord.status,
      participationSpaceId: blockedRecord.participationSpaceId,
    });
    return blockedRecord;
  }

  const publishedRecord: ParticipationSpacePublishRecord = {
    ...result.record,
    spaceStatus: buildSpaceStatusForPublication(result.record),
    updatedAt: result.record.updatedAt,
  };
  const persistedRecord = await savePublishRecord(publishedRecord);
  const updatedSpace = applyPublishRecordToCreatedSpace(
    createdSpace,
    persistedRecord,
  );
  await getRepo().updateCreatedSpace(updatedSpace);
  await updateRuntimeRecordVisibility({
    sourceHandoffId: input.sourceHandoffId,
    visibility: "public",
  });
  await recordPublishAudit(input.sourceHandoffId, {
    at: persistedRecord.updatedAt,
    action: "published_public",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Öffentliche Sichtbarkeit explizit gesetzt. Die öffentliche /beteiligung-Route bleibt bis zum separaten Runtime-Anschluss fixture-basiert.",
    blockers: [],
    status: persistedRecord.status,
    participationSpaceId: persistedRecord.participationSpaceId,
  });
  return persistedRecord;
}
