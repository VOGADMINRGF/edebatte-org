import "server-only";

import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import type { VoxyEditorialCouncilRoleId } from "./editorialAgentCouncil";

export const VOXY_AGENT_LEARNING_VERSION = "voxy-agent-learning-v1" as const;
export const VOXY_AGENT_LEARNING_STATUSES = [
  "proposed",
  "validated",
  "promoted",
  "rejected",
  "rolled_back",
] as const;
export type VoxyAgentLearningStatus = (typeof VOXY_AGENT_LEARNING_STATUSES)[number];

export type VoxyAgentLearningValidation = {
  evaluationSetVersion: string;
  historicalCases: number;
  passedCases: number;
  failedCases: number;
  shadowRuns: number;
  regressions: number;
  criticalRegressions: number;
  summary: string;
  validatedAt: string;
  validatedByActorId: string;
};

export type VoxyAgentLearningRecord = {
  version: typeof VOXY_AGENT_LEARNING_VERSION;
  lessonId: string;
  revision: number;
  roleId: VoxyEditorialCouncilRoleId;
  category: string;
  sourceDecisionId: string;
  sourceRunIds: string[];
  observedFailure: string;
  proposedRuleChange: string;
  evidenceRefs: string[];
  status: VoxyAgentLearningStatus;
  validation: VoxyAgentLearningValidation | null;
  promotedInstructionVersion: string | null;
  createdByActorId: string;
  createdAt: string;
  updatedByActorId: string;
  updatedAt: string;
};

export type VoxyAgentLearningAuditEvent = {
  eventId: string;
  lessonId: string;
  action: "proposed" | "validated" | "promoted" | "rejected" | "rolled_back";
  previousStatus: VoxyAgentLearningStatus | null;
  nextStatus: VoxyAgentLearningStatus;
  byActorId: string;
  at: string;
  reason: string;
  recordRevision: number;
};

export type VoxyAgentLearningRepository = {
  create(record: VoxyAgentLearningRecord): Promise<VoxyAgentLearningRecord>;
  get(lessonId: string): Promise<VoxyAgentLearningRecord | null>;
  list(input?: {
    roleId?: VoxyEditorialCouncilRoleId | null;
    status?: VoxyAgentLearningStatus | null;
    limit?: number;
  }): Promise<VoxyAgentLearningRecord[]>;
  replaceIfRevision(input: {
    lessonId: string;
    expectedRevision: number;
    next: VoxyAgentLearningRecord;
  }): Promise<boolean>;
  appendAudit(event: VoxyAgentLearningAuditEvent): Promise<void>;
  listAudit(lessonId: string): Promise<VoxyAgentLearningAuditEvent[]>;
  getPersistenceState(): {
    mode: "persistent_primary" | "in_memory_fallback";
    productionTruth: boolean;
    storeKind: "mongo_collection" | "in_memory";
  };
};

const RECORDS_COLLECTION = "voxy_editorial_agent_learning";
const AUDIT_COLLECTION = "voxy_editorial_agent_learning_audit";
let singleton: VoxyAgentLearningRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalize(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values.map(normalize).filter(Boolean)));
}

function requireActor(value: string) {
  const actor = normalize(value);
  if (!actor) throw new Error("voxy_learning_actor_missing");
  return actor;
}

function requireHumanPromotionActor(value: string) {
  const actor = requireActor(value);
  if (actor.startsWith("agent:")) {
    throw new Error("voxy_learning_self_promotion_forbidden");
  }
  return actor;
}

async function ensureIndexes() {
  if (indexesReady) return;
  const [records, audit] = await Promise.all([
    coreCol(RECORDS_COLLECTION),
    coreCol(AUDIT_COLLECTION),
  ]);
  await Promise.all([
    records.createIndex({ roleId: 1, status: 1, updatedAt: -1 }),
    records.createIndex({ sourceDecisionId: 1, updatedAt: -1 }),
    audit.createIndex({ lessonId: 1, at: -1 }),
  ]).catch(() => undefined);
  indexesReady = true;
}

function createMongoRepository(): VoxyAgentLearningRepository {
  return {
    async create(record) {
      await ensureIndexes();
      const col = await coreCol<any>(RECORDS_COLLECTION);
      try {
        await col.insertOne({ _id: record.lessonId, ...clone(record) });
        return clone(record);
      } catch (error) {
        const existing = await col.findOne({ _id: record.lessonId });
        if (!existing) throw error;
        const { _id: _ignored, ...value } = existing;
        return clone(value as VoxyAgentLearningRecord);
      }
    },
    async get(lessonId) {
      await ensureIndexes();
      const col = await coreCol<any>(RECORDS_COLLECTION);
      const doc = await col.findOne({ _id: lessonId });
      if (!doc) return null;
      const { _id: _ignored, ...value } = doc;
      return clone(value as VoxyAgentLearningRecord);
    },
    async list(input = {}) {
      await ensureIndexes();
      const col = await coreCol<any>(RECORDS_COLLECTION);
      const query: Record<string, unknown> = {};
      if (input.roleId) query.roleId = input.roleId;
      if (input.status) query.status = input.status;
      const docs = await col
        .find(query)
        .sort({ updatedAt: -1 })
        .limit(Math.max(1, Math.min(200, input.limit ?? 100)))
        .toArray();
      return docs.map((doc) => {
        const { _id: _ignored, ...value } = doc;
        return clone(value as VoxyAgentLearningRecord);
      });
    },
    async replaceIfRevision({ lessonId, expectedRevision, next }) {
      await ensureIndexes();
      const col = await coreCol<any>(RECORDS_COLLECTION);
      const result = await col.updateOne(
        { _id: lessonId, revision: expectedRevision },
        { $set: { ...clone(next) } },
      );
      return result.modifiedCount === 1;
    },
    async appendAudit(event) {
      await ensureIndexes();
      const col = await coreCol<any>(AUDIT_COLLECTION);
      await col.updateOne(
        { _id: event.eventId },
        { $set: { _id: event.eventId, ...clone(event) } },
        { upsert: true },
      );
    },
    async listAudit(lessonId) {
      await ensureIndexes();
      const col = await coreCol<any>(AUDIT_COLLECTION);
      const docs = await col.find({ lessonId }).sort({ at: -1 }).toArray();
      return docs.map((doc) => {
        const { _id: _ignored, ...value } = doc;
        return clone(value as VoxyAgentLearningAuditEvent);
      });
    },
    getPersistenceState() {
      return { mode: "persistent_primary", productionTruth: true, storeKind: "mongo_collection" };
    },
  };
}

function createInMemoryRepository(): VoxyAgentLearningRepository {
  const records = new Map<string, VoxyAgentLearningRecord>();
  const audit = new Map<string, VoxyAgentLearningAuditEvent>();
  return {
    async create(record) {
      const existing = records.get(record.lessonId);
      if (existing) return clone(existing);
      records.set(record.lessonId, clone(record));
      return clone(record);
    },
    async get(lessonId) {
      const value = records.get(lessonId);
      return value ? clone(value) : null;
    },
    async list(input = {}) {
      return Array.from(records.values())
        .filter((record) => !input.roleId || record.roleId === input.roleId)
        .filter((record) => !input.status || record.status === input.status)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, Math.max(1, Math.min(200, input.limit ?? 100)))
        .map(clone);
    },
    async replaceIfRevision({ lessonId, expectedRevision, next }) {
      const current = records.get(lessonId);
      if (!current || current.revision !== expectedRevision) return false;
      records.set(lessonId, clone(next));
      return true;
    },
    async appendAudit(event) {
      audit.set(event.eventId, clone(event));
    },
    async listAudit(lessonId) {
      return Array.from(audit.values())
        .filter((event) => event.lessonId === lessonId)
        .sort((a, b) => b.at.localeCompare(a.at))
        .map(clone);
    },
    getPersistenceState() {
      return { mode: "in_memory_fallback", productionTruth: false, storeKind: "in_memory" };
    },
  };
}

export function getVoxyAgentLearningRepository(): VoxyAgentLearningRepository {
  if (!singleton) {
    singleton = shouldUseInMemoryMongoFallback()
      ? createInMemoryRepository()
      : createMongoRepository();
  }
  return singleton;
}

export function setVoxyAgentLearningRepositoryForTests(repository: VoxyAgentLearningRepository | null) {
  singleton = repository;
  indexesReady = false;
}

function auditEvent(input: {
  lessonId: string;
  action: VoxyAgentLearningAuditEvent["action"];
  previousStatus: VoxyAgentLearningStatus | null;
  nextStatus: VoxyAgentLearningStatus;
  byActorId: string;
  at: string;
  reason: string;
  recordRevision: number;
}): VoxyAgentLearningAuditEvent {
  return {
    eventId: `voxy-learning-audit-${stableHash(input).slice(0, 32)}`,
    ...input,
  };
}

export async function proposeVoxyAgentLearning(input: {
  roleId: VoxyEditorialCouncilRoleId;
  category: string;
  sourceDecisionId: string;
  sourceRunIds: string[];
  observedFailure: string;
  proposedRuleChange: string;
  evidenceRefs: string[];
  proposedByActorId: string;
  now?: string;
  repository?: VoxyAgentLearningRepository;
}) {
  const actor = requireActor(input.proposedByActorId);
  const category = normalize(input.category);
  const observedFailure = normalize(input.observedFailure);
  const proposedRuleChange = normalize(input.proposedRuleChange);
  const evidenceRefs = unique(input.evidenceRefs);
  if (!category || !observedFailure || !proposedRuleChange || evidenceRefs.length === 0) {
    throw new Error("voxy_learning_proposal_incomplete");
  }
  const timestamp = input.now ?? new Date().toISOString();
  const lessonId = `voxy-lesson-${stableHash({
    roleId: input.roleId,
    category,
    sourceDecisionId: input.sourceDecisionId,
    observedFailure,
    proposedRuleChange,
    evidenceRefs,
  }).slice(0, 32)}`;
  const record: VoxyAgentLearningRecord = {
    version: VOXY_AGENT_LEARNING_VERSION,
    lessonId,
    revision: 1,
    roleId: input.roleId,
    category,
    sourceDecisionId: normalize(input.sourceDecisionId),
    sourceRunIds: unique(input.sourceRunIds),
    observedFailure,
    proposedRuleChange,
    evidenceRefs,
    status: "proposed",
    validation: null,
    promotedInstructionVersion: null,
    createdByActorId: actor,
    createdAt: timestamp,
    updatedByActorId: actor,
    updatedAt: timestamp,
  };
  const repository = input.repository ?? getVoxyAgentLearningRepository();
  const created = await repository.create(record);
  if (created.revision === 1 && created.createdAt === timestamp) {
    await repository.appendAudit(
      auditEvent({
        lessonId,
        action: "proposed",
        previousStatus: null,
        nextStatus: "proposed",
        byActorId: actor,
        at: timestamp,
        reason: "Learning candidate created from an evidence-bound review/correction.",
        recordRevision: 1,
      }),
    );
  }
  return created;
}

export async function validateVoxyAgentLearning(input: {
  lessonId: string;
  expectedRevision: number;
  validation: Omit<VoxyAgentLearningValidation, "validatedAt" | "validatedByActorId">;
  validatedByActorId: string;
  reason: string;
  now?: string;
  repository?: VoxyAgentLearningRepository;
}) {
  const actor = requireActor(input.validatedByActorId);
  const reason = normalize(input.reason);
  if (!reason) throw new Error("voxy_learning_validation_reason_missing");
  const repository = input.repository ?? getVoxyAgentLearningRepository();
  const current = await repository.get(input.lessonId);
  if (!current) throw new Error("voxy_learning_candidate_missing");
  if (current.revision !== input.expectedRevision) throw new Error("voxy_learning_revision_conflict");
  if (current.status !== "proposed") throw new Error(`voxy_learning_validation_not_allowed:${current.status}`);
  const validation = input.validation;
  if (
    !Number.isInteger(validation.historicalCases) ||
    validation.historicalCases < 20 ||
    validation.passedCases + validation.failedCases !== validation.historicalCases ||
    !Number.isInteger(validation.shadowRuns) ||
    validation.shadowRuns < 50 ||
    validation.regressions < 0 ||
    validation.criticalRegressions < 0 ||
    validation.criticalRegressions > validation.regressions ||
    !normalize(validation.evaluationSetVersion) ||
    !normalize(validation.summary)
  ) {
    throw new Error("voxy_learning_validation_evidence_insufficient");
  }
  const timestamp = input.now ?? new Date().toISOString();
  const passed =
    validation.failedCases === 0 &&
    validation.regressions === 0 &&
    validation.criticalRegressions === 0;
  if (!passed) throw new Error("voxy_learning_validation_regression_detected");
  const next: VoxyAgentLearningRecord = {
    ...current,
    revision: current.revision + 1,
    status: "validated",
    validation: {
      ...validation,
      evaluationSetVersion: normalize(validation.evaluationSetVersion),
      summary: normalize(validation.summary),
      validatedAt: timestamp,
      validatedByActorId: actor,
    },
    updatedByActorId: actor,
    updatedAt: timestamp,
  };
  if (!(await repository.replaceIfRevision({ lessonId: current.lessonId, expectedRevision: current.revision, next }))) {
    throw new Error("voxy_learning_revision_conflict");
  }
  await repository.appendAudit(
    auditEvent({
      lessonId: current.lessonId,
      action: "validated",
      previousStatus: current.status,
      nextStatus: next.status,
      byActorId: actor,
      at: timestamp,
      reason,
      recordRevision: next.revision,
    }),
  );
  return next;
}

export async function promoteVoxyAgentLearning(input: {
  lessonId: string;
  expectedRevision: number;
  promotedInstructionVersion: string;
  promotedByActorId: string;
  reason: string;
  now?: string;
  repository?: VoxyAgentLearningRepository;
}) {
  const actor = requireHumanPromotionActor(input.promotedByActorId);
  const reason = normalize(input.reason);
  const instructionVersion = normalize(input.promotedInstructionVersion);
  if (!reason || !instructionVersion) throw new Error("voxy_learning_promotion_metadata_missing");
  const repository = input.repository ?? getVoxyAgentLearningRepository();
  const current = await repository.get(input.lessonId);
  if (!current) throw new Error("voxy_learning_candidate_missing");
  if (current.revision !== input.expectedRevision) throw new Error("voxy_learning_revision_conflict");
  if (current.status !== "validated" || !current.validation) {
    throw new Error(`voxy_learning_promotion_not_allowed:${current.status}`);
  }
  const timestamp = input.now ?? new Date().toISOString();
  const next: VoxyAgentLearningRecord = {
    ...current,
    revision: current.revision + 1,
    status: "promoted",
    promotedInstructionVersion: instructionVersion,
    updatedByActorId: actor,
    updatedAt: timestamp,
  };
  if (!(await repository.replaceIfRevision({ lessonId: current.lessonId, expectedRevision: current.revision, next }))) {
    throw new Error("voxy_learning_revision_conflict");
  }
  await repository.appendAudit(
    auditEvent({
      lessonId: current.lessonId,
      action: "promoted",
      previousStatus: current.status,
      nextStatus: next.status,
      byActorId: actor,
      at: timestamp,
      reason,
      recordRevision: next.revision,
    }),
  );
  return next;
}

export async function rejectOrRollbackVoxyAgentLearning(input: {
  lessonId: string;
  expectedRevision: number;
  action: "reject" | "rollback";
  changedByActorId: string;
  reason: string;
  now?: string;
  repository?: VoxyAgentLearningRepository;
}) {
  const actor = requireHumanPromotionActor(input.changedByActorId);
  const reason = normalize(input.reason);
  if (!reason) throw new Error("voxy_learning_change_reason_missing");
  const repository = input.repository ?? getVoxyAgentLearningRepository();
  const current = await repository.get(input.lessonId);
  if (!current) throw new Error("voxy_learning_candidate_missing");
  if (current.revision !== input.expectedRevision) throw new Error("voxy_learning_revision_conflict");
  if (input.action === "rollback" && current.status !== "promoted") {
    throw new Error(`voxy_learning_rollback_not_allowed:${current.status}`);
  }
  if (input.action === "reject" && !["proposed", "validated"].includes(current.status)) {
    throw new Error(`voxy_learning_reject_not_allowed:${current.status}`);
  }
  const timestamp = input.now ?? new Date().toISOString();
  const nextStatus: VoxyAgentLearningStatus = input.action === "rollback" ? "rolled_back" : "rejected";
  const next: VoxyAgentLearningRecord = {
    ...current,
    revision: current.revision + 1,
    status: nextStatus,
    updatedByActorId: actor,
    updatedAt: timestamp,
  };
  if (!(await repository.replaceIfRevision({ lessonId: current.lessonId, expectedRevision: current.revision, next }))) {
    throw new Error("voxy_learning_revision_conflict");
  }
  await repository.appendAudit(
    auditEvent({
      lessonId: current.lessonId,
      action: input.action === "rollback" ? "rolled_back" : "rejected",
      previousStatus: current.status,
      nextStatus,
      byActorId: actor,
      at: timestamp,
      reason,
      recordRevision: next.revision,
    }),
  );
  return next;
}
