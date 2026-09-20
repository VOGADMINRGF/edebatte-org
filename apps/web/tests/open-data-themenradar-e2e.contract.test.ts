import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => {
  const voteDrafts: Array<Record<string, any>> = [];

  function reset() {
    voteDrafts.splice(0, voteDrafts.length);
  }

  function cursor(items: Array<Record<string, any>>) {
    const value = {
      find() {
        return value;
      },
      sort() {
        return value;
      },
      limit() {
        return value;
      },
      async toArray() {
        return items.map((item) => ({ ...item }));
      },
    };
    return value;
  }

  return { voteDrafts, reset, cursor };
});

vi.mock("@core/db/triMongo", async () => {
  const mongodb = await import("mongodb");
  return {
    ObjectId: mongodb.ObjectId,
    getCol: async () => memory.cursor([]),
    coreCol: async () => ({
      async insertOne(doc: Record<string, any>) {
        return { insertedId: doc._id ?? new mongodb.ObjectId() };
      },
      async bulkWrite() {
        return { upsertedCount: 0 };
      },
      find() {
        return memory.cursor([]);
      },
      async findOne() {
        return null;
      },
    }),
  };
});

vi.mock("@features/feeds/db", async () => {
  const mongodb = await import("mongodb");
  const sameId = (left: unknown, right: unknown) => {
    const read = (value: unknown) =>
      value && typeof value === "object" && "toHexString" in (value as Record<string, unknown>)
        ? (value as { toHexString(): string }).toHexString()
        : String(value ?? "");
    return read(left) === read(right);
  };

  return {
    voteDraftsCol: async () => ({
      async findOne(filter: Record<string, any>) {
        const row = memory.voteDrafts.find((draft) =>
          filter.statementCandidateId
            ? sameId(draft.statementCandidateId, filter.statementCandidateId)
            : filter._id
              ? sameId(draft._id, filter._id)
              : false,
        );
        return row ? { ...row } : null;
      },
      async insertOne(doc: Record<string, any>) {
        const insertedId = new mongodb.ObjectId();
        memory.voteDrafts.push({ ...doc, _id: insertedId });
        return { insertedId };
      },
      find() {
        return memory.cursor(memory.voteDrafts);
      },
    }),
    statementCandidatesCol: async () => ({
      async insertOne() {
        return { insertedId: new mongodb.ObjectId() };
      },
      async findOne() {
        return null;
      },
      find() {
        return memory.cursor([]);
      },
      async bulkWrite() {
        return { upsertedCount: 0 };
      },
    }),
    feedAnlassraumClusterCandidatesCol: async () => memory.cursor([]),
  };
});

vi.mock("@features/anlassraum/db", () => ({
  anlassraumCol: async () => memory.cursor([]),
}));

vi.mock("@features/dossier/db", () => ({
  dossierSuggestionsCol: async () => memory.cursor([]),
}));

vi.mock("@features/dossier/server/studioPersistence", () => ({
  getDossierStudioWorkspaceRepo: () => ({
    async getDossierStudioWorkspace() {
      return null;
    },
  }),
}));

vi.mock("@/features/create/persistedHandoffReviewQueue", () => ({
  buildPersistedCreateHandoffSummary: (record: { id: string }) => record.id,
  listPersistedCreateHandoffRecords: async () => [],
}));

vi.mock("@/features/material/materialExtractionJobs", () => ({
  listMaterialExtractionThemenradarSeeds: async () => [],
}));

vi.mock("@/features/ai/v2OrchestrationPolicy", () => ({
  resolveAiFlowIntegration: () => ({
    lane: "review_assist",
    laneLabel: "Review Assist",
    outputLabel: "Draft only",
  }),
}));

vi.mock("@/features/swipes/publicTopicSupply", () => ({
  buildPublicTopicSupplyReadModel: async () => ({
    items: [],
    summary: {
      totalVisible: 0,
      reviewRequired: 0,
      buckets: [],
      sources: [],
      nextAction: { label: "Swipes prüfen", description: "Leer", href: "/swipes" },
    },
  }),
}));

import { ObjectId } from "@core/db/triMongo";
import { abgeordnetenwatchConnector } from "@features/feeds/connectors/abgeordnetenwatch";
import { buildOpenDataStatementCandidates } from "@features/feeds/openDataCandidateBridge";
import { createDurableSourceSnapshot } from "@features/feeds/sourceSnapshot";
import { createDraftFromAnalyzeResult } from "@features/feeds/voteDrafts";
import { buildAutonomousThemenradarReadModel } from "@features/themenradar/autonomousSupply";

describe("Open Data → Themenradar hard E2E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memory.reset();
  });

  it("keeps provenance and review gates from provider payload to canonical topic radar", async () => {
    const source = abgeordnetenwatchConnector.buildSourceRef({
      resourcePath: "/api/v2/polls?range_start=0&range_end=1",
      regionCode: "DE:BE",
      topicHints: ["mobilitaet"],
      label: "Abgeordnetenwatch Testfenster",
    });
    const body = JSON.stringify({
      meta: {
        abgeordnetenwatch_api: {
          version: "2",
          licence: "CC0 1.0",
          licence_link: "https://creativecommons.org/publicdomain/zero/1.0/deed.de",
        },
      },
      data: [
        {
          entity_type: "poll",
          id: 4242,
          label: "Abstimmung zum ÖPNV-Ausbau",
          api_url: "/api/v2/polls/4242",
          field_poll_date: "2026-09-19T12:00:00+02:00",
          field_accepted: true,
          field_legislature: { id: 99 },
          field_topics: [{ id: 7 }],
          field_committees: [{ id: 3 }],
        },
      ],
    });
    const snapshot = createDurableSourceSnapshot({
      source,
      response: {
        status: 200,
        body,
        mime: "application/json",
        licence: "CC0 1.0",
        licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.de",
      },
      retrievedAt: new Date("2026-09-20T08:00:00.000Z"),
    });

    const parsed = abgeordnetenwatchConnector.parseSnapshot({ body, source, snapshot });
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]).toMatchObject({
      eventId: "abgeordnetenwatch:poll:4242",
      entityType: "poll",
      role: "civic_event_record",
      jurisdictionCode: "DE:BE",
      reviewRequired: true,
      autoPublishAllowed: false,
      provenance: {
        sourceId: source.sourceId,
        snapshotId: snapshot.snapshotId,
        apiVersion: "2",
        licence: "CC0 1.0",
      },
    });

    const [candidate] = buildOpenDataStatementCandidates(parsed.events);
    expect(candidate).toBeTruthy();
    candidate._id = new ObjectId("65f100000000000000000424");
    expect(candidate.regionCode).toMatchObject({ countryCode: "DE", subRegionCode: "BE" });
    expect(candidate.sourceContent).toContain(snapshot.snapshotId);

    const analyzeResult = {
      _id: new ObjectId("65f100000000000000000425"),
      statementCandidateId: candidate._id,
      mode: "E150" as const,
      sourceText: candidate.sourceContent ?? candidate.sourceTitle,
      language: "de",
      claims: [
        {
          id: "claim-mobility-1",
          text: "Die Quelle dokumentiert eine parlamentarische Abstimmung zum ÖPNV-Ausbau.",
          title: "ÖPNV-Ausbau",
          topic: "mobilitaet",
          responsibility: "Land Berlin",
        },
      ],
      notes: [],
      questions: [],
      knots: [],
      createdAt: new Date("2026-09-20T08:01:00.000Z"),
    };

    await createDraftFromAnalyzeResult(candidate, analyzeResult as any);
    expect(memory.voteDrafts).toHaveLength(1);
    expect(memory.voteDrafts[0]).toMatchObject({
      status: "draft",
      feedReviewState: "queued",
      regionCode: "DE:BE",
      sourceUrl: "https://www.abgeordnetenwatch.de/api/v2/polls/4242",
    });

    const radar = await buildAutonomousThemenradarReadModel({
      scope: { viewerRegionIds: ["DE:BE"], adminContext: true },
      limit: 10,
    });

    expect(radar.summary.totalClusters).toBe(1);
    expect(radar.summary.reviewRequired).toBe(1);
    expect(radar.items[0]).toMatchObject({
      sourceTypes: ["feed"],
      topicLabel: "mobilitaet",
      regionId: "DE:BE",
      reviewRequired: true,
      autoPublishAllowed: false,
      dossierContext: false,
      anlassraumContext: false,
      visibleInSwipes: false,
      nextSuggestedAction: {
        key: "attach_dossier",
        href: "/admin/review",
      },
      aiOrchestration: {
        reviewRequired: true,
        draftOnly: true,
        publicOutputAllowed: false,
      },
    });
    expect(radar.items[0]?.evidenceHints).toContain(
      "https://www.abgeordnetenwatch.de/api/v2/polls/4242",
    );
  });
});
