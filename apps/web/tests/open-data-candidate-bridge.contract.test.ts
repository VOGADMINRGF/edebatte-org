import { describe, expect, it, vi } from "vitest";

import {
  buildOpenDataEventFingerprint,
  buildOpenDataStatementCandidates,
  openDataEventToStatementCandidate,
  persistOpenDataStatementCandidates,
} from "@features/feeds/openDataCandidateBridge";
import type { NormalizedOpenDataEvent } from "@features/feeds/openDataConnector";
import type { StatementCandidate } from "@features/feeds/types";

function pollEvent(overrides: Partial<NormalizedOpenDataEvent> = {}): NormalizedOpenDataEvent {
  return {
    eventId: "abgeordnetenwatch:poll:6454",
    providerId: "abgeordnetenwatch",
    entityType: "poll",
    role: "civic_event_record",
    label: "Beispielabstimmung",
    sourceUrl: "https://www.abgeordnetenwatch.de/api/v2/polls/6454",
    occurredAt: "2026-09-15T00:00:00.000Z",
    parentEventId: null,
    jurisdictionCode: "EU",
    topicIds: ["abgeordnetenwatch:topic:12"],
    organizationIds: ["abgeordnetenwatch:committee:44"],
    attributes: { accepted: false, legislatureId: "111" },
    provenance: {
      providerId: "abgeordnetenwatch",
      sourceId: "source:abgeordnetenwatch:polls",
      snapshotId: "snapshot-v1",
      retrievedAt: "2026-09-19T10:00:00.000Z",
      apiVersion: "2.0",
      licence: "CC0 1.0",
      licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.de",
      sourceUrl: "https://www.abgeordnetenwatch.de/api/v2/polls/6454",
    },
    reviewRequired: true,
    autoPublishAllowed: false,
    ...overrides,
  };
}

function voteEvent(): NormalizedOpenDataEvent {
  return {
    ...pollEvent(),
    eventId: "abgeordnetenwatch:vote:9001",
    entityType: "vote",
    role: "individual_vote_record",
    label: "Einzelstimme 9001",
    parentEventId: "abgeordnetenwatch:poll:6454",
    attributes: { vote: "yes", pollId: "6454" },
  };
}

describe("Open Data → StatementCandidate bridge", () => {
  it("fingerprints the normalized event rather than its snapshot revision", () => {
    const first = pollEvent();
    const laterSnapshot = pollEvent({
      provenance: {
        ...first.provenance,
        snapshotId: "snapshot-v2",
        retrievedAt: "2026-09-20T10:00:00.000Z",
      },
    });

    expect(buildOpenDataEventFingerprint(laterSnapshot)).toBe(
      buildOpenDataEventFingerprint(first),
    );
    expect(
      buildOpenDataEventFingerprint(
        pollEvent({ attributes: { accepted: true, legislatureId: "111" } }),
      ),
    ).not.toBe(buildOpenDataEventFingerprint(first));
  });

  it("creates review-pipeline candidates for poll events", () => {
    const event = pollEvent();
    const candidate = openDataEventToStatementCandidate(event);

    expect(candidate).not.toBeNull();
    expect(candidate).toMatchObject({
      sourceUrl: event.sourceUrl,
      sourceTitle: event.label,
      sourceName: "abgeordnetenwatch",
      sourceType: "open_data:abgeordnetenwatch:poll",
      regionCode: { countryCode: "EU" },
      analyzeStatus: "pending",
      canonicalHash: buildOpenDataEventFingerprint(event),
    });
    expect(candidate?.sourceContent).toContain('"snapshotId":"snapshot-v1"');
  });

  it("fails closed when durable provenance or review gates are missing", () => {
    const valid = pollEvent();
    const missingSnapshot = pollEvent({
      provenance: {
        ...valid.provenance,
        snapshotId: "",
      },
    });
    const mismatchedSource = pollEvent({
      provenance: {
        ...valid.provenance,
        sourceUrl: "https://www.abgeordnetenwatch.de/api/v2/polls/other",
      },
    });
    const unsafeReviewGate = {
      ...valid,
      reviewRequired: false,
    } as unknown as NormalizedOpenDataEvent;

    expect(() => openDataEventToStatementCandidate(missingSnapshot)).toThrow(
      "open_data_candidate_provenance_incomplete",
    );
    expect(() => openDataEventToStatementCandidate(mismatchedSource)).toThrow(
      "open_data_candidate_provenance_incomplete",
    );
    expect(() => openDataEventToStatementCandidate(unsafeReviewGate)).toThrow(
      "open_data_candidate_review_gate_invalid",
    );
  });

  it("keeps individual votes out of the topic-candidate pipeline", () => {
    expect(openDataEventToStatementCandidate(voteEvent())).toBeNull();
    expect(buildOpenDataStatementCandidates([pollEvent(), voteEvent()])).toHaveLength(1);
  });

  it("uses the existing StatementCandidate sink and never creates a parallel queue", async () => {
    const sink = vi.fn(async (candidates: StatementCandidate[]) => ({ inserted: candidates.length }));
    const result = await persistOpenDataStatementCandidates({
      events: [pollEvent(), voteEvent()],
      sink,
    });

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0]?.[0]).toHaveLength(1);
    expect(result.inserted).toBe(1);
    expect(result.candidates).toHaveLength(1);
  });
});
