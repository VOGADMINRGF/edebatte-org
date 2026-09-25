import type { OpenDataConnector, OpenDataParseResult } from "./openDataConnector";
import {
  getOpenDataEventRepository,
  type OpenDataEventRepository,
} from "./openDataEventStore";
import { fetchSourceWithSnapshot } from "./sourceFetchRuntime";
import type { SourceSnapshotRepository } from "./sourceSnapshotStore";
import type { SourceRef } from "./sourceRef";

export type OpenDataRuntimeResult =
  | {
      status: "changed";
      source: SourceRef;
      snapshotId: string;
      snapshotVersion: number;
      parse: OpenDataParseResult;
      insertedEvents: number;
      duplicateEvents: number;
    }
  | {
      status: "not_modified";
      source: SourceRef;
      snapshotId: string | null;
      reason: "http_304" | "same_content_hash";
    }
  | {
      status: "failed";
      source: SourceRef;
      reason: string;
      httpStatus: number | null;
      retryAfter: string | null;
    };

export async function runOpenDataSource(input: {
  connector: OpenDataConnector;
  source: SourceRef;
  timeoutMs: number;
  persist?: boolean;
  snapshotRepository?: SourceSnapshotRepository;
  eventRepository?: OpenDataEventRepository;
  fetchImpl?: typeof fetch;
}): Promise<OpenDataRuntimeResult> {
  if (input.source.kind !== "api" && input.source.kind !== "open_data") {
    return {
      status: "failed",
      source: input.source,
      reason: "open_data_source_kind_required",
      httpStatus: null,
      retryAfter: null,
    };
  }
  if (input.source.connector !== input.connector.connectorId) {
    return {
      status: "failed",
      source: input.source,
      reason: "open_data_connector_mismatch",
      httpStatus: null,
      retryAfter: null,
    };
  }

  const fetched = await fetchSourceWithSnapshot({
    source: input.source,
    timeoutMs: input.timeoutMs,
    persist: input.persist,
    repository: input.snapshotRepository,
    fetchImpl: input.fetchImpl,
    userAgent: `eDebatte/source-intelligence ${input.connector.connectorId} (+https://edebatte.eu)`,
  });

  if (fetched.status === "failed") {
    return {
      status: "failed",
      source: input.source,
      reason: fetched.reason,
      httpStatus: fetched.httpStatus,
      retryAfter: fetched.retryAfter,
    };
  }
  if (fetched.status === "not_modified") {
    return {
      status: "not_modified",
      source: input.source,
      snapshotId: fetched.snapshot?.snapshotId ?? null,
      reason: fetched.reason,
    };
  }

  let parsed: OpenDataParseResult;
  try {
    parsed = input.connector.parseSnapshot({
      body: fetched.body,
      source: input.source,
      snapshot: fetched.snapshot,
    });
  } catch (error) {
    return {
      status: "failed",
      source: input.source,
      reason: error instanceof Error ? error.message : "open_data_parse_failed",
      httpStatus: fetched.httpStatus,
      retryAfter: null,
    };
  }

  if (input.persist === false) {
    return {
      status: "changed",
      source: input.source,
      snapshotId: fetched.snapshot.snapshotId,
      snapshotVersion: fetched.snapshot.version,
      parse: parsed,
      insertedEvents: 0,
      duplicateEvents: 0,
    };
  }

  const eventRepository = input.eventRepository ?? getOpenDataEventRepository();
  const stored = await eventRepository.appendMany(parsed.events);
  return {
    status: "changed",
    source: input.source,
    snapshotId: fetched.snapshot.snapshotId,
    snapshotVersion: fetched.snapshot.version,
    parse: parsed,
    insertedEvents: stored.inserted,
    duplicateEvents: stored.duplicates,
  };
}
