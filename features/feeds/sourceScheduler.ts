import crypto from "node:crypto";

import { coreCol } from "@core/db/triMongo";
import { runOpenDataCycle, type OpenDataCycleResult } from "./openDataCycle";
import {
  listScheduledOpenDataSources,
  type ScheduledOpenDataSource,
} from "./openDataSourceRegistry";
import type { FeedSourceAutomationStateDoc } from "./sourceAutomation";

const AUTOMATION_COLLECTION = "feed_source_automation_state";
const LEASE_COLLECTION = "source_scheduler_leases";
const DEFAULT_LEASE_MS = 10 * 60 * 1000;

export type SourceSchedulerLease = {
  sourceId: string;
  ownerId: string | null;
  leaseUntil: string;
  updatedAt: string;
};

export type SourceSchedulerLeaseRepository = {
  claim(input: {
    sourceId: string;
    ownerId: string;
    now: Date;
    leaseMs: number;
  }): Promise<boolean>;
  release(input: {
    sourceId: string;
    ownerId: string;
    now: Date;
  }): Promise<void>;
};

type AutomationTiming = Pick<
  FeedSourceAutomationStateDoc,
  "sourceId" | "automationMode" | "backoffUntil" | "nextSuggestedPullAt"
> & {
  lastPullAt?: string | null;
  lastRunStatus?: FeedSourceAutomationStateDoc["lastRunStatus"];
};

type CycleRunner = (input: {
  connector: ScheduledOpenDataSource["connector"];
  source: ScheduledOpenDataSource["source"];
  timeoutMs: number;
  persist: true;
}) => Promise<OpenDataCycleResult>;

type StateLoader = (sourceId: string) => Promise<AutomationTiming | null>;

export type ScheduledSourceResult = {
  registryId: string;
  sourceId: string;
  status:
    | OpenDataCycleResult["status"]
    | "skipped_backoff"
    | "skipped_not_due"
    | "skipped_mode"
    | "skipped_leased"
    | "scheduler_error";
  reason: string | null;
};

let leaseRepoSingleton: SourceSchedulerLeaseRepository | null = null;

async function leaseCol() {
  const col = await coreCol<SourceSchedulerLease>(LEASE_COLLECTION);
  await col.createIndex({ sourceId: 1 }, { unique: true });
  await col.createIndex({ leaseUntil: 1 });
  return col;
}

function mongoLeaseRepository(): SourceSchedulerLeaseRepository {
  return {
    async claim({ sourceId, ownerId, now, leaseMs }) {
      const nowIso = now.toISOString();
      const leaseUntil = new Date(now.getTime() + leaseMs).toISOString();
      try {
        const result = await (await leaseCol()).updateOne(
          {
            sourceId,
            $or: [
              { leaseUntil: { $lte: nowIso } },
              { ownerId: null },
              { ownerId: { $exists: false } },
            ],
          },
          {
            $set: {
              sourceId,
              ownerId,
              leaseUntil,
              updatedAt: nowIso,
            },
          },
          { upsert: true },
        );
        return result.modifiedCount === 1 || result.upsertedCount === 1;
      } catch (error) {
        if ((error as { code?: number } | null)?.code === 11000) return false;
        throw error;
      }
    },
    async release({ sourceId, ownerId, now }) {
      const nowIso = now.toISOString();
      await (await leaseCol()).updateOne(
        { sourceId, ownerId },
        {
          $set: {
            ownerId: null,
            leaseUntil: nowIso,
            updatedAt: nowIso,
          },
        },
      );
    },
  };
}

export function createInMemorySourceSchedulerLeaseRepository(): SourceSchedulerLeaseRepository {
  const leases = new Map<string, SourceSchedulerLease>();
  return {
    async claim({ sourceId, ownerId, now, leaseMs }) {
      const existing = leases.get(sourceId);
      if (
        existing?.ownerId &&
        new Date(existing.leaseUntil).getTime() > now.getTime()
      ) {
        return false;
      }
      leases.set(sourceId, {
        sourceId,
        ownerId,
        leaseUntil: new Date(now.getTime() + leaseMs).toISOString(),
        updatedAt: now.toISOString(),
      });
      return true;
    },
    async release({ sourceId, ownerId, now }) {
      const existing = leases.get(sourceId);
      if (!existing || existing.ownerId !== ownerId) return;
      leases.set(sourceId, {
        ...existing,
        ownerId: null,
        leaseUntil: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    },
  };
}

function getLeaseRepo() {
  if (!leaseRepoSingleton) leaseRepoSingleton = mongoLeaseRepository();
  return leaseRepoSingleton;
}

async function loadAutomationTiming(sourceId: string): Promise<AutomationTiming | null> {
  const col = await coreCol<FeedSourceAutomationStateDoc>(AUTOMATION_COLLECTION);
  return col.findOne(
    { sourceId },
    {
      projection: {
        sourceId: 1,
        automationMode: 1,
        backoffUntil: 1,
        nextSuggestedPullAt: 1,
        lastPullAt: 1,
        lastRunStatus: 1,
      },
    },
  ) as Promise<AutomationTiming | null>;
}

function registryNextPullAt(
  state: AutomationTiming,
  intervalMinutes: number | null | undefined,
): number | null {
  if (state.lastRunStatus === "error") return null;
  const interval = Number(intervalMinutes);
  if (!Number.isFinite(interval) || interval <= 0 || !state.lastPullAt) return null;
  const lastPull = new Date(state.lastPullAt);
  if (Number.isNaN(lastPull.getTime())) return null;
  return lastPull.getTime() + interval * 60_000;
}

export function sourceDueState(
  state: AutomationTiming | null,
  now: Date,
  intervalMinutes?: number | null,
): "due" | "backoff" | "not_due" | "mode" {
  if (!state) return "due";
  if (state.automationMode !== "cron_ready") return "mode";
  if (state.backoffUntil) {
    const backoff = new Date(state.backoffUntil);
    if (!Number.isNaN(backoff.getTime()) && backoff.getTime() > now.getTime()) {
      return "backoff";
    }
  }

  const registryNext = registryNextPullAt(state, intervalMinutes);
  if (registryNext !== null) {
    return registryNext > now.getTime() ? "not_due" : "due";
  }

  if (state.nextSuggestedPullAt) {
    const next = new Date(state.nextSuggestedPullAt);
    if (!Number.isNaN(next.getTime()) && next.getTime() > now.getTime()) {
      return "not_due";
    }
  }
  return "due";
}

export async function runScheduledOpenDataSources(input?: {
  entries?: ScheduledOpenDataSource[];
  now?: Date;
  ownerId?: string;
  leaseMs?: number;
  leaseRepository?: SourceSchedulerLeaseRepository;
  stateLoader?: StateLoader;
  cycleRunner?: CycleRunner;
}): Promise<{
  ok: boolean;
  startedAt: string;
  completedAt: string;
  due: number;
  ran: number;
  failed: number;
  skipped: number;
  results: ScheduledSourceResult[];
}> {
  const entries = input?.entries ?? listScheduledOpenDataSources();
  const started = input?.now ? new Date(input.now) : new Date();
  const ownerId = input?.ownerId ?? `source-scheduler:${crypto.randomUUID()}`;
  const leaseMs = Math.max(60_000, input?.leaseMs ?? DEFAULT_LEASE_MS);
  const leases = input?.leaseRepository ?? getLeaseRepo();
  const stateLoader = input?.stateLoader ?? loadAutomationTiming;
  const cycleRunner = input?.cycleRunner ?? runOpenDataCycle;
  const results: ScheduledSourceResult[] = [];
  let due = 0;
  let ran = 0;
  let failed = 0;

  // Deliberately sequential: the registry is small and provider fair-use wins
  // over throughput. Each source has its own due/backoff/lease state.
  for (const entry of entries) {
    const state = await stateLoader(entry.source.sourceId);
    const dueState = sourceDueState(state, started, entry.intervalMinutes);
    if (dueState !== "due") {
      results.push({
        registryId: entry.registryId,
        sourceId: entry.source.sourceId,
        status:
          dueState === "backoff"
            ? "skipped_backoff"
            : dueState === "not_due"
              ? "skipped_not_due"
              : "skipped_mode",
        reason: dueState,
      });
      continue;
    }
    due += 1;

    const claimed = await leases.claim({
      sourceId: entry.source.sourceId,
      ownerId,
      now: started,
      leaseMs,
    });
    if (!claimed) {
      results.push({
        registryId: entry.registryId,
        sourceId: entry.source.sourceId,
        status: "skipped_leased",
        reason: "single_flight_lease_held",
      });
      continue;
    }

    try {
      const cycle = await cycleRunner({
        connector: entry.connector,
        source: entry.source,
        timeoutMs: entry.timeoutMs,
        persist: true,
      });
      ran += 1;
      if (cycle.status === "failed") failed += 1;
      results.push({
        registryId: entry.registryId,
        sourceId: entry.source.sourceId,
        status: cycle.status,
        reason: cycle.status === "failed" ? cycle.reason : null,
      });
    } catch (error) {
      ran += 1;
      failed += 1;
      results.push({
        registryId: entry.registryId,
        sourceId: entry.source.sourceId,
        status: "scheduler_error",
        reason: error instanceof Error ? error.message : "source_scheduler_failed",
      });
    } finally {
      await leases.release({
        sourceId: entry.source.sourceId,
        ownerId,
        now: new Date(),
      });
    }
  }

  const completed = new Date();
  return {
    ok: failed === 0,
    startedAt: started.toISOString(),
    completedAt: completed.toISOString(),
    due,
    ran,
    failed,
    skipped: results.length - ran,
    results,
  };
}
