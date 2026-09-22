import "server-only";

import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import {
  buildVoxyLocalCompositionInputFingerprint,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionOutput,
  type VoxyLocalCompositionRequest,
  type VoxyLocalCompositionStatus,
} from "@/features/voxyVideo/localCompositionRuntime";

export type VoxyLocalCompositionPersistenceState = {
  mode: "persistent_primary" | "in_memory_fallback";
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
};

export type VoxyLocalCompositionRepository = {
  createOrGetJob(job: VoxyLocalCompositionJob): Promise<VoxyLocalCompositionJob>;
  getJob(jobId: string): Promise<VoxyLocalCompositionJob | null>;
  listJobsByStatus(
    status: VoxyLocalCompositionStatus,
    limit?: number,
  ): Promise<VoxyLocalCompositionJob[]>;
  saveRequestSnapshot(input: {
    jobId: string;
    request: VoxyLocalCompositionRequest;
    inputFingerprint: string;
  }): Promise<void>;
  getRequestSnapshot(jobId: string): Promise<VoxyLocalCompositionRequest | null>;
  transitionJob(input: {
    jobId: string;
    expectedStatus: VoxyLocalCompositionStatus;
    next: VoxyLocalCompositionJob;
  }): Promise<boolean>;
  saveOutput(output: VoxyLocalCompositionOutput): Promise<VoxyLocalCompositionOutput>;
  getOutput(outputId: string): Promise<VoxyLocalCompositionOutput | null>;
  getPersistenceState(): VoxyLocalCompositionPersistenceState;
};

const JOBS_COLLECTION = "voxy_local_composition_jobs";
const OUTPUTS_COLLECTION = "voxy_local_composition_outputs";

let repoSingleton: VoxyLocalCompositionRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function boundedLimit(value: number | undefined) {
  return Math.max(1, Math.min(50, Math.trunc(value ?? 10)));
}

function persistentState(): VoxyLocalCompositionPersistenceState {
  return {
    mode: "persistent_primary",
    productionTruth: true,
    restartReconstructable: true,
    deploymentReconstructable: true,
  };
}

function fallbackState(): VoxyLocalCompositionPersistenceState {
  return {
    mode: "in_memory_fallback",
    productionTruth: false,
    restartReconstructable: false,
    deploymentReconstructable: false,
  };
}

function assertRequestSnapshot(input: {
  job: VoxyLocalCompositionJob;
  request: VoxyLocalCompositionRequest;
  inputFingerprint: string;
}) {
  const fingerprint = buildVoxyLocalCompositionInputFingerprint(input.request);
  if (
    fingerprint !== input.inputFingerprint ||
    fingerprint !== input.job.inputFingerprint ||
    input.request.artifactId !== input.job.artifactId ||
    input.request.briefingId !== input.job.briefingId ||
    input.request.scriptVersion !== input.job.scriptVersion ||
    input.request.audioAssetId !== input.job.audioAssetId ||
    input.request.renderProfile !== input.job.renderProfile ||
    input.request.format !== input.job.format ||
    input.request.locale.toLowerCase() !== input.job.locale
  ) {
    throw new Error("voxy_local_composition_request_snapshot_binding_mismatch");
  }
}

async function ensureIndexes() {
  if (indexesReady || shouldUseInMemoryMongoFallback()) return;
  const [jobs, outputs] = await Promise.all([
    coreCol<any>(JOBS_COLLECTION),
    coreCol<any>(OUTPUTS_COLLECTION),
  ]);
  await Promise.all([
    jobs.createIndex({ identityKey: 1 }, { unique: true }),
    jobs.createIndex({ briefingId: 1, scriptVersion: 1, locale: 1, format: 1, renderProfile: 1 }),
    jobs.createIndex({ "record.status": 1, updatedAt: 1 }),
    jobs.createIndex({ requestedByUserId: 1, updatedAt: -1 }),
    jobs.createIndex({ artifactId: 1, updatedAt: -1 }),
    jobs.createIndex({ previewReviewFlowId: 1, updatedAt: -1 }),
    jobs.createIndex({ decisionGateId: 1, updatedAt: -1 }),
    jobs.createIndex({ dossierRefId: 1, updatedAt: -1 }),
    outputs.createIndex({ identityKey: 1 }, { unique: true }),
    outputs.createIndex({ jobId: 1 }, { unique: true }),
    outputs.createIndex({ previewReviewFlowId: 1, createdAt: -1 }),
    outputs.createIndex({ decisionGateId: 1, createdAt: -1 }),
    outputs.createIndex({ dossierRefId: 1, createdAt: -1 }),
  ]).catch(() => undefined);
  indexesReady = true;
}

function createMongoRepository(): VoxyLocalCompositionRepository {
  return {
    async createOrGetJob(job) {
      await ensureIndexes();
      const col = await coreCol<any>(JOBS_COLLECTION);
      await col.updateOne(
        { _id: job.jobId },
        {
          $setOnInsert: {
            _id: job.jobId,
            identityKey: job.identityKey,
            briefingId: job.briefingId,
            scriptVersion: job.scriptVersion,
            locale: job.locale,
            format: job.format,
            renderProfile: job.renderProfile,
            requestedByUserId: job.requestedByUserId,
            artifactId: job.artifactId,
            previewReviewFlowId: job.previewReviewFlowId,
            decisionGateId: job.decisionGateId,
            dossierRefId: job.dossierRefId,
            reviewBindingHash: job.reviewBindingHash,
            updatedAt: job.updatedAt,
            record: clone(job),
          } as any,
        },
        { upsert: true },
      );
      const doc = await col.findOne({ _id: job.jobId });
      return clone((doc?.record ?? job) as VoxyLocalCompositionJob);
    },
    async getJob(jobId) {
      await ensureIndexes();
      const col = await coreCol<any>(JOBS_COLLECTION);
      const doc = await col.findOne({ _id: jobId });
      return doc?.record ? clone(doc.record as VoxyLocalCompositionJob) : null;
    },
    async listJobsByStatus(status, limit) {
      await ensureIndexes();
      const col = await coreCol<any>(JOBS_COLLECTION);
      const docs = await col
        .find({ "record.status": status })
        .sort({ updatedAt: 1, _id: 1 })
        .limit(boundedLimit(limit))
        .toArray();
      return docs.flatMap((doc) =>
        doc?.record ? [clone(doc.record as VoxyLocalCompositionJob)] : [],
      );
    },
    async saveRequestSnapshot(input) {
      await ensureIndexes();
      const col = await coreCol<any>(JOBS_COLLECTION);
      const doc = await col.findOne({ _id: input.jobId });
      if (!doc?.record) throw new Error("voxy_local_composition_request_snapshot_job_missing");
      const job = clone(doc.record as VoxyLocalCompositionJob);
      assertRequestSnapshot({ ...input, job });
      if (doc.requestRecord) {
        if (
          doc.requestInputFingerprint !== input.inputFingerprint ||
          buildVoxyLocalCompositionInputFingerprint(
            doc.requestRecord as VoxyLocalCompositionRequest,
          ) !== input.inputFingerprint
        ) {
          throw new Error("voxy_local_composition_request_snapshot_immutable_conflict");
        }
        return;
      }
      const update = await col.updateOne(
        { _id: input.jobId, requestRecord: { $exists: false } },
        {
          $set: {
            requestInputFingerprint: input.inputFingerprint,
            requestRecord: clone(input.request),
          } as any,
        },
      );
      if (update.modifiedCount === 1) return;
      const raced = await col.findOne({ _id: input.jobId });
      if (
        raced?.requestInputFingerprint !== input.inputFingerprint ||
        !raced?.requestRecord ||
        buildVoxyLocalCompositionInputFingerprint(
          raced.requestRecord as VoxyLocalCompositionRequest,
        ) !== input.inputFingerprint
      ) {
        throw new Error("voxy_local_composition_request_snapshot_immutable_conflict");
      }
    },
    async getRequestSnapshot(jobId) {
      await ensureIndexes();
      const col = await coreCol<any>(JOBS_COLLECTION);
      const doc = await col.findOne({ _id: jobId });
      return doc?.requestRecord
        ? clone(doc.requestRecord as VoxyLocalCompositionRequest)
        : null;
    },
    async transitionJob(input) {
      await ensureIndexes();
      const col = await coreCol<any>(JOBS_COLLECTION);
      const result = await col.updateOne(
        { _id: input.jobId, "record.status": input.expectedStatus },
        {
          $set: {
            record: clone(input.next),
            updatedAt: input.next.updatedAt,
          } as any,
        },
      );
      return result.modifiedCount === 1;
    },
    async saveOutput(output) {
      await ensureIndexes();
      const col = await coreCol<any>(OUTPUTS_COLLECTION);
      await col.updateOne(
        { _id: output.outputId },
        {
          $setOnInsert: {
            _id: output.outputId,
            identityKey: output.identityKey,
            jobId: output.jobId,
            previewReviewFlowId: output.previewReviewFlowId,
            decisionGateId: output.decisionGateId,
            dossierRefId: output.dossierRefId,
            reviewBindingHash: output.reviewBindingHash,
            createdAt: output.createdAt,
            record: clone(output),
          } as any,
        },
        { upsert: true },
      );
      const doc = await col.findOne({ _id: output.outputId });
      return clone((doc?.record ?? output) as VoxyLocalCompositionOutput);
    },
    async getOutput(outputId) {
      await ensureIndexes();
      const col = await coreCol<any>(OUTPUTS_COLLECTION);
      const doc = await col.findOne({ _id: outputId });
      return doc?.record ? clone(doc.record as VoxyLocalCompositionOutput) : null;
    },
    getPersistenceState: persistentState,
  };
}

export function createInMemoryVoxyLocalCompositionRepository(seed?: {
  jobs?: VoxyLocalCompositionJob[];
  outputs?: VoxyLocalCompositionOutput[];
  requestSnapshots?: Array<{
    jobId: string;
    request: VoxyLocalCompositionRequest;
  }>;
}): VoxyLocalCompositionRepository {
  const jobs = new Map<string, VoxyLocalCompositionJob>();
  const outputs = new Map<string, VoxyLocalCompositionOutput>();
  const requestSnapshots = new Map<string, VoxyLocalCompositionRequest>();
  for (const job of seed?.jobs ?? []) jobs.set(job.jobId, clone(job));
  for (const output of seed?.outputs ?? []) outputs.set(output.outputId, clone(output));
  for (const snapshot of seed?.requestSnapshots ?? []) {
    requestSnapshots.set(snapshot.jobId, clone(snapshot.request));
  }
  return {
    async createOrGetJob(job) {
      const existing = jobs.get(job.jobId);
      if (existing) return clone(existing);
      jobs.set(job.jobId, clone(job));
      return clone(job);
    },
    async getJob(jobId) {
      const job = jobs.get(jobId);
      return job ? clone(job) : null;
    },
    async listJobsByStatus(status, limit) {
      return Array.from(jobs.values())
        .filter((job) => job.status === status)
        .sort(
          (a, b) =>
            a.updatedAt.localeCompare(b.updatedAt) || a.jobId.localeCompare(b.jobId),
        )
        .slice(0, boundedLimit(limit))
        .map(clone);
    },
    async saveRequestSnapshot(input) {
      const job = jobs.get(input.jobId);
      if (!job) throw new Error("voxy_local_composition_request_snapshot_job_missing");
      assertRequestSnapshot({ ...input, job });
      const existing = requestSnapshots.get(input.jobId);
      if (existing) {
        if (
          buildVoxyLocalCompositionInputFingerprint(existing) !== input.inputFingerprint
        ) {
          throw new Error("voxy_local_composition_request_snapshot_immutable_conflict");
        }
        return;
      }
      requestSnapshots.set(input.jobId, clone(input.request));
    },
    async getRequestSnapshot(jobId) {
      const request = requestSnapshots.get(jobId);
      return request ? clone(request) : null;
    },
    async transitionJob(input) {
      const current = jobs.get(input.jobId);
      if (!current || current.status !== input.expectedStatus) return false;
      jobs.set(input.jobId, clone(input.next));
      return true;
    },
    async saveOutput(output) {
      const existing = outputs.get(output.outputId);
      if (existing) return clone(existing);
      outputs.set(output.outputId, clone(output));
      return clone(output);
    },
    async getOutput(outputId) {
      const output = outputs.get(outputId);
      return output ? clone(output) : null;
    },
    getPersistenceState: fallbackState,
  };
}

function getRepo() {
  if (repoSingleton) return repoSingleton;
  repoSingleton = shouldUseInMemoryMongoFallback()
    ? createInMemoryVoxyLocalCompositionRepository()
    : createMongoRepository();
  return repoSingleton;
}

export function getVoxyLocalCompositionRepository() {
  return getRepo();
}

export function setVoxyLocalCompositionRepositoryForTests(
  repo: VoxyLocalCompositionRepository,
) {
  repoSingleton = repo;
}
