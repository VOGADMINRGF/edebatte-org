import { describe, expect, it, vi } from "vitest";

import { abgeordnetenwatchConnector } from "@features/feeds/connectors/abgeordnetenwatch";
import { runOpenDataCycle } from "@features/feeds/openDataCycle";
import { createInMemoryOpenDataEventRepository } from "@features/feeds/openDataEventStore";
import { recordFeedSourceAutomationEvent } from "@features/feeds/sourceAutomation";
import { fetchSourceWithSnapshot } from "@features/feeds/sourceFetchRuntime";
import { createInMemorySourceSnapshotRepository } from "@features/feeds/sourceSnapshotStore";
import type { StatementCandidate } from "@features/feeds/types";

const meta = {
  abgeordnetenwatch_api: {
    version: "2.0",
    licence: "CC0 1.0",
    licence_link: "https://creativecommons.org/publicdomain/zero/1.0/deed.de",
  },
};

function pollBody() {
  return JSON.stringify({
    meta,
    data: {
      id: 6454,
      entity_type: "poll",
      label: "Beispielabstimmung",
      api_url: "/api/v2/polls/6454",
      field_poll_date: "2026-09-15",
      field_accepted: false,
      field_legislature: { id: 111 },
      field_topics: [{ id: 12 }],
    },
  });
}

function voteBody() {
  return JSON.stringify({
    meta,
    data: {
      id: 9001,
      entity_type: "vote",
      label: "Einzelstimme 9001",
      api_url: "/api/v2/votes/9001",
      poll: { id: 6454 },
      mandate: { id: 77 },
      fraction: { id: 8 },
      vote: "yes",
    },
  });
}

function pollSource() {
  return abgeordnetenwatchConnector.buildSourceRef({
    resourcePath: "/api/v2/polls/6454",
    regionCode: "EU",
  });
}

function voteSource() {
  return abgeordnetenwatchConnector.buildSourceRef({
    resourcePath: "/api/v2/votes/9001",
    regionCode: "EU",
  });
}

function automationRecorder() {
  return vi.fn(
    async (..._args: Parameters<typeof recordFeedSourceAutomationEvent>) => undefined,
  );
}

function candidateSink() {
  const hashes = new Set<string>();
  return vi.fn(async (candidates: StatementCandidate[]) => {
    let inserted = 0;
    for (const candidate of candidates) {
      if (hashes.has(candidate.canonicalHash)) continue;
      hashes.add(candidate.canonicalHash);
      inserted += 1;
    }
    return { inserted };
  });
}

describe("Open Data health and recovery cycle", () => {
  it("runs a poll through snapshot, event projection, existing candidate sink and health recorder", async () => {
    const snapshots = createInMemorySourceSnapshotRepository();
    const events = createInMemoryOpenDataEventRepository();
    const sink = candidateSink();
    const recorder = automationRecorder();

    const result = await runOpenDataCycle({
      connector: abgeordnetenwatchConnector,
      source: pollSource(),
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      candidateSink: sink,
      automationRecorder: recorder,
      fetchImpl: (async () =>
        new Response(pollBody(), {
          status: 200,
          headers: { etag: '"poll-v1"', "content-type": "application/json" },
        })) as typeof fetch,
    });

    expect(result).toMatchObject({
      status: "changed",
      snapshotVersion: 1,
      parsedEvents: 1,
      insertedEvents: 1,
      candidateCount: 1,
      insertedCandidates: 1,
    });
    expect(await snapshots.listBySourceId(pollSource().sourceId)).toHaveLength(1);
    expect(await events.listRecent()).toHaveLength(1);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: pollSource().sourceId,
        sourceType: "open_data:abgeordnetenwatch:v2",
        runStatus: "success",
        reviewCandidateCount: 1,
      }),
    );
  });

  it("keeps individual vote records as evidence without creating topic candidates", async () => {
    const sink = candidateSink();
    const result = await runOpenDataCycle({
      connector: abgeordnetenwatchConnector,
      source: voteSource(),
      timeoutMs: 5_000,
      snapshotRepository: createInMemorySourceSnapshotRepository(),
      eventRepository: createInMemoryOpenDataEventRepository(),
      candidateSink: sink,
      automationRecorder: automationRecorder(),
      fetchImpl: (async () => new Response(voteBody(), { status: 200 })) as typeof fetch,
    });

    expect(result).toMatchObject({
      status: "changed",
      parsedEvents: 1,
      candidateCount: 0,
      insertedCandidates: 0,
    });
    expect(sink).not.toHaveBeenCalled();
  });

  it("propagates 429 retry guidance into the existing automation health event", async () => {
    const recorder = automationRecorder();
    const result = await runOpenDataCycle({
      connector: abgeordnetenwatchConnector,
      source: pollSource(),
      timeoutMs: 5_000,
      snapshotRepository: createInMemorySourceSnapshotRepository(),
      eventRepository: createInMemoryOpenDataEventRepository(),
      candidateSink: candidateSink(),
      automationRecorder: recorder,
      fetchImpl: (async () =>
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "120" },
        })) as typeof fetch,
    });

    expect(result).toMatchObject({
      status: "failed",
      httpStatus: 429,
      retryAfter: "120",
      reason: "source_fetch_failed_429",
    });
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        runStatus: "error",
        error: "source_fetch_failed_429 retry_after=120",
      }),
    );
  });

  it("recovers a missing projection from the same payload without inventing snapshot v2", async () => {
    const snapshots = createInMemorySourceSnapshotRepository();
    const events = createInMemoryOpenDataEventRepository();
    const sink = candidateSink();
    const source = pollSource();

    await fetchSourceWithSnapshot({
      source,
      timeoutMs: 5_000,
      repository: snapshots,
      fetchImpl: (async () =>
        new Response(pollBody(), {
          status: 200,
          headers: { etag: '"stable"', "content-type": "application/json" },
        })) as typeof fetch,
    });

    let calls = 0;
    const result = await runOpenDataCycle({
      connector: abgeordnetenwatchConnector,
      source,
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      candidateSink: sink,
      automationRecorder: automationRecorder(),
      fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
        calls += 1;
        const headers = new Headers(init?.headers);
        if (calls === 1) {
          expect(headers.get("if-none-match")).toBe('"stable"');
          return new Response(null, { status: 304 });
        }
        expect(headers.get("if-none-match")).toBeNull();
        return new Response(pollBody(), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch,
    });

    expect(result).toMatchObject({
      status: "recovered",
      snapshotVersion: 1,
      parsedEvents: 1,
      insertedEvents: 1,
      candidateCount: 1,
      insertedCandidates: 1,
    });
    expect(calls).toBe(2);
    expect(await snapshots.listBySourceId(source.sourceId)).toHaveLength(1);
    expect(await events.listRecent()).toHaveLength(1);
  });

  it("retries candidate persistence from an existing event projection on unchanged content", async () => {
    const snapshots = createInMemorySourceSnapshotRepository();
    const events = createInMemoryOpenDataEventRepository();
    const sink = candidateSink();
    const fetchImpl = (async () => new Response(pollBody(), { status: 200 })) as typeof fetch;

    const first = await runOpenDataCycle({
      connector: abgeordnetenwatchConnector,
      source: pollSource(),
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      candidateSink: sink,
      automationRecorder: automationRecorder(),
      fetchImpl,
    });
    const second = await runOpenDataCycle({
      connector: abgeordnetenwatchConnector,
      source: pollSource(),
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      candidateSink: sink,
      automationRecorder: automationRecorder(),
      fetchImpl,
    });

    expect(first).toMatchObject({ status: "changed", insertedCandidates: 1 });
    expect(second).toMatchObject({
      status: "not_modified",
      candidateCount: 1,
      insertedCandidates: 0,
    });
    expect(await snapshots.listBySourceId(pollSource().sourceId)).toHaveLength(1);
    expect(await events.listRecent()).toHaveLength(1);
  });
});
