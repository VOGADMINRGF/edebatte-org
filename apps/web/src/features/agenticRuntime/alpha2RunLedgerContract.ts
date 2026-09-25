import type {
  Alpha2ActorPrincipal,
  Alpha2RunRecord,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

export type Alpha2RunLease = {
  owner: string;
  expiresAt: string;
};

export type Alpha2LeaseFence = {
  owner: string;
  now: string;
};

export type Alpha2VersionedRun = {
  run: Alpha2RunRecord;
  version: number;
  lease: Alpha2RunLease | null;
};

export type Alpha2RunLedgerCreateResult = {
  record: Alpha2VersionedRun;
  created: boolean;
};

export type Alpha2RecoverableRunQuery = {
  now: string;
  limit?: number;
};

export interface Alpha2RunLedger {
  createOrGet(run: Alpha2RunRecord): Promise<Alpha2RunLedgerCreateResult>;
  getByRunId(runId: string): Promise<Alpha2VersionedRun | null>;
  getByIdempotencyKey(idempotencyKey: string): Promise<Alpha2VersionedRun | null>;
  compareAndSwap(input: {
    run: Alpha2RunRecord;
    expectedVersion: number;
    lease?: Alpha2LeaseFence;
    resumeAfterMs?: number;
    initializeWallClock?: { maxWallClockMs?: number };
    stampCheckpointId?: string;
    /**
     * Principal already authenticated by the trusted caller boundary. This
     * context is deliberately separate from the caller-supplied run payload
     * and is mandatory for independent-review completion/resume CAS writes.
     */
    authenticatedActor?: Alpha2ActorPrincipal;
  }): Promise<Alpha2VersionedRun>;
  tryAcquireLease(input: {
    runId: string;
    owner: string;
    now: string;
    leaseMs: number;
  }): Promise<Alpha2VersionedRun | null>;
  renewLease(input: {
    runId: string;
    owner: string;
    now: string;
    leaseMs: number;
  }): Promise<Alpha2VersionedRun | null>;
  isRunDue(input: { runId: string; now: string }): Promise<boolean>;
  releaseLease(input: { runId: string; owner: string }): Promise<void>;
  listRecoverable(input: Alpha2RecoverableRunQuery): Promise<Alpha2VersionedRun[]>;
}

export function isAlpha2TerminalRun(run: Alpha2RunRecord) {
  return run.status === "completed" || run.status === "cancelled";
}

export function isAlpha2HumanStoppedRun(run: Alpha2RunRecord) {
  return run.status === "review" || run.status === "human_gate";
}

export function isAlpha2RunDue(run: Alpha2RunRecord, now: string) {
  if (isAlpha2TerminalRun(run) || isAlpha2HumanStoppedRun(run)) return false;
  if (!run.resumeAt) return true;
  return Date.parse(run.resumeAt) <= Date.parse(now);
}

export function assertAlpha2LedgerIdentity(existing: Alpha2RunRecord, incoming: Alpha2RunRecord) {
  if (existing.idempotencyKey !== incoming.idempotencyKey) {
    throw new Error("alpha2_ledger_idempotency_key_mismatch");
  }
  if (existing.runId !== incoming.runId || existing.taskId !== incoming.taskId) {
    throw new Error("alpha2_ledger_idempotency_conflict");
  }
  if (
    existing.rootRunId !== incoming.rootRunId ||
    existing.parentRunId !== incoming.parentRunId
  ) {
    throw new Error("alpha2_ledger_lineage_conflict");
  }
}
