import { describe, expect, it, vi } from "vitest";

import { listScheduledOpenDataSources } from "../../../features/feeds/openDataSourceRegistry";
import {
  createInMemorySourceSchedulerLeaseRepository,
  runScheduledOpenDataSources,
  sourceDueState,
} from "../../../features/feeds/sourceScheduler";

describe("source intelligence scheduler contract", () => {
  it("keeps the canonical registry review-first and explicit about bounded coverage", () => {
    const [entry] = listScheduledOpenDataSources();

    expect(entry).toBeTruthy();
    expect(entry.registryId).toBe("open-data:abgeordnetenwatch:polls:de");
    expect(entry.connectorId).toBe(entry.connector.connectorId);
    expect(entry.source.kind).toBe("open_data");
    expect(entry.source.reviewRequired).toBe(true);
    expect(entry.source.autoPublishAllowed).toBe(false);
    expect(entry.reviewRequired).toBe(true);
    expect(entry.autoPublishAllowed).toBe(false);
    expect(entry.coverage).toMatchObject({
      mode: "bounded_latest_window",
      sortBy: "field_poll_date",
      sortDirection: "desc",
      limit: 250,
      completenessClaim: false,
    });
    expect(entry.source.href).toContain("sort_by=field_poll_date");
    expect(entry.source.href).toContain("range_end=250");
  });

  it("treats provider backoff and future pull times as hard scheduler gates", () => {
    const now = new Date("2026-09-20T07:00:00.000Z");
    const sourceId = "source:test";

    expect(sourceDueState(null, now)).toBe("due");
    expect(
      sourceDueState(
        {
          sourceId,
          automationMode: "cron_ready",
          backoffUntil: "2026-09-20T08:00:00.000Z",
          nextSuggestedPullAt: null,
        },
        now,
      ),
    ).toBe("backoff");
    expect(
      sourceDueState(
        {
          sourceId,
          automationMode: "cron_ready",
          backoffUntil: null,
          nextSuggestedPullAt: "2026-09-20T08:00:00.000Z",
        },
        now,
      ),
    ).toBe("not_due");
    expect(
      sourceDueState(
        {
          sourceId,
          automationMode: "paused",
          backoffUntil: null,
          nextSuggestedPullAt: null,
        },
        now,
      ),
    ).toBe("mode");
  });

  it("uses registry cadence after successful runs instead of a generic future hint", () => {
    const state = {
      sourceId: "source:test",
      automationMode: "cron_ready" as const,
      backoffUntil: null,
      nextSuggestedPullAt: "2026-09-20T15:30:00.000Z",
      lastPullAt: "2026-09-20T09:30:00.000Z",
      lastRunStatus: "success" as const,
    };

    expect(sourceDueState(state, new Date("2026-09-20T10:00:00.000Z"), 60)).toBe("not_due");
    expect(sourceDueState(state, new Date("2026-09-20T10:31:00.000Z"), 60)).toBe("due");
  });

  it("returns to due after error backoff expires instead of applying normal cadence", () => {
    const state = {
      sourceId: "source:test",
      automationMode: "cron_ready" as const,
      backoffUntil: "2026-09-20T09:45:00.000Z",
      nextSuggestedPullAt: "2026-09-20T09:45:00.000Z",
      lastPullAt: "2026-09-20T09:30:00.000Z",
      lastRunStatus: "error" as const,
    };

    expect(sourceDueState(state, new Date("2026-09-20T09:40:00.000Z"), 360)).toBe("backoff");
    expect(sourceDueState(state, new Date("2026-09-20T09:46:00.000Z"), 360)).toBe("due");
  });

  it("runs a due source once and releases its single-flight lease", async () => {
    const [entry] = listScheduledOpenDataSources();
    const leases = createInMemorySourceSchedulerLeaseRepository();
    const cycleRunner = vi.fn(async () => ({
      status: "not_modified" as const,
      sourceId: entry.source.sourceId,
      snapshotId: "snapshot:test",
      candidateCount: 0,
      insertedCandidates: 0,
    }));
    const now = new Date("2026-09-20T07:00:00.000Z");

    const first = await runScheduledOpenDataSources({
      entries: [entry],
      now,
      ownerId: "test-owner-1",
      leaseRepository: leases,
      stateLoader: async () => null,
      cycleRunner,
    });
    const second = await runScheduledOpenDataSources({
      entries: [entry],
      now: new Date(now.getTime() + 1_000),
      ownerId: "test-owner-2",
      leaseRepository: leases,
      stateLoader: async () => null,
      cycleRunner,
    });

    expect(first).toMatchObject({ ok: true, due: 1, ran: 1, failed: 0, skipped: 0 });
    expect(second).toMatchObject({ ok: true, due: 1, ran: 1, failed: 0, skipped: 0 });
    expect(cycleRunner).toHaveBeenCalledTimes(2);
  });

  it("does not run a source while another scheduler owns its lease", async () => {
    const [entry] = listScheduledOpenDataSources();
    const leases = createInMemorySourceSchedulerLeaseRepository();
    const now = new Date("2026-09-20T07:00:00.000Z");
    await leases.claim({
      sourceId: entry.source.sourceId,
      ownerId: "other-run",
      now,
      leaseMs: 10 * 60 * 1000,
    });
    const cycleRunner = vi.fn();

    const result = await runScheduledOpenDataSources({
      entries: [entry],
      now,
      ownerId: "blocked-run",
      leaseRepository: leases,
      stateLoader: async () => null,
      cycleRunner,
    });

    expect(result).toMatchObject({ ok: true, due: 1, ran: 0, skipped: 1 });
    expect(result.results[0]?.status).toBe("skipped_leased");
    expect(cycleRunner).not.toHaveBeenCalled();
  });

  it("surfaces source failure without throwing so provider backoff remains retry authority", async () => {
    const [entry] = listScheduledOpenDataSources();
    const result = await runScheduledOpenDataSources({
      entries: [entry],
      now: new Date("2026-09-20T07:00:00.000Z"),
      ownerId: "failure-run",
      leaseRepository: createInMemorySourceSchedulerLeaseRepository(),
      stateLoader: async () => null,
      cycleRunner: async () => ({
        status: "failed" as const,
        sourceId: entry.source.sourceId,
        reason: "source_http_429",
        httpStatus: 429,
        retryAfter: "60",
      }),
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ due: 1, ran: 1, failed: 1, skipped: 0 });
    expect(result.results[0]).toMatchObject({
      status: "failed",
      reason: "source_http_429",
    });
  });
});
