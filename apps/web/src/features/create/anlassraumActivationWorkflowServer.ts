import { ObjectId, coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { anlassraumCol, outputSeedCol } from "@features/anlassraum/db";
import type { AnlassraumDoc, OutputSeedDoc } from "@features/anlassraum/types";
import {
  activateAnlassraumAfterReview,
  approveAnlassraumActivation as approveAnlassraumActivationRecord,
  approveAnlassraumPublication as approveAnlassraumPublicationRecord,
  buildAnlassraumActivationDraft,
  getAnlassraumActivationBlockers,
  isAnlassraumPubliclyReleased,
  publishAnlassraumAfterReview,
  rejectAnlassraumActivation as rejectAnlassraumActivationRecord,
  rejectAnlassraumPublication as rejectAnlassraumPublicationRecord,
  reviewAnlassraumQuestionGuard as reviewAnlassraumQuestionGuardRecord,
  type AnlassraumActivationAuditContext,
  type AnlassraumActivationAuditEntry,
  type AnlassraumActivationRecord,
} from "@/features/create/anlassraumActivationWorkflow";
import {
  getAnlassraumRuntimeRecord,
  listAnlassraumRuntimeRecords,
  syncAnlassraumRuntimeVisibility,
} from "@/features/create/anlassraumRuntimeServer";
import type { AnlassraumRuntimeRecord } from "@/features/create/anlassraumRuntime";
import {
  holdQuestionGuardForSerializedReview,
  normalizeWorkflowRecordVersion,
  persistQuestionGuardReviewFailClosed,
} from "@/features/create/safety/questionGuardReviewPersistence";
import type { PublicQuestionActorContext } from "@/features/create/safety/publicQuestionGeneralization";

export type AnlassraumActivationWorkflowPersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  label: string;
  summary: string;
  repositoryInterface: "AnlassraumActivationWorkflowRepository";
  storeKind: "mongo_collection" | "in_memory";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
  publicRouteRuntime: "runtime_wired";
};

export type AnlassraumActivationWorkflowRepository = {
  get(sourceHandoffId: string): Promise<AnlassraumActivationRecord | null>;
  getByAnlassraumId(
    anlassraumId: string,
  ): Promise<AnlassraumActivationRecord | null>;
  save(record: AnlassraumActivationRecord): Promise<AnlassraumActivationRecord>;
  compareAndSwap(input: {
    record: AnlassraumActivationRecord;
    expectedVersion: number;
  }): Promise<AnlassraumActivationRecord>;
  list(limit?: number): Promise<AnlassraumActivationRecord[]>;
  insertAudit(
    entry: AnlassraumActivationAuditEntry,
  ): Promise<AnlassraumActivationAuditEntry>;
  listAudits(params?: {
    sourceHandoffId?: string | null;
    limit?: number;
  }): Promise<AnlassraumActivationAuditEntry[]>;
  getPersistenceState(): AnlassraumActivationWorkflowPersistenceState;
};

const ACTIVATION_COLLECTION = "anlassraum_activation_records";
const AUDIT_COLLECTION = "anlassraum_activation_audits";

let repoSingleton: AnlassraumActivationWorkflowRepository | null = null;

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function trimOrNull(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function buildPersistenceState(
  mode: AnlassraumActivationWorkflowPersistenceState["mode"],
): AnlassraumActivationWorkflowPersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    label: persistent
      ? "Persistenter Anlassraum-Aktivierungs-/Publish-Workflow"
      : "In-Memory-Fallback für Anlassraum-Aktivierungs-/Publish-Workflow",
    summary: persistent
      ? "Aktivierungs- und Veröffentlichungsfreigaben liegen dauerhaft vor. Öffentliche Sichtbarkeit entsteht nur nach expliziter Freigabe, Audit und Guardrail-Prüfung; die öffentliche /runden-Lesart liest veröffentlichte Runtime-Anlassräume read-only."
      : "Nur Dev-/Test-Fallback: Aktivierungs- und Veröffentlichungszustände leben pro Runtime und sind keine belastbare Produktionswahrheit.",
    repositoryInterface: "AnlassraumActivationWorkflowRepository",
    storeKind: persistent ? "mongo_collection" : "in_memory",
    productionTruth: persistent,
    restartReconstructable: persistent,
    deploymentReconstructable: persistent,
    publicRouteRuntime: "runtime_wired",
  };
}

function getRepo() {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemoryAnlassraumActivationWorkflowRepository()
    : createMongoAnlassraumActivationWorkflowRepository();
  return repoSingleton;
}

export function setAnlassraumActivationWorkflowRepositoryForTests(
  repo: AnlassraumActivationWorkflowRepository | null,
) {
  repoSingleton = repo;
}

function activationRecordId(sourceHandoffId: string) {
  return `anlassraum-activation:${stableHash(String(sourceHandoffId).trim()).slice(0, 18)}`;
}

function auditIdFor(input: {
  sourceHandoffId: string;
  action: AnlassraumActivationAuditEntry["action"];
  at: string;
}) {
  return `anlassraum-activation-audit-${stableHash(
    `${input.sourceHandoffId}:${input.action}:${input.at}`,
  ).slice(0, 22)}`;
}

export function createInMemoryAnlassraumActivationWorkflowRepository(): AnlassraumActivationWorkflowRepository {
  const records = new Map<string, AnlassraumActivationRecord>();
  const audits = new Map<string, AnlassraumActivationAuditEntry>();
  return {
    async get(sourceHandoffId) {
      const record = records.get(sourceHandoffId);
      return record ? clone(record) : null;
    },
    async getByAnlassraumId(anlassraumId) {
      const record = Array.from(records.values()).find(
        (candidate) => candidate.anlassraumId === anlassraumId,
      );
      return record ? clone(record) : null;
    },
    async save(record) {
      records.set(record.sourceHandoffId, clone(record));
      return clone(record);
    },
    async compareAndSwap(input) {
      const current = records.get(input.record.sourceHandoffId);
      const currentVersion = normalizeWorkflowRecordVersion(current?.version);
      if (
        (current && currentVersion !== input.expectedVersion) ||
        (!current && input.expectedVersion !== 0)
      ) {
        throw new Error("anlassraum_activation_state_conflict");
      }
      const nextRecord = {
        ...input.record,
        version: input.expectedVersion + 1,
      };
      records.set(nextRecord.sourceHandoffId, clone(nextRecord));
      return clone(nextRecord);
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
        .filter((entry) =>
          params?.sourceHandoffId
            ? entry.sourceHandoffId === params.sourceHandoffId
            : true,
        )
        .sort((left, right) => right.at.localeCompare(left.at));
      return (typeof params?.limit === "number" ? list.slice(0, params.limit) : list).map(
        clone,
      );
    },
    getPersistenceState() {
      return buildPersistenceState("in_memory_fallback");
    },
  };
}

function createMongoAnlassraumActivationWorkflowRepository(): AnlassraumActivationWorkflowRepository {
  return {
    async get(sourceHandoffId) {
      const col = await coreCol<{ _id: string; record: AnlassraumActivationRecord }>(
        ACTIVATION_COLLECTION,
      );
      const doc = await col.findOne({ _id: activationRecordId(sourceHandoffId) } as any);
      return doc?.record ? clone(doc.record) : null;
    },
    async getByAnlassraumId(anlassraumId) {
      const col = await coreCol<{ _id: string; record: AnlassraumActivationRecord }>(
        ACTIVATION_COLLECTION,
      );
      const doc = await col.findOne({ anlassraumId } as any);
      return doc?.record ? clone(doc.record) : null;
    },
    async save(record) {
      const col = await coreCol<{ _id: string; record: AnlassraumActivationRecord }>(
        ACTIVATION_COLLECTION,
      );
      await col.updateOne(
        { _id: activationRecordId(record.sourceHandoffId) } as any,
        {
          $set: {
            record: clone(record),
            sourceHandoffId: record.sourceHandoffId,
            anlassraumId: record.anlassraumId,
            status: record.status,
            visibility: record.visibility,
            publicAccessMode: record.publicAccessMode,
            updatedAt: record.updatedAt,
          } as any,
        },
        { upsert: true },
      );
      return clone(record);
    },
    async compareAndSwap(input) {
      const expectedVersion = normalizeWorkflowRecordVersion(
        input.expectedVersion,
      );
      const nextRecord = {
        ...input.record,
        version: expectedVersion + 1,
      };
      const col = await coreCol<{
        _id: string;
        record: AnlassraumActivationRecord;
      }>(ACTIVATION_COLLECTION);
      try {
        const result = await col.updateOne(
          {
            _id: activationRecordId(input.record.sourceHandoffId),
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
              anlassraumId: nextRecord.anlassraumId,
              status: nextRecord.status,
              visibility: nextRecord.visibility,
              publicAccessMode: nextRecord.publicAccessMode,
              updatedAt: nextRecord.updatedAt,
              version: nextRecord.version,
            } as any,
          },
          { upsert: expectedVersion === 0 },
        );
        if (result.modifiedCount + result.upsertedCount !== 1) {
          throw new Error("anlassraum_activation_state_conflict");
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "anlassraum_activation_state_conflict"
        ) {
          throw error;
        }
        if ((error as { code?: number })?.code === 11000) {
          throw new Error("anlassraum_activation_state_conflict");
        }
        throw error;
      }
      return clone(nextRecord);
    },
    async list(limit) {
      const col = await coreCol<{ _id: string; record: AnlassraumActivationRecord }>(
        ACTIVATION_COLLECTION,
      );
      const cursor = col.find({} as any).sort({ updatedAt: -1 });
      if (typeof limit === "number") cursor.limit(limit);
      const docs = await cursor.toArray();
      return docs
        .map((doc) => clone(doc.record))
        .filter((record): record is AnlassraumActivationRecord => Boolean(record));
    },
    async insertAudit(entry) {
      const col = await coreCol<AnlassraumActivationAuditEntry>(AUDIT_COLLECTION);
      await col.updateOne({ id: entry.id } as any, { $set: clone(entry) as any }, { upsert: true });
      return clone(entry);
    },
    async listAudits(params) {
      const col = await coreCol<AnlassraumActivationAuditEntry>(AUDIT_COLLECTION);
      const filter: Record<string, unknown> = {};
      if (params?.sourceHandoffId) filter.sourceHandoffId = params.sourceHandoffId;
      const cursor = col.find(filter as any).sort({ at: -1 });
      if (typeof params?.limit === "number") cursor.limit(params.limit);
      const docs = await cursor.toArray();
      return docs.map(clone);
    },
    getPersistenceState() {
      return buildPersistenceState("persistent_primary");
    },
  };
}

function hasRuntimeCreatedAudit(record: AnlassraumRuntimeRecord) {
  return record.auditTrail.some((entry) => entry.action === "runtime_created");
}

async function recordAudit(
  sourceHandoffId: string,
  entry: Omit<AnlassraumActivationAuditEntry, "id" | "sourceHandoffId">,
) {
  const auditEntry: AnlassraumActivationAuditEntry = {
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

async function getCreatedRoomById(
  anlassraumId: string,
): Promise<AnlassraumDoc | null> {
  if (!ObjectId.isValid(anlassraumId)) return null;
  return (await anlassraumCol()).findOne({ _id: new ObjectId(anlassraumId) } as any);
}

function buildDraftAudit(
  sourceHandoffId: string,
  draft: AnlassraumActivationRecord,
): AnlassraumActivationAuditEntry {
  return {
    id: `anlassraum-activation-derived-${sourceHandoffId}`,
    sourceHandoffId,
    anlassraumId: draft.anlassraumId,
    at: draft.updatedAt,
    action: "activation_requested",
    actorUserId: draft.auditContext.actorUserId,
    note:
      "Anlassraum-Aktivierungsworkflow aus bestehender Runtime abgeleitet. Erstellung bleibt von Aktivierung und Veröffentlichung getrennt.",
    blockers: draft.blockers,
    status: draft.status,
  };
}

async function buildAnlassraumActivationRecord(
  runtimeRecord: AnlassraumRuntimeRecord,
): Promise<AnlassraumActivationRecord | null> {
  if (!runtimeRecord.createdAnlassraumId) return null;

  const [existing, room, audits] = await Promise.all([
    getRepo().get(runtimeRecord.sourceHandoffId),
    getCreatedRoomById(runtimeRecord.createdAnlassraumId),
    getRepo().listAudits({
      sourceHandoffId: runtimeRecord.sourceHandoffId,
      limit: 60,
    }),
  ]);

  const draft = buildAnlassraumActivationDraft({
    version: normalizeWorkflowRecordVersion(existing?.version),
    runtimeRecord,
    createdRoom: room
      ? {
          id: room._id?.toHexString?.() ?? runtimeRecord.createdAnlassraumId,
          slug: room.slug,
          status: room.status,
          isPublic: Boolean(room.isPublic),
          updatedAt: room.updatedAt?.toISOString?.() ?? runtimeRecord.updatedAt,
        }
      : {
          id: runtimeRecord.createdAnlassraumId,
          slug: null,
          status: null,
          isPublic: false,
          updatedAt: runtimeRecord.updatedAt,
        },
    creationAudited: hasRuntimeCreatedAudit(runtimeRecord),
    questionGuard: existing?.questionGuard ?? null,
    status: existing?.status,
    visibility: existing?.visibility,
    publicAccessMode: existing?.publicAccessMode,
    auditContext: existing?.auditContext ?? {
      actorUserId: runtimeRecord.auditContext.actorUserId,
      reason: runtimeRecord.auditContext.reason,
      origin: "admin_review",
      approvedAt: runtimeRecord.auditContext.approvedAt,
    },
    approvedForActivationAt: existing?.approvedForActivationAt,
    approvedForActivationBy: existing?.approvedForActivationBy,
    approvedForPublicationAt: existing?.approvedForPublicationAt,
    approvedForPublicationBy: existing?.approvedForPublicationBy,
    rejectedAt: existing?.rejectedAt,
    rejectedBy: existing?.rejectedBy,
    createdAt: existing?.createdAt ?? runtimeRecord.createdAt,
    updatedAt: existing?.updatedAt ?? room?.updatedAt?.toISOString?.() ?? runtimeRecord.updatedAt,
  });

  return {
    ...draft,
    auditTrail: audits.length > 0 ? audits : [buildDraftAudit(runtimeRecord.sourceHandoffId, draft as AnlassraumActivationRecord)],
    approvedForActivationAt: existing?.approvedForActivationAt ?? null,
    approvedForActivationBy: existing?.approvedForActivationBy ?? null,
    approvedForPublicationAt: existing?.approvedForPublicationAt ?? null,
    approvedForPublicationBy: existing?.approvedForPublicationBy ?? null,
    rejectedAt: existing?.rejectedAt ?? null,
    rejectedBy: existing?.rejectedBy ?? null,
  };
}

async function saveRecord(record: AnlassraumActivationRecord) {
  return getRepo().compareAndSwap({
    record,
    expectedVersion: normalizeWorkflowRecordVersion(record.version),
  });
}

export async function syncAnlassraumRoomVisibility(
  record: AnlassraumActivationRecord,
) {
  if (!record.anlassraumId || !ObjectId.isValid(record.anlassraumId)) return null;
  const col = await anlassraumCol();
  const now = new Date(record.updatedAt || nowIso());
  const workflowVersion = normalizeWorkflowRecordVersion(record.version);
  const published = record.status === "published";
  const status =
    record.questionGuard.releaseState !== "draft_allowed"
      ? "review_required"
      : record.status === "activated" ||
    record.status === "approved_for_publication" ||
    record.status === "published"
      ? "active"
      : record.status === "approved_for_activation"
        ? "approved"
        : undefined;

  const result = await col.updateOne(
    {
      _id: new ObjectId(record.anlassraumId),
      $or: [
        { activationWorkflowSourceHandoffId: { $exists: false } },
        { activationWorkflowSourceHandoffId: null },
        {
          activationWorkflowSourceHandoffId: record.sourceHandoffId,
          $or: [
            { activationWorkflowVersion: { $exists: false } },
            { activationWorkflowVersion: null },
            { activationWorkflowVersion: { $lte: workflowVersion } },
          ],
        },
      ],
    } as any,
    {
      $set: {
        title: record.title,
        summary: record.description,
        updatedAt: now,
        isPublic: published,
        activationWorkflowSourceHandoffId: record.sourceHandoffId,
        activationWorkflowVersion: workflowVersion,
        ...(status ? { status } : {}),
        publishedAt: published ? now : null,
      } as any,
    },
  );
  if (result.matchedCount !== 1) {
    throw new Error("anlassraum_visibility_state_conflict");
  }

  return col.findOne({ _id: new ObjectId(record.anlassraumId) } as any);
}

function buildRoundPublishTarget(slug: string) {
  return `/round/${encodeURIComponent(slug)}`;
}

async function upsertRoundSeed(record: AnlassraumActivationRecord) {
  if (
    record.status !== "published" ||
    !record.anlassraumId ||
    !record.anlassraumSlug ||
    !ObjectId.isValid(record.anlassraumId)
  ) {
    return;
  }

  const col = await outputSeedCol();
  const updatedAt = new Date(record.updatedAt || nowIso());
  const anlassraumObjectId = new ObjectId(record.anlassraumId);
  const seed: OutputSeedDoc = {
    anlassraumId: anlassraumObjectId,
    outputType: "round_seed",
    status: "ready",
    reviewState: "approved",
    targetAudience: "citizens",
    publishTarget: buildRoundPublishTarget(record.anlassraumSlug),
    reviewNote:
      "Explizit veröffentlichter Anlassraum aus separatem Aktivierungs-/Publish-Workflow.",
    lastAction: "published_public",
    lastActionBy: trimOrNull(record.auditContext.actorUserId),
    lastActionAt: updatedAt,
    createdAt: updatedAt,
    updatedAt,
  };

  await col.updateOne(
    { anlassraumId: anlassraumObjectId, outputType: "round_seed" } as any,
    {
      $setOnInsert: seed,
      $set: {
        status: "ready",
        reviewState: "approved",
        targetAudience: "citizens",
        publishTarget: buildRoundPublishTarget(record.anlassraumSlug),
        reviewNote: seed.reviewNote,
        lastAction: seed.lastAction,
        lastActionBy: seed.lastActionBy,
        lastActionAt: updatedAt,
        updatedAt,
      } as any,
    },
    { upsert: true },
  );
}

function buildAuditContext(input: {
  actorUserId: string;
  note?: string | null;
  origin: AnlassraumActivationAuditContext["origin"];
  approvedAt?: string | null;
}): AnlassraumActivationAuditContext {
  return {
    actorUserId: input.actorUserId,
    reason: trimOrNull(input.note),
    origin: input.origin,
    approvedAt: trimOrNull(input.approvedAt) ?? nowIso(),
  };
}

export function getAnlassraumActivationWorkflowPersistenceState() {
  return getRepo().getPersistenceState();
}

export async function listAnlassraumActivationRecords(limit = 40) {
  const runtimeRecords = await listAnlassraumRuntimeRecords(limit * 2);
  const createdRuntimeRecords = runtimeRecords
    .filter((record) => record.status === "created" && record.createdAnlassraumId)
    .slice(0, limit);
  const records = await Promise.all(
    createdRuntimeRecords.map(buildAnlassraumActivationRecord),
  );
  return records
    .filter((record): record is AnlassraumActivationRecord => Boolean(record))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listPublishedAnlassraumActivationRecords(limit = 40) {
  const records = await listAnlassraumActivationRecords(limit * 2);
  return records
    .filter(
      (record) =>
        isAnlassraumPubliclyReleased(record) && Boolean(record.anlassraumId),
    )
    .slice(0, limit);
}

export async function isAnlassraumPublicInputAllowed(input: {
  anlassraumId: string;
  roomIsPublic: boolean;
  roomStatus?: string | null;
  roomPublishedAt?: Date | string | null;
  roomReviewedBy?: string | null;
  roomApprovedBy?: string | null;
  activationWorkflowSourceHandoffId?: string | null;
}) {
  if (!input.roomIsPublic) return false;
  const workflowRecord = await getRepo().getByAnlassraumId(input.anlassraumId);
  if (workflowRecord) return isAnlassraumPubliclyReleased(workflowRecord);

  // Established governance publications predate the activation workflow. A
  // room may use that canonical transition only while no activation-workflow
  // ownership marker exists. Once the new guard owns it, missing workflow
  // state remains fail-closed.
  if (trimOrNull(input.activationWorkflowSourceHandoffId)) return false;
  const status = trimOrNull(input.roomStatus);
  return (
    (status === "active" || status === "published") &&
    Boolean(input.roomPublishedAt) &&
    Boolean(trimOrNull(input.roomReviewedBy)) &&
    Boolean(trimOrNull(input.roomApprovedBy))
  );
}

export async function getAnlassraumActivationRecord(sourceHandoffId: string) {
  const runtimeRecord = await getAnlassraumRuntimeRecord(sourceHandoffId);
  if (!runtimeRecord || runtimeRecord.status !== "created") return null;
  return buildAnlassraumActivationRecord(runtimeRecord);
}

export async function listAnlassraumActivationAudits(params?: {
  sourceHandoffId?: string | null;
  limit?: number;
}) {
  return getRepo().listAudits(params);
}

export async function approveAnlassraumActivation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getAnlassraumActivationRecord(input.sourceHandoffId);
  if (!record) throw new Error("anlassraum_activation_record_not_found");

  const updated = approveAnlassraumActivationRecord(
    record,
    buildAuditContext({
      actorUserId: input.actorUserId,
      note:
        trimOrNull(input.note) ??
        "Aktivierung im bestehenden Admin-Review explizit freigegeben.",
      origin: "admin_review",
    }),
  );

  await saveRecord(updated);
  await recordAudit(input.sourceHandoffId, {
    at: updated.updatedAt,
    action: updated.status === "blocked" ? "activation_requested" : "activation_approved",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      (updated.status === "blocked"
        ? "Aktivierungsfreigabe bleibt blockiert, bis offene Guardrails geklärt sind."
        : "Aktivierung freigegeben. Öffentliche Sichtbarkeit bleibt weiterhin aus."),
    blockers: updated.blockers,
    status: updated.status,
    anlassraumId: updated.anlassraumId,
  });
  return updated;
}

export async function reviewAnlassraumQuestionGuard(input: {
  sourceHandoffId: string;
  actorUserId: string;
  actorExtractionSource: "entity_registry" | "actor_graph" | "human_review";
  evidenceRefs: string[];
  actorContexts?: PublicQuestionActorContext[];
  noNamedActorsConfirmed?: boolean;
  note?: string | null;
}) {
  const record = await getAnlassraumActivationRecord(input.sourceHandoffId);
  if (!record) throw new Error("anlassraum_activation_record_not_found");

  const reviewedAt = nowIso();
  const reviewedRecord = reviewAnlassraumQuestionGuardRecord(record, {
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
    anlassraumId: reviewedRecord.anlassraumId,
    questionGuardReleaseState: reviewedRecord.questionGuard.releaseState,
    questionGuardActorExtractionSource: input.actorExtractionSource,
    questionGuardEvidenceRefs:
      reviewedRecord.questionGuard.actorExtraction.evidenceRefs,
    questionGuardActorContexts: reviewedRecord.questionGuard.actorContexts,
    questionGuardHumanReviewFinding:
      reviewedRecord.questionGuard.actorExtraction.humanReviewFinding ?? null,
  } satisfies Omit<
    AnlassraumActivationAuditEntry,
    "id" | "sourceHandoffId"
  >;

  const reviewReservationDraft: AnlassraumActivationRecord = {
    ...reviewedRecord,
    questionGuard: holdQuestionGuardForSerializedReview(record.questionGuard),
  };
  const reviewReservation: AnlassraumActivationRecord = {
    ...reviewReservationDraft,
    blockers: getAnlassraumActivationBlockers(reviewReservationDraft),
  };

  return persistQuestionGuardReviewFailClosed({
    reviewReservation,
    auditEntry,
    persistAudit: (entry) => recordAudit(input.sourceHandoffId, entry),
    persistRecord: saveRecord,
    afterReservation: (reservation) =>
      syncAnlassraumRoomVisibility(reservation),
    buildReleasedRecord: (reservation) => ({
      ...reviewedRecord,
      version: reservation.version,
    }),
  });
}

export async function rejectAnlassraumActivation(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getAnlassraumActivationRecord(input.sourceHandoffId);
  if (!record) throw new Error("anlassraum_activation_record_not_found");

  const updated = rejectAnlassraumActivationRecord(
    record,
    buildAuditContext({
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? "Aktivierung im Review zurückgewiesen.",
      origin: "admin_review",
    }),
  );

  await saveRecord(updated);
  await recordAudit(input.sourceHandoffId, {
    at: updated.updatedAt,
    action: "activation_rejected",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Aktivierung abgelehnt. Kein interner Go-Live und keine Veröffentlichung wurden ausgelöst.",
    blockers: [],
    status: updated.status,
    anlassraumId: updated.anlassraumId,
  });
  return updated;
}

export async function activateApprovedAnlassraum(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getAnlassraumActivationRecord(input.sourceHandoffId);
  if (!record) throw new Error("anlassraum_activation_record_not_found");

  const result = activateAnlassraumAfterReview(
    record,
    buildAuditContext({
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? "Anlassraum intern aktiviert.",
      origin: "anlassraum_activation_workflow",
    }),
  );

  if ("error" in result) {
    const updated = result.record;
    await saveRecord(updated);
    await recordAudit(input.sourceHandoffId, {
      at: updated.updatedAt,
      action: "activation_requested",
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? result.message,
      blockers: result.blockers,
      status: updated.status,
      anlassraumId: updated.anlassraumId,
    });
    return updated;
  }

  const updated = await saveRecord(result.record);

  await syncAnlassraumRuntimeVisibility({
    sourceHandoffId: input.sourceHandoffId,
    visibility: "active_internal",
  });
  await syncAnlassraumRoomVisibility(updated);
  await recordAudit(input.sourceHandoffId, {
    at: updated.updatedAt,
    action: "activated_internal",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Anlassraum intern aktiviert. Öffentliche Sichtbarkeit bleibt weiter getrennt.",
    blockers: updated.blockers,
    status: updated.status,
    anlassraumId: updated.anlassraumId,
  });
  return updated;
}

export async function approveAnlassraumPublication(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getAnlassraumActivationRecord(input.sourceHandoffId);
  if (!record) throw new Error("anlassraum_activation_record_not_found");

  const updated = approveAnlassraumPublicationRecord(
    record,
    buildAuditContext({
      actorUserId: input.actorUserId,
      note:
        trimOrNull(input.note) ??
        "Veröffentlichung im bestehenden Admin-Review explizit freigegeben.",
      origin: "admin_review",
    }),
  );

  await saveRecord(updated);
  await recordAudit(input.sourceHandoffId, {
    at: updated.updatedAt,
    action:
      updated.status === "blocked" ? "publication_requested" : "publication_approved",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      (updated.status === "blocked"
        ? "Veröffentlichungsfreigabe bleibt blockiert, bis Public-Review-Blocker geklärt sind."
        : "Veröffentlichung freigegeben. Öffentliche Sichtbarkeit bleibt bis zum finalen Publish-Schritt aus."),
    blockers: updated.blockers,
    status: updated.status,
    anlassraumId: updated.anlassraumId,
  });
  return updated;
}

export async function rejectAnlassraumPublication(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getAnlassraumActivationRecord(input.sourceHandoffId);
  if (!record) throw new Error("anlassraum_activation_record_not_found");

  const updated = rejectAnlassraumPublicationRecord(
    record,
    buildAuditContext({
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? "Veröffentlichung im Review zurückgewiesen.",
      origin: "admin_review",
    }),
  );

  await saveRecord(updated);
  await recordAudit(input.sourceHandoffId, {
    at: updated.updatedAt,
    action: "publication_rejected",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Veröffentlichung abgelehnt. Anlassraum bleibt intern oder review-only.",
    blockers: [],
    status: updated.status,
    anlassraumId: updated.anlassraumId,
  });
  return updated;
}

export async function publishApprovedAnlassraum(input: {
  sourceHandoffId: string;
  actorUserId: string;
  note?: string | null;
}) {
  const record = await getAnlassraumActivationRecord(input.sourceHandoffId);
  if (!record) throw new Error("anlassraum_activation_record_not_found");

  const result = publishAnlassraumAfterReview(
    record,
    buildAuditContext({
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? "Anlassraum öffentlich freigegeben.",
      origin: "anlassraum_activation_workflow",
    }),
  );

  if ("error" in result) {
    const updated = result.record;
    await saveRecord(updated);
    await recordAudit(input.sourceHandoffId, {
      at: updated.updatedAt,
      action: "publication_requested",
      actorUserId: input.actorUserId,
      note: trimOrNull(input.note) ?? result.message,
      blockers: result.blockers,
      status: updated.status,
      anlassraumId: updated.anlassraumId,
    });
    return updated;
  }

  const updated = await saveRecord(result.record);

  await syncAnlassraumRuntimeVisibility({
    sourceHandoffId: input.sourceHandoffId,
    visibility: "published",
  });
  await syncAnlassraumRoomVisibility(updated);
  await upsertRoundSeed(updated);
  await recordAudit(input.sourceHandoffId, {
    at: updated.updatedAt,
    action: "published_public",
    actorUserId: input.actorUserId,
    note:
      trimOrNull(input.note) ??
      "Anlassraum explizit veröffentlicht. Öffentliche Sichtbarkeit bleibt read-only und auditierbar.",
    blockers: [],
    status: updated.status,
    anlassraumId: updated.anlassraumId,
  });
  return updated;
}
