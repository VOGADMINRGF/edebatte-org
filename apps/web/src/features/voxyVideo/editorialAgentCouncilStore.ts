import "server-only";

import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import type {
  VoxyEditorialCouncilDecision,
  VoxyEditorialCouncilInputBinding,
  VoxyEditorialCouncilRun,
  VoxyEditorialCriticalRiskFlag,
} from "./editorialAgentCouncil";

export type VoxyEditorialCouncilDefenseRecord = {
  defenseRunId: string;
  inputFingerprint: string;
  providerId: string;
  modelId: string;
  publicReasonSummary: string;
  objectionResolutions: Array<{
    objectionId: string;
    state: "resolved" | "disputed" | "escalated";
    defenseSummary: string;
    defenseEvidenceRefs: string[];
    resolutionSummary: string;
  }>;
};

export type VoxyEditorialCouncilAuditArtifact = {
  artifactId: string;
  binding: VoxyEditorialCouncilInputBinding;
  inputFingerprint: string;
  policyRevision: number;
  qualityLevel: string;
  creatorRunId: string | null;
  creatorActorId?: string | null;
  criticRuns: VoxyEditorialCouncilRun[];
  defense: VoxyEditorialCouncilDefenseRecord | null;
  criticalRiskFlags: VoxyEditorialCriticalRiskFlag[];
  decision: VoxyEditorialCouncilDecision;
  createdAt: string;
  completedAt: string;
  reviewQueueItemId: string;
  decisionGateId: string;
};

export type VoxyEditorialCouncilArtifactRepository = {
  save(artifact: VoxyEditorialCouncilAuditArtifact): Promise<void>;
  get(artifactId: string): Promise<VoxyEditorialCouncilAuditArtifact | null>;
  getLatestForDraft(draftId: string): Promise<VoxyEditorialCouncilAuditArtifact | null>;
  listForDraft(draftId: string, limit?: number): Promise<VoxyEditorialCouncilAuditArtifact[]>;
  getPersistenceState(): {
    mode: "persistent_primary" | "in_memory_fallback";
    productionTruth: boolean;
    storeKind: "mongo_collection" | "in_memory";
  };
};

const COLLECTION = "voxy_editorial_council_audit";
let singleton: VoxyEditorialCouncilArtifactRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function ensureIndexes() {
  if (indexesReady) return;
  const col = await coreCol(COLLECTION);
  await Promise.all([
    col.createIndex({ "binding.studioDraftId": 1, completedAt: -1 }),
    col.createIndex({ inputFingerprint: 1, completedAt: -1 }),
  ]).catch(() => undefined);
  indexesReady = true;
}

function createMongoRepository(): VoxyEditorialCouncilArtifactRepository {
  return {
    async save(artifact) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      await col.updateOne(
        { _id: artifact.artifactId },
        { $set: { _id: artifact.artifactId, ...clone(artifact) } },
        { upsert: true },
      );
    },
    async get(artifactId) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      const doc = await col.findOne({ _id: artifactId });
      if (!doc) return null;
      const { _id: _ignored, ...artifact } = doc;
      return clone(artifact as VoxyEditorialCouncilAuditArtifact);
    },
    async getLatestForDraft(draftId) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      const doc = await col.find({ "binding.studioDraftId": draftId }).sort({ completedAt: -1 }).limit(1).next();
      if (!doc) return null;
      const { _id: _ignored, ...artifact } = doc;
      return clone(artifact as VoxyEditorialCouncilAuditArtifact);
    },
    async listForDraft(draftId, limit = 20) {
      await ensureIndexes();
      const col = await coreCol<any>(COLLECTION);
      const docs = await col
        .find({ "binding.studioDraftId": draftId })
        .sort({ completedAt: -1 })
        .limit(Math.max(1, Math.min(100, limit)))
        .toArray();
      return docs.map((doc) => {
        const { _id: _ignored, ...artifact } = doc;
        return clone(artifact as VoxyEditorialCouncilAuditArtifact);
      });
    },
    getPersistenceState() {
      return { mode: "persistent_primary", productionTruth: true, storeKind: "mongo_collection" };
    },
  };
}

function createInMemoryRepository(): VoxyEditorialCouncilArtifactRepository {
  const values = new Map<string, VoxyEditorialCouncilAuditArtifact>();
  return {
    async save(artifact) {
      values.set(artifact.artifactId, clone(artifact));
    },
    async get(artifactId) {
      const value = values.get(artifactId);
      return value ? clone(value) : null;
    },
    async getLatestForDraft(draftId) {
      return (
        Array.from(values.values())
          .filter((item) => item.binding.studioDraftId === draftId)
          .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
          .map(clone)[0] ?? null
      );
    },
    async listForDraft(draftId, limit = 20) {
      return Array.from(values.values())
        .filter((item) => item.binding.studioDraftId === draftId)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, Math.max(1, Math.min(100, limit)))
        .map(clone);
    },
    getPersistenceState() {
      return { mode: "in_memory_fallback", productionTruth: false, storeKind: "in_memory" };
    },
  };
}

export function getVoxyEditorialCouncilArtifactRepository(): VoxyEditorialCouncilArtifactRepository {
  if (!singleton) {
    singleton = shouldUseInMemoryMongoFallback() ? createInMemoryRepository() : createMongoRepository();
  }
  return singleton;
}

export function setVoxyEditorialCouncilArtifactRepositoryForTests(
  repository: VoxyEditorialCouncilArtifactRepository | null,
) {
  singleton = repository;
  indexesReady = false;
}
