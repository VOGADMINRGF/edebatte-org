import "server-only";

import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import {
  VOXY_EDITORIAL_AUTONOMY_MODES,
  VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
  VOXY_EDITORIAL_QUALITY_LEVELS,
  type VoxyEditorialAutonomyMode,
  type VoxyEditorialAutonomyPolicy,
  type VoxyEditorialQualityLevel,
} from "./editorialAgentCouncil";

const POLICY_COLLECTION = "voxy_editorial_autonomy_policy";
const POLICY_AUDIT_COLLECTION = "voxy_editorial_autonomy_policy_audit";
const ACTIVE_POLICY_ID = "voxy-editorial-autonomy-active";

export type VoxyEditorialAutonomyPolicyRecord = {
  policy: VoxyEditorialAutonomyPolicy;
  policyHash: string;
  updatedByUserId: string;
  updatedAt: string;
};

export type VoxyEditorialAutonomyPolicyAudit = {
  auditId: string;
  previousPolicyHash: string;
  nextPolicyHash: string;
  previousRevision: number;
  nextRevision: number;
  changedByUserId: string;
  changedAt: string;
  reason: string;
};

export type VoxyEditorialAutonomyPolicyPatch = {
  qualityLevel?: VoxyEditorialQualityLevel;
  modes?: Partial<Record<keyof VoxyEditorialAutonomyPolicy["modes"], VoxyEditorialAutonomyMode>>;
  minIndependentReviewRuns?: number;
  requiredDistinctModelFamilies?: number;
  maxUnresolvedWarningsForAutonomy?: number;
};

export type VoxyEditorialAutonomyPersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  productionTruth: boolean;
  storeKind: "mongo_collection" | "in_memory";
};

export type VoxyEditorialAutonomyRepository = {
  getActive(): Promise<VoxyEditorialAutonomyPolicyRecord | null>;
  replaceIfRevision(input: {
    expectedRevision: number;
    next: VoxyEditorialAutonomyPolicyRecord;
  }): Promise<boolean>;
  appendAudit(event: VoxyEditorialAutonomyPolicyAudit): Promise<void>;
  listAudit(limit?: number): Promise<VoxyEditorialAutonomyPolicyAudit[]>;
  getPersistenceState(): VoxyEditorialAutonomyPersistenceState;
};

let singleton: VoxyEditorialAutonomyRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function persistenceState(mode: VoxyEditorialAutonomyPersistenceState["mode"]): VoxyEditorialAutonomyPersistenceState {
  const persistent = mode === "persistent_primary";
  return {
    mode,
    productionTruth: persistent,
    storeKind: persistent ? "mongo_collection" : "in_memory",
  };
}

function defaultRecord(): VoxyEditorialAutonomyPolicyRecord {
  return {
    policy: clone(VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY),
    policyHash: stableHash(VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY),
    updatedByUserId: "system:built-in",
    updatedAt: "1970-01-01T00:00:00.000Z",
  };
}

async function ensureIndexes() {
  if (indexesReady) return;
  const audit = await coreCol(POLICY_AUDIT_COLLECTION);
  await audit.createIndex({ changedAt: -1 }).catch(() => undefined);
  indexesReady = true;
}

function createMongoRepository(): VoxyEditorialAutonomyRepository {
  return {
    async getActive() {
      const col = await coreCol<any>(POLICY_COLLECTION);
      const doc = await col.findOne({ _id: ACTIVE_POLICY_ID });
      if (!doc) return null;
      const { _id: _ignored, ...record } = doc;
      return clone(record as VoxyEditorialAutonomyPolicyRecord);
    },
    async replaceIfRevision({ expectedRevision, next }) {
      const col = await coreCol<any>(POLICY_COLLECTION);
      if (expectedRevision === 0) {
        const existing = await col.findOne({ _id: ACTIVE_POLICY_ID });
        if (existing) return false;
        try {
          await col.insertOne({ _id: ACTIVE_POLICY_ID, ...clone(next) });
          return true;
        } catch {
          return false;
        }
      }
      const result = await col.updateOne(
        { _id: ACTIVE_POLICY_ID, "policy.policyRevision": expectedRevision },
        { $set: { ...clone(next) } },
      );
      return result.modifiedCount === 1;
    },
    async appendAudit(event) {
      await ensureIndexes();
      const col = await coreCol<any>(POLICY_AUDIT_COLLECTION);
      await col.updateOne(
        { _id: event.auditId },
        { $set: { _id: event.auditId, ...clone(event) } },
        { upsert: true },
      );
    },
    async listAudit(limit = 50) {
      await ensureIndexes();
      const col = await coreCol<any>(POLICY_AUDIT_COLLECTION);
      const docs = await col.find({}).sort({ changedAt: -1 }).limit(Math.max(1, Math.min(200, limit))).toArray();
      return docs.map((doc) => {
        const { _id: _ignored, ...event } = doc;
        return clone(event as VoxyEditorialAutonomyPolicyAudit);
      });
    },
    getPersistenceState() {
      return persistenceState("persistent_primary");
    },
  };
}

function createInMemoryRepository(): VoxyEditorialAutonomyRepository {
  let active: VoxyEditorialAutonomyPolicyRecord | null = null;
  const audit: VoxyEditorialAutonomyPolicyAudit[] = [];
  return {
    async getActive() {
      return active ? clone(active) : null;
    },
    async replaceIfRevision({ expectedRevision, next }) {
      const currentRevision = active?.policy.policyRevision ?? 0;
      if (currentRevision !== expectedRevision) return false;
      active = clone(next);
      return true;
    },
    async appendAudit(event) {
      if (!audit.some((entry) => entry.auditId === event.auditId)) audit.unshift(clone(event));
    },
    async listAudit(limit = 50) {
      return clone(audit.slice(0, Math.max(1, Math.min(200, limit))));
    },
    getPersistenceState() {
      return persistenceState("in_memory_fallback");
    },
  };
}

export function getVoxyEditorialAutonomyRepository(): VoxyEditorialAutonomyRepository {
  if (!singleton) {
    singleton = shouldUseInMemoryMongoFallback()
      ? createInMemoryRepository()
      : createMongoRepository();
  }
  return singleton;
}

export function setVoxyEditorialAutonomyRepositoryForTests(
  repository: VoxyEditorialAutonomyRepository | null,
) {
  singleton = repository;
  indexesReady = false;
}

export async function getEffectiveVoxyEditorialAutonomyPolicy(
  repository = getVoxyEditorialAutonomyRepository(),
): Promise<{ record: VoxyEditorialAutonomyPolicyRecord; configured: boolean }> {
  const record = await repository.getActive();
  return record ? { record, configured: true } : { record: defaultRecord(), configured: false };
}

function validatePatch(patch: VoxyEditorialAutonomyPolicyPatch) {
  if (patch.qualityLevel && !VOXY_EDITORIAL_QUALITY_LEVELS.includes(patch.qualityLevel)) {
    throw new Error("voxy_autonomy_quality_level_invalid");
  }
  for (const mode of Object.values(patch.modes ?? {})) {
    if (!VOXY_EDITORIAL_AUTONOMY_MODES.includes(mode)) {
      throw new Error("voxy_autonomy_mode_invalid");
    }
  }
  if (
    patch.minIndependentReviewRuns !== undefined &&
    (!Number.isInteger(patch.minIndependentReviewRuns) ||
      patch.minIndependentReviewRuns < 3 ||
      patch.minIndependentReviewRuns > 32)
  ) {
    throw new Error("voxy_autonomy_review_run_floor_invalid");
  }
  if (
    patch.requiredDistinctModelFamilies !== undefined &&
    (!Number.isInteger(patch.requiredDistinctModelFamilies) ||
      patch.requiredDistinctModelFamilies < 1 ||
      patch.requiredDistinctModelFamilies > 4)
  ) {
    throw new Error("voxy_autonomy_model_family_floor_invalid");
  }
  if (
    patch.maxUnresolvedWarningsForAutonomy !== undefined &&
    (!Number.isInteger(patch.maxUnresolvedWarningsForAutonomy) ||
      patch.maxUnresolvedWarningsForAutonomy < 0 ||
      patch.maxUnresolvedWarningsForAutonomy > 20)
  ) {
    throw new Error("voxy_autonomy_warning_budget_invalid");
  }
}

export async function updateVoxyEditorialAutonomyPolicy(input: {
  expectedRevision: number;
  patch: VoxyEditorialAutonomyPolicyPatch;
  changedByUserId: string;
  reason: string;
  now?: string;
  repository?: VoxyEditorialAutonomyRepository;
}) {
  validatePatch(input.patch);
  const actor = input.changedByUserId.trim();
  const reason = input.reason.trim();
  if (!actor) throw new Error("voxy_autonomy_actor_missing");
  if (!reason) throw new Error("voxy_autonomy_change_reason_missing");
  const repository = input.repository ?? getVoxyEditorialAutonomyRepository();
  const current = await getEffectiveVoxyEditorialAutonomyPolicy(repository);
  const currentRevision = current.configured ? current.record.policy.policyRevision : 0;
  if (currentRevision !== input.expectedRevision) throw new Error("voxy_autonomy_revision_conflict");

  const nextPolicy: VoxyEditorialAutonomyPolicy = {
    ...current.record.policy,
    policyRevision: currentRevision + 1,
    qualityLevel: input.patch.qualityLevel ?? current.record.policy.qualityLevel,
    modes: {
      ...current.record.policy.modes,
      ...(input.patch.modes ?? {}),
    },
    minIndependentReviewRuns:
      input.patch.minIndependentReviewRuns ?? current.record.policy.minIndependentReviewRuns,
    requiredDistinctModelFamilies:
      input.patch.requiredDistinctModelFamilies ?? current.record.policy.requiredDistinctModelFamilies,
    maxUnresolvedWarningsForAutonomy:
      input.patch.maxUnresolvedWarningsForAutonomy ?? current.record.policy.maxUnresolvedWarningsForAutonomy,
    // Hard safety/traceability invariants are intentionally not patchable in Admin.
    jobOverridesAllowed: true,
    learningMode: "propose_validate_promote",
    requireExactInputFingerprint: true,
    requireCreatorReviewerSeparation: true,
    requireObjectionDefense: true,
    requireCriticalHumanEscalation: true,
  };
  const changedAt = input.now ?? new Date().toISOString();
  const next: VoxyEditorialAutonomyPolicyRecord = {
    policy: nextPolicy,
    policyHash: stableHash(nextPolicy),
    updatedByUserId: actor,
    updatedAt: changedAt,
  };
  const replaced = await repository.replaceIfRevision({
    expectedRevision: currentRevision,
    next,
  });
  if (!replaced) throw new Error("voxy_autonomy_revision_conflict");

  const audit: VoxyEditorialAutonomyPolicyAudit = {
    auditId: `voxy-autonomy-audit-${stableHash({ previous: current.record.policyHash, next: next.policyHash, actor, changedAt, reason }).slice(0, 32)}`,
    previousPolicyHash: current.record.policyHash,
    nextPolicyHash: next.policyHash,
    previousRevision: currentRevision,
    nextRevision: nextPolicy.policyRevision,
    changedByUserId: actor,
    changedAt,
    reason,
  };
  await repository.appendAudit(audit);
  return { record: next, audit };
}
