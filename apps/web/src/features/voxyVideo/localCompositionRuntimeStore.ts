import "server-only";

import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import type {
  VoxyLocalCompositionJob,
  VoxyLocalCompositionOutput,
  VoxyLocalCompositionStatus,
} from "@/features/voxyVideo/localCompositionRuntime";

export type VoxyLocalCompositionRepository = {
  createOrGetJob(job: VoxyLocalCompositionJob): Promise<VoxyLocalCompositionJob>;
  getJob(jobId: string): Promise<VoxyLocalCompositionJob | null>;
  transitionJob(input: {
    jobId: string;
    expectedStatus: VoxyLocalCompositionStatus;
    next: VoxyLocalCompositionJob;
  }): Promise<boolean>;
  saveOutput(output: VoxyLocalCompositionOutput): Promise<VoxyLocalCompositionOutput>;
  getOutput(outputId: string): Promise<VoxyLocalCompositionOutput | null>;
};

const JOBS_COLLECTION = "voxy_local_composition_jobs";
const OUTPUTS_COLLECTION = "voxy_local_composition_outputs";

let repoSingleton: VoxyLocalCompositionRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
    jobs.createIndex({ requestedByUserId: 1, updatedAt: -1 }),
    jobs.createIndex({ artifactId: 1, updatedAt: -1 }),
    outputs.createIndex({ identityKey: 1 }, { unique: true }),
    outputs.createIndex({ jobId: 1 }, { unique: true }),
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
  };
}

export function createInMemoryVoxyLocalCompositionRepository(seed?: {
  jobs?: VoxyLocalCompositionJob[];
  outputs?: VoxyLocalCompositionOutput[];
}): VoxyLocalCompositionRepository {
  const jobs = new Map<string, VoxyLocalCompositionJob>();
  const outputs = new Map<string, VoxyLocalCompositionOutput>();
  for (const job of seed?.jobs ?? []) jobs.set(job.jobId, clone(job));
  for (const output of seed?.outputs ?? []) outputs.set(output.outputId, clone(output));
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
