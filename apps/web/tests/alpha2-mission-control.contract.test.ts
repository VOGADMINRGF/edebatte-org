import { describe, expect, it } from "vitest";
import { summarizeAlpha2MissionRuns } from "@/features/agenticRuntime/alpha2MissionControlReadModel";
import { createAlpha2RunRecord } from "@/features/agenticRuntime/alpha2RunLifecycleContract";

function payload(input: {
  runId: string;
  status: "queued" | "running" | "waiting" | "review" | "human_gate" | "failed" | "completed";
  resumeAt?: string;
}) {
  const base = createAlpha2RunRecord({
    runId: input.runId,
    idempotencyKey: `idem-${input.runId}`,
    taskId: `task-${input.runId}`,
    kind: "mission",
    primaryRole: "alpha_orchestrator",
    riskClass: "yellow",
    route: { mode: "automatic", capabilityClass: "orchestration" },
    now: "2026-09-26T17:00:00.000Z",
  });
  return {
    ...base,
    status: input.status,
    resumeAt: input.resumeAt,
    humanGate:
      input.status === "human_gate"
        ? { state: "pending" as const, reason: "human_decision_required" }
        : base.humanGate,
    finishedAt: input.status === "completed" ? "2026-09-26T17:01:00.000Z" : undefined,
    updatedAt: "2026-09-26T17:01:00.000Z",
  };
}

describe("Alpha-Foxtrott 2 Mission Control", () => {
  it("keeps terminal failures separate from active work and uses global scheduled/lease counts", () => {
    const result = summarizeAlpha2MissionRuns({
      totalRuns: 7,
      statusRows: [
        { _id: "queued", count: 1 },
        { _id: "running", count: 1 },
        { _id: "waiting", count: 1 },
        { _id: "review", count: 1 },
        { _id: "human_gate", count: 1 },
        { _id: "failed", count: 1 },
        { _id: "completed", count: 1 },
      ],
      recentRows: [
        {
          payload: payload({
            runId: "wait",
            status: "waiting",
            resumeAt: "2026-09-26T18:00:00.000Z",
          }),
          version: 2,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
        {
          payload: payload({ runId: "running", status: "running" }),
          version: 1,
          leaseOwner: "worker-1",
          leaseExpiresAt: new Date("2026-09-26T17:30:00.000Z"),
        },
      ],
      scheduledRuns: 4,
      leasedRuns: 3,
    });

    expect(result.totalRuns).toBe(7);
    expect(result.activeRuns).toBe(3);
    expect(result.humanInbox).toBe(2);
    expect(result.failedRuns).toBe(1);
    expect(result.scheduledRuns).toBe(4);
    expect(result.leasedRuns).toBe(3);
    expect(result.recentRuns).toHaveLength(2);
  });

  it("drops malformed recent payloads instead of inventing operator state", () => {
    const result = summarizeAlpha2MissionRuns({
      totalRuns: 1,
      statusRows: [{ _id: "running", count: 1 }],
      recentRows: [{ payload: { invalid: true }, version: 0 }],
      scheduledRuns: 0,
      leasedRuns: 0,
    });

    expect(result.statusCounts.running).toBe(1);
    expect(result.recentRuns).toEqual([]);
  });
});
