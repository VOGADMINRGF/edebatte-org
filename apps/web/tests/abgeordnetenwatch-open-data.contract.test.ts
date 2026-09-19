import { describe, expect, it } from "vitest";

import { abgeordnetenwatchConnector } from "@features/feeds/connectors/abgeordnetenwatch";
import { createDurableSourceSnapshot } from "@features/feeds/sourceSnapshot";

function snapshotFor(body: string, resourcePath = "/api/v2/polls/6454") {
  const source = abgeordnetenwatchConnector.buildSourceRef({
    resourcePath,
    regionCode: "EU",
    topicHints: ["Abstimmung"],
  });
  const snapshot = createDurableSourceSnapshot({
    source,
    response: {
      status: 200,
      body,
      mime: "application/json",
    },
    retrievedAt: new Date("2026-09-19T10:00:00.000Z"),
  });
  return { source, snapshot };
}

const meta = {
  abgeordnetenwatch_api: {
    version: "2.0",
    licence: "CC0 1.0",
    licence_link: "https://creativecommons.org/publicdomain/zero/1.0/deed.de",
  },
};

describe("abgeordnetenwatch open-data connector", () => {
  it("builds a canonical open-data SourceRef without entering the RSS runtime", () => {
    const source = abgeordnetenwatchConnector.buildSourceRef({
      resourcePath: "/api/v2/polls/6454",
      regionCode: "EU",
    });

    expect(source.kind).toBe("open_data");
    expect(source.connector).toBe("abgeordnetenwatch:v2");
    expect(source.href).toBe("https://www.abgeordnetenwatch.de/api/v2/polls/6454");
    expect(source.reviewRequired).toBe(true);
    expect(source.autoPublishAllowed).toBe(false);
  });

  it("normalizes a poll as civic event data with snapshot-bound provenance", () => {
    const body = JSON.stringify({
      meta,
      data: {
        id: 6454,
        entity_type: "poll",
        label: "Beispielabstimmung",
        api_url: "/api/v2/polls/6454",
        field_poll_date: "2026-09-15",
        field_accepted: false,
        field_legislature: { id: 111 },
        field_topics: [{ id: 12 }, { id: 13 }],
        field_committees: [{ id: 44 }],
      },
    });
    const { source, snapshot } = snapshotFor(body);
    const result = abgeordnetenwatchConnector.parseSnapshot({ body, source, snapshot });

    expect(result.warnings).toEqual([]);
    expect(result.provenance).toMatchObject({
      providerId: "abgeordnetenwatch",
      snapshotId: snapshot.snapshotId,
      apiVersion: "2.0",
      licence: "CC0 1.0",
    });
    expect(result.events).toEqual([
      expect.objectContaining({
        eventId: "abgeordnetenwatch:poll:6454",
        entityType: "poll",
        role: "civic_event_record",
        occurredAt: "2026-09-15T00:00:00.000Z",
        parentEventId: null,
        jurisdictionCode: "EU",
        topicIds: ["abgeordnetenwatch:topic:12", "abgeordnetenwatch:topic:13"],
        organizationIds: ["abgeordnetenwatch:committee:44"],
        attributes: expect.objectContaining({ accepted: false, legislatureId: "111" }),
        reviewRequired: true,
        autoPublishAllowed: false,
      }),
    ]);
  });

  it("keeps individual votes separate from their parent poll", () => {
    const body = JSON.stringify({
      meta,
      data: [
        {
          id: 9001,
          entity_type: "vote",
          label: "Person A – Beispielabstimmung",
          api_url: "/api/v2/votes/9001",
          poll: { id: 6454 },
          mandate: { id: 77 },
          fraction: { id: 8 },
          vote: "abstain",
        },
      ],
    });
    const { source, snapshot } = snapshotFor(body, "/api/v2/votes?poll=6454");
    const result = abgeordnetenwatchConnector.parseSnapshot({ body, source, snapshot });

    expect(result.events).toEqual([
      expect.objectContaining({
        eventId: "abgeordnetenwatch:vote:9001",
        entityType: "vote",
        role: "individual_vote_record",
        parentEventId: "abgeordnetenwatch:poll:6454",
        organizationIds: ["abgeordnetenwatch:fraction:8", "abgeordnetenwatch:mandate:77"],
        attributes: expect.objectContaining({ vote: "abstain", pollId: "6454" }),
      }),
    ]);
  });

  it("accepts provider meta as object or single-entry array", () => {
    const body = JSON.stringify({
      meta: { abgeordnetenwatch_api: [meta.abgeordnetenwatch_api] },
      data: { id: 1, entity_type: "topic", label: "Digitales", api_url: "/api/v2/topics/1" },
    });
    const { source, snapshot } = snapshotFor(body, "/api/v2/topics/1");
    const result = abgeordnetenwatchConnector.parseSnapshot({ body, source, snapshot });
    expect(result.provenance).toMatchObject({ apiVersion: "2.0", licence: "CC0 1.0" });
  });

  it("fails closed for malformed JSON and non-v2 paths", () => {
    const { source, snapshot } = snapshotFor("{}", "/api/v2/polls/6454");
    expect(() =>
      abgeordnetenwatchConnector.parseSnapshot({ body: "not-json", source, snapshot }),
    ).toThrow("abgeordnetenwatch_invalid_json");
    expect(() =>
      abgeordnetenwatchConnector.buildSourceRef({ resourcePath: "/api/v1/polls" }),
    ).toThrow("abgeordnetenwatch_api_v2_path_required");
  });
});
