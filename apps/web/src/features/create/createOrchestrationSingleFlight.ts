import "server-only";

import crypto from "node:crypto";
import { coreCol } from "@core/db/triMongo";
import { stableHash } from "@core/utils/hash";
import { CREATE_ANON_SESSION_MAX_AGE_SECONDS } from "@/features/create/createAnonymousSession";

export type CreateOrchestrationKind = "create_intelligent_followup_planner";

type CreateOrchestrationClaimStatus = "running" | "completed" | "failed";

type CreateOrchestrationClaimRecord<T> = {
  key: string;
  status: CreateOrchestrationClaimStatus;
  actorKey: string;
  draftId: string;
  correlationId: string;
  operationType: CreateOrchestrationKind;
  inputHash: string;
  claimToken: string;
  leaseUntil: string;
  externalExecutionStarted: boolean;
  externalExecutionStartedAt: string | null;
  result: T | null;
  failureCode: string | null;
  adoptedBy: string | null;
  adoptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: Date;
};

type ClaimAcquireResult<T> =
  | {
      kind: "acquired";
      record: CreateOrchestrationClaimRecord<T>;
      recovered: boolean;
      externalExecutionStarted: boolean;
    }
  | {
      kind: "active";
      record: CreateOrchestrationClaimRecord<T>;
    }
  | {
      kind: "completed";
      record: CreateOrchestrationClaimRecord<T>;
      result: T;
    };

type ClaimAdoptionResult<T> =
  | { kind: "adopted" | "reused"; result: T }
  | { kind: "not_found" | "not_completed" | "conflict" };

type ClaimRepository = {
  acquire<T>(input: {
    record: CreateOrchestrationClaimRecord<T>;
    now: string;
  }): Promise<ClaimAcquireResult<T>>;
  find<T>(key: string): Promise<CreateOrchestrationClaimRecord<T> | null>;
  markExternalExecutionStarted(input: {
    key: string;
    claimToken: string;
    now: string;
    leaseUntil: string;
  }): Promise<boolean>;
  complete<T>(input: {
    key: string;
    claimToken: string;
    result: T;
    now: string;
  }): Promise<boolean>;
  fail(input: {
    key: string;
    claimToken: string;
    failureCode: string;
    now: string;
  }): Promise<boolean>;
  adoptCompleted<T>(input: {
    key: string;
    consumerKey: string;
    now: string;
  }): Promise<ClaimAdoptionResult<T>>;
};

type InMemoryClaimRepository = ClaimRepository & {
  expireClaimForTests(key: string): void;
  snapshotForTests<T>(key: string): CreateOrchestrationClaimRecord<T> | null;
};

const CLAIMS_COLLECTION = "create_orchestration_claims";
const DEFAULT_LEASE_MS = 45_000;
const DEFAULT_WAIT_MS = 50_000;
const RESULT_TTL_MS = CREATE_ANON_SESSION_MAX_AGE_SECONDS * 1000;
const POLL_INTERVAL_MS = 20;

let repoSingleton: ClaimRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isLeaseActive(record: CreateOrchestrationClaimRecord<unknown>, now: string) {
  return record.status === "running" && record.leaseUntil > now;
}

function isDuplicateKeyError(error: unknown) {
  return (error as { code?: number } | null)?.code === 11000;
}

async function ensureIndexes() {
  if (indexesReady) return;
  const claims = await coreCol(CLAIMS_COLLECTION);
  await Promise.all([
    claims.createIndex({ key: 1 }, { unique: true }),
    claims.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    claims.createIndex({ status: 1, leaseUntil: 1 }),
  ]);
  indexesReady = true;
}

function createMongoRepo(): ClaimRepository {
  return {
    async acquire<T>({ record, now }) {
      await ensureIndexes();
      const claims =
        await coreCol<CreateOrchestrationClaimRecord<T>>(CLAIMS_COLLECTION);
      let inserted: CreateOrchestrationClaimRecord<T> | null;
      try {
        inserted = await claims.findOneAndUpdate(
          { key: record.key },
          { $setOnInsert: record },
          { upsert: true, returnDocument: "after" },
        );
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        inserted = await claims.findOne({ key: record.key });
        if (!inserted) throw error;
      }
      const current = clone(inserted ?? record);
      if (current.claimToken === record.claimToken) {
        return {
          kind: "acquired",
          record: current,
          recovered: false,
          externalExecutionStarted: false,
        };
      }
      if (current.status === "completed" && current.result !== null) {
        return { kind: "completed", record: current, result: clone(current.result) };
      }
      if (isLeaseActive(current, now)) {
        return { kind: "active", record: current };
      }

      const recovered = await claims.findOneAndUpdate(
        {
          key: record.key,
          claimToken: current.claimToken,
          status: { $in: ["running", "failed"] },
          $or: [
            { status: "failed" },
            { leaseUntil: { $lte: now } },
          ],
        },
        {
          $set: {
            status: "running",
            claimToken: record.claimToken,
            leaseUntil: record.leaseUntil,
            failureCode: null,
            updatedAt: now,
          },
        },
        { returnDocument: "after" },
      );
      if (recovered?.claimToken === record.claimToken) {
        const recoveredRecord = clone(recovered);
        return {
          kind: "acquired",
          record: recoveredRecord,
          recovered: true,
          externalExecutionStarted: recoveredRecord.externalExecutionStarted,
        };
      }
      const latest = await claims.findOne({ key: record.key });
      if (latest?.status === "completed" && latest.result !== null) {
        return {
          kind: "completed",
          record: clone(latest),
          result: clone(latest.result),
        };
      }
      return {
        kind: "active",
        record: clone(latest ?? current),
      };
    },
    async find<T>(key) {
      await ensureIndexes();
      const claims =
        await coreCol<CreateOrchestrationClaimRecord<T>>(CLAIMS_COLLECTION);
      const record = await claims.findOne({ key });
      return record ? clone(record) : null;
    },
    async markExternalExecutionStarted(input) {
      await ensureIndexes();
      const claims = await coreCol(CLAIMS_COLLECTION);
      const result = await claims.updateOne(
        {
          key: input.key,
          claimToken: input.claimToken,
          status: "running",
        },
        {
          $set: {
            externalExecutionStarted: true,
            externalExecutionStartedAt: input.now,
            leaseUntil: input.leaseUntil,
            updatedAt: input.now,
          },
        },
      );
      return result.modifiedCount === 1;
    },
    async complete<T>(input) {
      await ensureIndexes();
      const claims =
        await coreCol<CreateOrchestrationClaimRecord<T>>(CLAIMS_COLLECTION);
      const result = await claims.updateOne(
        {
          key: input.key,
          claimToken: input.claimToken,
          status: "running",
        },
        {
          $set: {
            status: "completed",
            result: input.result,
            failureCode: null,
            leaseUntil: input.now,
            updatedAt: input.now,
          },
        },
      );
      return result.modifiedCount === 1;
    },
    async fail(input) {
      await ensureIndexes();
      const claims = await coreCol(CLAIMS_COLLECTION);
      const result = await claims.updateOne(
        {
          key: input.key,
          claimToken: input.claimToken,
          status: "running",
        },
        {
          $set: {
            status: "failed",
            failureCode: input.failureCode,
            leaseUntil: input.now,
            updatedAt: input.now,
          },
        },
      );
      return result.modifiedCount === 1;
    },
    async adoptCompleted<T>(input) {
      await ensureIndexes();
      const claims =
        await coreCol<CreateOrchestrationClaimRecord<T>>(CLAIMS_COLLECTION);
      const adopted = await claims.findOneAndUpdate(
        {
          key: input.key,
          status: "completed",
          result: { $ne: null },
          $or: [{ adoptedBy: null }, { adoptedBy: { $exists: false } }],
        },
        {
          $set: {
            adoptedBy: input.consumerKey,
            adoptedAt: input.now,
            updatedAt: input.now,
          },
        },
        { returnDocument: "after" },
      );
      if (adopted?.result !== null && adopted?.result !== undefined) {
        return { kind: "adopted", result: clone(adopted.result) };
      }
      const current = await claims.findOne({ key: input.key });
      if (!current) return { kind: "not_found" };
      if (current.status !== "completed" || current.result === null) {
        return { kind: "not_completed" };
      }
      if (current.adoptedBy === input.consumerKey) {
        return { kind: "reused", result: clone(current.result) };
      }
      return { kind: "conflict" };
    },
  };
}

export function createInMemoryCreateOrchestrationClaimRepo(): InMemoryClaimRepository {
  const records = new Map<string, CreateOrchestrationClaimRecord<unknown>>();
  return {
    async acquire<T>({ record, now }) {
      const current = records.get(record.key) as
        | CreateOrchestrationClaimRecord<T>
        | undefined;
      if (!current) {
        records.set(record.key, clone(record));
        return {
          kind: "acquired",
          record: clone(record),
          recovered: false,
          externalExecutionStarted: false,
        };
      }
      if (current.status === "completed" && current.result !== null) {
        return {
          kind: "completed",
          record: clone(current),
          result: clone(current.result),
        };
      }
      if (isLeaseActive(current, now)) {
        return { kind: "active", record: clone(current) };
      }
      const recovered = {
        ...current,
        status: "running" as const,
        claimToken: record.claimToken,
        leaseUntil: record.leaseUntil,
        failureCode: null,
        updatedAt: now,
      };
      records.set(record.key, clone(recovered));
      return {
        kind: "acquired",
        record: clone(recovered),
        recovered: true,
        externalExecutionStarted: recovered.externalExecutionStarted,
      };
    },
    async find<T>(key) {
      const record = records.get(key);
      return record ? clone(record as CreateOrchestrationClaimRecord<T>) : null;
    },
    async markExternalExecutionStarted(input) {
      const current = records.get(input.key);
      if (
        !current ||
        current.status !== "running" ||
        current.claimToken !== input.claimToken
      ) {
        return false;
      }
      records.set(input.key, {
        ...current,
        externalExecutionStarted: true,
        externalExecutionStartedAt: input.now,
        leaseUntil: input.leaseUntil,
        updatedAt: input.now,
      });
      return true;
    },
    async complete<T>(input) {
      const current = records.get(input.key);
      if (
        !current ||
        current.status !== "running" ||
        current.claimToken !== input.claimToken
      ) {
        return false;
      }
      records.set(input.key, {
        ...current,
        status: "completed",
        result: clone(input.result),
        failureCode: null,
        leaseUntil: input.now,
        updatedAt: input.now,
      });
      return true;
    },
    async fail(input) {
      const current = records.get(input.key);
      if (
        !current ||
        current.status !== "running" ||
        current.claimToken !== input.claimToken
      ) {
        return false;
      }
      records.set(input.key, {
        ...current,
        status: "failed",
        failureCode: input.failureCode,
        leaseUntil: input.now,
        updatedAt: input.now,
      });
      return true;
    },
    async adoptCompleted<T>(input) {
      const current = records.get(input.key) as
        | CreateOrchestrationClaimRecord<T>
        | undefined;
      if (!current) return { kind: "not_found" };
      if (current.status !== "completed" || current.result === null) {
        return { kind: "not_completed" };
      }
      if (current.adoptedBy && current.adoptedBy !== input.consumerKey) {
        return { kind: "conflict" };
      }
      if (current.adoptedBy === input.consumerKey) {
        return { kind: "reused", result: clone(current.result) };
      }
      records.set(input.key, {
        ...current,
        adoptedBy: input.consumerKey,
        adoptedAt: input.now,
        updatedAt: input.now,
      });
      return { kind: "adopted", result: clone(current.result) };
    },
    expireClaimForTests(key) {
      const current = records.get(key);
      if (!current) return;
      records.set(key, {
        ...current,
        leaseUntil: new Date(0).toISOString(),
      });
    },
    snapshotForTests<T>(key) {
      const current = records.get(key);
      return current ? clone(current as CreateOrchestrationClaimRecord<T>) : null;
    },
  };
}

function getRepo() {
  if (!repoSingleton) repoSingleton = createMongoRepo();
  return repoSingleton;
}

function normalizeScopeValue(value: string, field: string) {
  const normalized = value.trim().slice(0, 180);
  if (!normalized) throw new Error(`create_single_flight_${field}_required`);
  return normalized;
}

function normalizeFailureCode(value: unknown, fallback: string) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, 96);
  return normalized || fallback;
}

function buildClaimKey(input: {
  actorKey: string;
  draftId: string;
  correlationId: string;
  operationType: CreateOrchestrationKind;
}) {
  return stableHash({
    actorKey: input.actorKey,
    draftId: input.draftId,
    correlationId: input.correlationId,
    operationType: input.operationType,
  });
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runCreateOrchestrationSingleFlight<T>(input: {
  actorKey: string;
  draftId: string;
  correlationId: string;
  operationType: CreateOrchestrationKind;
  inputHash: string;
  run: (context: {
    recoveryWithoutExternalCall: boolean;
    markExternalExecutionStarted: () => Promise<void>;
  }) => Promise<T>;
  leaseMs?: number;
  waitMs?: number;
}): Promise<{ result: T; reused: boolean; recovered: boolean }> {
  const actorKey = normalizeScopeValue(input.actorKey, "actor");
  const draftId = normalizeScopeValue(input.draftId, "draft");
  const correlationId = normalizeScopeValue(input.correlationId, "correlation");
  const inputHash = normalizeScopeValue(input.inputHash, "input_hash");
  const key = buildClaimKey({
    actorKey,
    draftId,
    correlationId,
    operationType: input.operationType,
  });
  const leaseMs = Math.max(1_000, input.leaseMs ?? DEFAULT_LEASE_MS);
  const waitMs = Math.max(1_000, input.waitMs ?? DEFAULT_WAIT_MS);
  const deadline = Date.now() + waitMs;

  while (Date.now() <= deadline) {
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const claimToken = crypto.randomUUID();
    const acquired = await getRepo().acquire<T>({
      now,
      record: {
        key,
        status: "running",
        actorKey,
        draftId,
        correlationId,
        operationType: input.operationType,
        inputHash,
        claimToken,
        leaseUntil: new Date(nowDate.getTime() + leaseMs).toISOString(),
        externalExecutionStarted: false,
        externalExecutionStartedAt: null,
        result: null,
        failureCode: null,
        adoptedBy: null,
        adoptedAt: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(nowDate.getTime() + RESULT_TTL_MS),
      },
    });

    if (acquired.record.inputHash !== inputHash) {
      throw new Error("create_single_flight_input_mismatch");
    }
    if (acquired.kind === "completed") {
      return { result: acquired.result, reused: true, recovered: false };
    }
    if (acquired.kind === "active") {
      await delay(POLL_INTERVAL_MS);
      continue;
    }

    const markExternalExecutionStarted = async () => {
      const markedAt = new Date();
      const marked = await getRepo().markExternalExecutionStarted({
        key,
        claimToken,
        now: markedAt.toISOString(),
        leaseUntil: new Date(markedAt.getTime() + leaseMs).toISOString(),
      });
      if (!marked) throw new Error("create_single_flight_claim_lost");
    };

    try {
      const result = await input.run({
        recoveryWithoutExternalCall:
          acquired.recovered && acquired.externalExecutionStarted,
        markExternalExecutionStarted,
      });
      const completed = await getRepo().complete({
        key,
        claimToken,
        result,
        now: new Date().toISOString(),
      });
      if (!completed) {
        const latest = await getRepo().find<T>(key);
        if (latest?.status === "completed" && latest.result !== null) {
          return { result: latest.result, reused: true, recovered: true };
        }
        throw new Error("create_single_flight_completion_lost");
      }
      return { result, reused: false, recovered: acquired.recovered };
    } catch (error) {
      await getRepo().fail({
        key,
        claimToken,
        failureCode:
          error instanceof Error
            ? normalizeFailureCode(error.message, "orchestration_failed")
            : "orchestration_failed",
        now: new Date().toISOString(),
      });
      throw error;
    }
  }

  throw new Error("create_single_flight_wait_timeout");
}

export function setCreateOrchestrationClaimRepoForTests(
  repo: ClaimRepository | null,
) {
  repoSingleton = repo;
  indexesReady = false;
}

export async function readCompletedCreateOrchestrationClaim<T>(input: {
  actorKey: string;
  draftId: string;
  correlationId: string;
  operationType: CreateOrchestrationKind;
}): Promise<{ result: T; inputHash: string } | null> {
  const key = buildClaimKey({
    actorKey: normalizeScopeValue(input.actorKey, "actor"),
    draftId: normalizeScopeValue(input.draftId, "draft"),
    correlationId: normalizeScopeValue(input.correlationId, "correlation"),
    operationType: input.operationType,
  });
  const record = await getRepo().find<T>(key);
  if (!record || record.status !== "completed" || record.result === null) {
    return null;
  }
  return { result: record.result, inputHash: record.inputHash };
}

export async function adoptCompletedCreateOrchestrationClaim<T>(input: {
  actorKey: string;
  draftId: string;
  correlationId: string;
  operationType: CreateOrchestrationKind;
  consumerKey: string;
}): Promise<ClaimAdoptionResult<T>> {
  const key = buildClaimKey({
    actorKey: normalizeScopeValue(input.actorKey, "actor"),
    draftId: normalizeScopeValue(input.draftId, "draft"),
    correlationId: normalizeScopeValue(input.correlationId, "correlation"),
    operationType: input.operationType,
  });
  return getRepo().adoptCompleted<T>({
    key,
    consumerKey: normalizeScopeValue(input.consumerKey, "consumer"),
    now: new Date().toISOString(),
  });
}

export function createOrchestrationClaimKeyForTests(input: {
  actorKey: string;
  draftId: string;
  correlationId: string;
  operationType: CreateOrchestrationKind;
}) {
  return buildClaimKey(input);
}
