import {
  buildOpenDataStatementCandidates,
  persistOpenDataStatementCandidates,
  type OpenDataCandidateSink,
} from "./openDataCandidateBridge";
import type { OpenDataConnector, OpenDataParseResult } from "./openDataConnector";
import {
  getOpenDataEventRepository,
  type OpenDataEventRepository,
} from "./openDataEventStore";
import { runOpenDataSource } from "./openDataRuntime";
import { fetchSourceWithSnapshot } from "./sourceFetchRuntime";
import { recordFeedSourceAutomationEvent } from "./sourceAutomation";
import type { SourceSnapshotRepository } from "./sourceSnapshotStore";
import type { SourceRef } from "./sourceRef";

export type OpenDataCycleResult =
  | {
      status: "changed" | "recovered";
      sourceId: string;
      snapshotId: string;
      snapshotVersion: number;
      parsedEvents: number;
      insertedEvents: number;
      duplicateEvents: number;
      candidateCount: number;
      insertedCandidates: number;
    }
  | {
      status: "not_modified";
      sourceId: string;
      snapshotId: string | null;
      candidateCount: number;
      insertedCandidates: number;
    }
  | {
      status: "failed";
      sourceId: string;
      reason: string;
      httpStatus: number | null;
      retryAfter: string | null;
    };

type AutomationRecorder = typeof recordFeedSourceAutomationEvent;

type OpenDataCycleInput = {
  connector: OpenDataConnector;
  source: SourceRef;
  timeoutMs: number;
  persist?: boolean;
  snapshotRepository?: SourceSnapshotRepository;
  eventRepository?: OpenDataEventRepository;
  candidateSink?: OpenDataCandidateSink;
  fetchImpl?: typeof fetch;
  automationRecorder?: AutomationRecorder;
};

function errorWithRetry(reason: string, retryAfter: string | null) {
  return retryAfter ? `${reason} retry_after=${retryAfter}` : reason;
}

async function recordCycle(input: OpenDataCycleInput, event: {
  runStatus: "success" | "error" | "dry_run";
  fetchedItems: number;
  insertedSignals: number;
  reviewCandidateCount: number;
  error?: string | null;
  retryAfter?: string | null;
}) {
  const recorder = input.automationRecorder ?? recordFeedSourceAutomationEvent;
  await recorder({
    sourceId: input.source.sourceId,
    regionId: input.source.regionCode,
    sourceType: `open_data:${input.connector.connectorId}`,
    sourceLabel: input.connector.providerLabel,
    sourceHref: input.source.href,
    automationMode: "cron_ready",
    runStatus: event.runStatus,
    completedAt: new Date(),
    fetchedItems: event.fetchedItems,
    insertedSignals: event.insertedSignals,
    reviewCandidateCount: event.reviewCandidateCount,
    error: event.error ?? null,
    retryAfter: event.retryAfter ?? null,
  });
}

async function persistCandidates(input: OpenDataCycleInput, parse: OpenDataParseResult) {
  const candidates = buildOpenDataStatementCandidates(parse.events);
  if (input.persist === false) {
    return { candidateCount: candidates.length, insertedCandidates: 0 };
  }
  const persisted = await persistOpenDataStatementCandidates({
    events: parse.events,
    sink: input.candidateSink,
  });
  return {
    candidateCount: persisted.candidates.length,
    insertedCandidates: persisted.inserted,
  };
}

async function repairProjection(input: OpenDataCycleInput, eventRepository: OpenDataEventRepository) {
  const recovered = await fetchSourceWithSnapshot({
    source: input.source,
    timeoutMs: input.timeoutMs,
    persist: input.persist,
    conditional: false,
    repository: input.snapshotRepository,
    fetchImpl: input.fetchImpl,
    userAgent: `eDebatte/source-intelligence ${input.connector.connectorId} recovery (+https://edebatte.eu)`,
  });

  if (recovered.status === "failed") {
    return {
      ok: false as const,
      reason: recovered.reason,
      httpStatus: recovered.httpStatus,
      retryAfter: recovered.retryAfter,
    };
  }
  if (!recovered.snapshot || typeof recovered.body !== "string") {
    return {
      ok: false as const,
      reason: "open_data_projection_recovery_body_missing",
      httpStatus: recovered.httpStatus,
      retryAfter: null,
    };
  }

  let parse: OpenDataParseResult;
  try {
    parse = input.connector.parseSnapshot({
      body: recovered.body,
      source: input.source,
      snapshot: recovered.snapshot,
    });
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "open_data_projection_recovery_parse_failed",
      httpStatus: recovered.httpStatus,
      retryAfter: null,
    };
  }

  const stored =
    input.persist === false
      ? { inserted: 0, duplicates: 0 }
      : await eventRepository.appendMany(parse.events);
  const candidates = await persistCandidates(input, parse);
  return {
    ok: true as const,
    snapshot: recovered.snapshot,
    parse,
    insertedEvents: stored.inserted,
    duplicateEvents: stored.duplicates,
    ...candidates,
  };
}

export async function runOpenDataCycle(
  input: OpenDataCycleInput,
): Promise<OpenDataCycleResult> {
  const eventRepository = input.eventRepository ?? getOpenDataEventRepository();
  let runtime;
  try {
    runtime = await runOpenDataSource({
      connector: input.connector,
      source: input.source,
      timeoutMs: input.timeoutMs,
      persist: input.persist,
      snapshotRepository: input.snapshotRepository,
      eventRepository,
      fetchImpl: input.fetchImpl,
    });
  } catch (error) {
    const repair = await repairProjection(input, eventRepository).catch(() => null);
    if (repair?.ok) {
      await recordCycle(input, {
        runStatus: input.persist === false ? "dry_run" : "success",
        fetchedItems: repair.parse.events.length,
        insertedSignals: repair.insertedCandidates,
        reviewCandidateCount: repair.candidateCount,
      });
      return {
        status: "recovered",
        sourceId: input.source.sourceId,
        snapshotId: repair.snapshot.snapshotId,
        snapshotVersion: repair.snapshot.version,
        parsedEvents: repair.parse.events.length,
        insertedEvents: repair.insertedEvents,
        duplicateEvents: repair.duplicateEvents,
        candidateCount: repair.candidateCount,
        insertedCandidates: repair.insertedCandidates,
      };
    }
    const reason =
      repair && !repair.ok
        ? repair.reason
        : error instanceof Error
          ? error.message
          : "open_data_cycle_failed";
    const httpStatus = repair && !repair.ok ? repair.httpStatus : null;
    const retryAfter = repair && !repair.ok ? repair.retryAfter : null;
    await recordCycle(input, {
      runStatus: "error",
      fetchedItems: 0,
      insertedSignals: 0,
      reviewCandidateCount: 0,
      error: errorWithRetry(reason, retryAfter),
      retryAfter,
    });
    return {
      status: "failed",
      sourceId: input.source.sourceId,
      reason,
      httpStatus,
      retryAfter,
    };
  }

  if (runtime.status === "failed") {
    await recordCycle(input, {
      runStatus: "error",
      fetchedItems: 0,
      insertedSignals: 0,
      reviewCandidateCount: 0,
      error: errorWithRetry(runtime.reason, runtime.retryAfter),
      retryAfter: runtime.retryAfter,
    });
    return {
      status: "failed",
      sourceId: input.source.sourceId,
      reason: runtime.reason,
      httpStatus: runtime.httpStatus,
      retryAfter: runtime.retryAfter,
    };
  }

  if (runtime.status === "changed") {
    const candidates = await persistCandidates(input, runtime.parse);
    await recordCycle(input, {
      runStatus: input.persist === false ? "dry_run" : "success",
      fetchedItems: runtime.parse.events.length,
      insertedSignals: candidates.insertedCandidates,
      reviewCandidateCount: candidates.candidateCount,
    });
    return {
      status: "changed",
      sourceId: input.source.sourceId,
      snapshotId: runtime.snapshotId,
      snapshotVersion: runtime.snapshotVersion,
      parsedEvents: runtime.parse.events.length,
      insertedEvents: runtime.insertedEvents,
      duplicateEvents: runtime.duplicateEvents,
      ...candidates,
    };
  }

  if (input.persist !== false && runtime.snapshotId) {
    const existing = (await eventRepository.listRecent({ limit: 500 }))
      .filter((projection) => projection.event.provenance.snapshotId === runtime.snapshotId)
      .map((projection) => projection.event);
    if (existing.length > 0) {
      const persisted = await persistOpenDataStatementCandidates({
        events: existing,
        sink: input.candidateSink,
      });
      await recordCycle(input, {
        runStatus: "success",
        fetchedItems: 0,
        insertedSignals: persisted.inserted,
        reviewCandidateCount: persisted.candidates.length,
      });
      return {
        status: "not_modified",
        sourceId: input.source.sourceId,
        snapshotId: runtime.snapshotId,
        candidateCount: persisted.candidates.length,
        insertedCandidates: persisted.inserted,
      };
    }

    const repair = await repairProjection(input, eventRepository);
    if (repair.ok) {
      await recordCycle(input, {
        runStatus: "success",
        fetchedItems: repair.parse.events.length,
        insertedSignals: repair.insertedCandidates,
        reviewCandidateCount: repair.candidateCount,
      });
      return {
        status: "recovered",
        sourceId: input.source.sourceId,
        snapshotId: repair.snapshot.snapshotId,
        snapshotVersion: repair.snapshot.version,
        parsedEvents: repair.parse.events.length,
        insertedEvents: repair.insertedEvents,
        duplicateEvents: repair.duplicateEvents,
        candidateCount: repair.candidateCount,
        insertedCandidates: repair.insertedCandidates,
      };
    }

    await recordCycle(input, {
      runStatus: "error",
      fetchedItems: 0,
      insertedSignals: 0,
      reviewCandidateCount: 0,
      error: errorWithRetry(repair.reason, repair.retryAfter),
      retryAfter: repair.retryAfter,
    });
    return {
      status: "failed",
      sourceId: input.source.sourceId,
      reason: repair.reason,
      httpStatus: repair.httpStatus,
      retryAfter: repair.retryAfter,
    };
  }

  await recordCycle(input, {
    runStatus: input.persist === false ? "dry_run" : "success",
    fetchedItems: 0,
    insertedSignals: 0,
    reviewCandidateCount: 0,
  });
  return {
    status: "not_modified",
    sourceId: input.source.sourceId,
    snapshotId: runtime.snapshotId,
    candidateCount: 0,
    insertedCandidates: 0,
  };
}
