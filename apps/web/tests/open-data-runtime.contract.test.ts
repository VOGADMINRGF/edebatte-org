import { describe, expect, it } from "vitest";

import { abgeordnetenwatchConnector } from "@features/feeds/connectors/abgeordnetenwatch";
import { createInMemoryOpenDataEventRepository } from "@features/feeds/openDataEventStore";
import { runOpenDataSource } from "@features/feeds/openDataRuntime";
import { createInMemorySourceSnapshotRepository } from "@features/feeds/sourceSnapshotStore";

const body = JSON.stringify({
  meta: {
    abgeordnetenwatch_api: {
      version: "2.0",
      licence: "CC0 1.0",
      licence_link: "https://creativecommons.org/publicdomain/zero/1.0/deed.de",
    },
  },
  data: {
    id: 6454,
    entity_type: "poll",
    label: "Beispielabstimmung",
    api_url: "/api/v2/polls/6454",
    field_poll_date: "2026-09-15",
    field_accepted: true,
  },
});

function source() {
  return abgeordnetenwatchConnector.buildSourceRef({
    resourcePath: "/api/v2/polls/6454",
    regionCode: "EU",
  });
}

describe("open-data source runtime", () => {
  it("uses the canonical snapshot path and persists only snapshot-bound projections", async () => {
    const snapshots = createInMemorySourceSnapshotRepository();
    const events = createInMemoryOpenDataEventRepository();
    const fetchImpl = (async () =>
      new Response(body, {
        status: 200,
        headers: { etag: '"poll-6454-v1"', "content-type": "application/json" },
      })) as typeof fetch;

    const result = await runOpenDataSource({
      connector: abgeordnetenwatchConnector,
      source: source(),
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      fetchImpl,
    });

    expect(result).toMatchObject({ status: "changed", snapshotVersion: 1, insertedEvents: 1 });
    const storedSnapshots = await snapshots.listBySourceId(source().sourceId);
    const storedEvents = await events.listRecent();
    expect(storedSnapshots).toHaveLength(1);
    expect(storedEvents).toHaveLength(1);
    expect(storedEvents[0].event.eventId).toBe("abgeordnetenwatch:poll:6454");
    expect(storedEvents[0].event.provenance.snapshotId).toBe(storedSnapshots[0].snapshotId);
  });

  it("does not create another projection when the source content is unchanged", async () => {
    const snapshots = createInMemorySourceSnapshotRepository();
    const events = createInMemoryOpenDataEventRepository();
    const fetchImpl = (async () => new Response(body, { status: 200 })) as typeof fetch;

    const first = await runOpenDataSource({
      connector: abgeordnetenwatchConnector,
      source: source(),
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      fetchImpl,
    });
    const second = await runOpenDataSource({
      connector: abgeordnetenwatchConnector,
      source: source(),
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      fetchImpl,
    });

    expect(first.status).toBe("changed");
    expect(second).toMatchObject({ status: "not_modified", reason: "same_content_hash" });
    expect(await events.listRecent()).toHaveLength(1);
  });

  it("propagates 429 retry guidance without event writes", async () => {
    const snapshots = createInMemorySourceSnapshotRepository();
    const events = createInMemoryOpenDataEventRepository();
    const result = await runOpenDataSource({
      connector: abgeordnetenwatchConnector,
      source: source(),
      timeoutMs: 5_000,
      snapshotRepository: snapshots,
      eventRepository: events,
      fetchImpl: (async () =>
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "60" },
        })) as typeof fetch,
    });

    expect(result).toMatchObject({
      status: "failed",
      httpStatus: 429,
      retryAfter: "60",
    });
    expect(await events.listRecent()).toEqual([]);
  });

  it("fails closed when a connector is paired with the wrong SourceRef", async () => {
    const mismatched = { ...source(), connector: "other:v1" };
    const result = await runOpenDataSource({
      connector: abgeordnetenwatchConnector,
      source: mismatched,
      timeoutMs: 5_000,
      snapshotRepository: createInMemorySourceSnapshotRepository(),
      eventRepository: createInMemoryOpenDataEventRepository(),
      fetchImpl: (async () => new Response(body, { status: 200 })) as typeof fetch,
    });
    expect(result).toMatchObject({ status: "failed", reason: "open_data_connector_mismatch" });
  });
});
