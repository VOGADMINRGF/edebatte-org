import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@features/feeds/feedConfig", () => ({
  loadFeeds: vi.fn(async () => ({ config: {}, searched: [], source: "test" })),
  collectFeedRefs: vi.fn(() => ({ feedRefs: [], invalidFeedUrls: [] })),
}));

vi.mock("@features/region/server/sourceConnectionRuntime", () => ({
  listRegionSourceConnections: vi.fn(async () => []),
  listRegionSourceTestResults: vi.fn(async () => []),
}));

import {
  buildFeedSourceAutomationReadModel,
  createInMemoryFeedSourceAutomationRepo,
  recordFeedSourceAutomationEvent,
  setFeedSourceAutomationRepoForTests,
} from "@features/feeds/sourceAutomation";

afterEach(() => {
  setFeedSourceAutomationRepoForTests(null);
});

describe("Open Data source health", () => {
  it("honors a longer provider Retry-After as the minimum backoff", async () => {
    const repo = createInMemoryFeedSourceAutomationRepo();
    setFeedSourceAutomationRepoForTests(repo);
    const completedAt = new Date("2099-09-19T10:00:00.000Z");

    await recordFeedSourceAutomationEvent({
      sourceId: "source:abgeordnetenwatch:polls",
      regionId: "EU",
      sourceType: "open_data:abgeordnetenwatch:v2",
      sourceLabel: "abgeordnetenwatch.de",
      sourceHref: "https://www.abgeordnetenwatch.de/api/v2/polls",
      automationMode: "cron_ready",
      runStatus: "error",
      completedAt,
      error: "source_fetch_failed_429",
      retryAfter: "7200",
    });

    const state = await repo.getState("source:abgeordnetenwatch:polls");
    expect(state?.backoffUntil).toBe("2099-09-19T12:00:00.000Z");
    expect(state?.nextSuggestedPullAt).toBe("2099-09-19T12:00:00.000Z");
    expect(state?.healthStatus).toBe("backoff");
  });

  it("keeps the existing exponential backoff when provider Retry-After is shorter", async () => {
    const repo = createInMemoryFeedSourceAutomationRepo();
    setFeedSourceAutomationRepoForTests(repo);
    const completedAt = new Date("2099-09-19T10:00:00.000Z");

    await recordFeedSourceAutomationEvent({
      sourceId: "source:abgeordnetenwatch:polls",
      regionId: "EU",
      sourceType: "open_data:abgeordnetenwatch:v2",
      sourceLabel: "abgeordnetenwatch.de",
      sourceHref: "https://www.abgeordnetenwatch.de/api/v2/polls",
      automationMode: "cron_ready",
      runStatus: "error",
      completedAt,
      retryAfter: "60",
    });

    const state = await repo.getState("source:abgeordnetenwatch:polls");
    expect(state?.backoffUntil).toBe("2099-09-19T10:15:00.000Z");
  });

  it("surfaces Open Data runtime states in the existing admin source-health readmodel", async () => {
    const repo = createInMemoryFeedSourceAutomationRepo({
      states: [
        {
          sourceId: "source:abgeordnetenwatch:polls",
          organizationId: null,
          regionId: "EU",
          sourceType: "open_data:abgeordnetenwatch:v2",
          sourceLabel: "abgeordnetenwatch.de",
          sourceHref: "https://www.abgeordnetenwatch.de/api/v2/polls",
          automationMode: "cron_ready",
          healthStatus: "backoff",
          lastPullAt: "2099-09-19T10:00:00.000Z",
          nextSuggestedPullAt: "2099-09-19T12:00:00.000Z",
          errorCount: 1,
          backoffUntil: "2099-09-19T12:00:00.000Z",
          signalCount: 0,
          reviewCandidateCount: 0,
          lastError: "source_fetch_failed_429",
          lastRunStatus: "error",
          lastFetchedItems: 0,
          lastInsertedSignals: 0,
          noSignalStreak: 0,
          updatedAt: "2099-09-19T10:00:00.000Z",
        },
      ],
    });
    setFeedSourceAutomationRepoForTests(repo);

    const model = await buildFeedSourceAutomationReadModel({ limit: 10 });

    expect(model.items).toEqual([
      expect.objectContaining({
        sourceId: "source:abgeordnetenwatch:polls",
        sourceType: "open_data:abgeordnetenwatch:v2",
        sourceKind: "runtime_state",
        healthStatus: "backoff",
        backoffUntil: "2099-09-19T12:00:00.000Z",
        reviewRequired: true,
        noAutoPublish: true,
      }),
    ]);
    expect(model.summary.backoffSources).toBe(1);
    expect(model.summary.cronReadySources).toBe(1);
  });
});
