import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isCreateFastIntakeText,
  resolveCreatePlannerMaxOutputTokens,
  resolveCreatePlannerTimeoutMs,
} from "@/features/create/createPlanner";
import {
  CREATE_FAST_INTAKE_TIMEOUT_MS,
  CREATE_FIRST_RESPONSE_PERFORMANCE_TARGET_MS,
  CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
  CREATE_INTELLIGENT_FOLLOWUP_TRANSPORT_RESERVE_MS,
  CREATE_STANDARD_INTAKE_TIMEOUT_MS,
  CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
  isCreateIntelligentFollowupAbortError,
  resolveCreateIntakeTiming,
  startCreateIntelligentFollowupDeadline,
} from "@/features/create/createFastIntakeTiming";

const REGRESSION_TEXT =
  "ich bin für mindestlohn bei behindertenwerkstätten, für mehr integration innerhalb der wirtschaft aber auch für stärkere kontrollen der vorstände der jeweiligen akteure";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("create fast-intake latency contract", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the small one-call planner profile for the regression input", () => {
    expect(isCreateFastIntakeText(REGRESSION_TEXT)).toBe(true);
    expect(resolveCreatePlannerTimeoutMs(REGRESSION_TEXT)).toBe(6_500);
    expect(resolveCreatePlannerMaxOutputTokens(REGRESSION_TEXT)).toBe(400);
    expect(CREATE_FIRST_RESPONSE_PERFORMANCE_TARGET_MS).toBe(3_000);
    expect(CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS).toBeGreaterThan(
      CREATE_FAST_INTAKE_TIMEOUT_MS + CREATE_INTELLIGENT_FOLLOWUP_TRANSPORT_RESERVE_MS,
    );
    expect(CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS).toBeGreaterThan(
      CREATE_STANDARD_INTAKE_TIMEOUT_MS + CREATE_INTELLIGENT_FOLLOWUP_TRANSPORT_RESERVE_MS,
    );
  });

  it("starts the planner deadline only after durable save and skips it for link intake", () => {
    const client = source("src/app/create/CreateClient.tsx");
    const startFlow = client.slice(
      client.indexOf("const startCreateFlow"),
      client.indexOf("const handleStart"),
    );
    const saveIndex = client.indexOf('fetch("/api/create/save"');
    const durableSaveIndex = client.indexOf("draftSavedForRun = true", saveIndex);
    const linkIntakeIndex = client.indexOf(
      "if (linkDetection.hasLink && linkDetection.primaryUrl)",
      durableSaveIndex,
    );
    const deadlineIndex = client.indexOf(
      "plannerDeadline = startCreateIntelligentFollowupDeadline(intakeTiming.clientTimeoutMs)",
      durableSaveIndex,
    );
    const plannerIndex = client.indexOf('fetch("/api/create/intelligent-followup"');

    expect(saveIndex).toBeGreaterThan(-1);
    expect(durableSaveIndex).toBeGreaterThan(saveIndex);
    expect(linkIntakeIndex).toBeGreaterThan(durableSaveIndex);
    expect(deadlineIndex).toBeGreaterThan(linkIntakeIndex);
    expect(plannerIndex).toBeGreaterThan(deadlineIndex);
    expect(client.slice(saveIndex, durableSaveIndex)).not.toContain("signal:");
    expect(client.slice(plannerIndex, plannerIndex + 260)).toContain(
      "signal: plannerDeadline.signal",
    );
    expect(startFlow).toContain("plannerDeadline?.clear()");
    expect(startFlow).toContain("plannerDeadlineRef.current = null");
    expect(client).toContain("plannerDeadlineRef.current?.cancel()");
    expect(client).toContain("saveMs");
    expect(client).toContain("submitToResultMs");
  });

  it("selects a longer client deadline for standard input without slowing fast intake", () => {
    expect(resolveCreateIntakeTiming(REGRESSION_TEXT)).toEqual({
      lane: "fast",
      serverTimeoutMs: 6_500,
      clientTimeoutMs: 8_000,
    });
    expect(resolveCreateIntakeTiming("Ein normaler Bürgertext. ".repeat(45))).toEqual({
      lane: "standard",
      serverTimeoutMs: 10_000,
      clientTimeoutMs: 12_500,
    });
  });

  it("keeps the standard client alive beyond the server budget plus transport reserve", () => {
    vi.useFakeTimers();
    const deadline = startCreateIntelligentFollowupDeadline(
      CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
    );

    vi.advanceTimersByTime(
      CREATE_STANDARD_INTAKE_TIMEOUT_MS + CREATE_INTELLIGENT_FOLLOWUP_TRANSPORT_RESERVE_MS,
    );
    expect(deadline.signal.aborted).toBe(false);

    vi.advanceTimersByTime(
      CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS -
        CREATE_STANDARD_INTAKE_TIMEOUT_MS -
        CREATE_INTELLIGENT_FOLLOWUP_TRANSPORT_RESERVE_MS,
    );
    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.didTimeout()).toBe(true);
  });

  it("keeps a five-second provider response inside both technical limits", () => {
    vi.useFakeTimers();
    const deadline = startCreateIntelligentFollowupDeadline();

    vi.advanceTimersByTime(5_000);

    expect(CREATE_FAST_INTAKE_TIMEOUT_MS).toBeGreaterThan(5_000);
    expect(deadline.signal.aborted).toBe(false);
    expect(deadline.didTimeout()).toBe(false);
    deadline.clear();
    vi.advanceTimersByTime(CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS);
    expect(deadline.signal.aborted).toBe(false);
  });

  it("aborts at the client limit and classifies only AbortError as timeout", () => {
    vi.useFakeTimers();
    const deadline = startCreateIntelligentFollowupDeadline();

    vi.advanceTimersByTime(CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS);

    expect(deadline.signal.aborted).toBe(true);
    expect(deadline.didTimeout()).toBe(true);
    expect(
      isCreateIntelligentFollowupAbortError(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      ),
    ).toBe(true);
    expect(isCreateIntelligentFollowupAbortError(new Error("network"))).toBe(false);
    deadline.clear();
  });

  it("keeps save failures separate from saved-draft timeout recovery", () => {
    const client = source("src/app/create/CreateClient.tsx");
    const startFlow = client.slice(
      client.indexOf("const startCreateFlow"),
      client.indexOf("const handleStart"),
    );
    const catchIndex = startFlow.indexOf("} catch (error: unknown) {");
    const finallyIndex = startFlow.indexOf("} finally {", catchIndex);
    const recovery = startFlow.slice(catchIndex, finallyIndex);

    expect(recovery).toContain("if (!draftSavedForRun)");
    expect(recovery).toContain("Dein Beitrag konnte nicht sicher gespeichert werden.");
    expect(recovery).toContain("plannerDeadline?.didTimeout() === true");
    expect(recovery).toContain("Dein Beitrag ist gespeichert; du kannst die Einordnung erneut versuchen.");
    expect(recovery).toContain("setIntakeError(null)");
    expect(recovery.indexOf("Dein Beitrag konnte nicht sicher gespeichert werden.")).toBeLessThan(
      recovery.indexOf("} else {"),
    );
  });

  it("keeps enrichment behind confirmation and reports stage timings", () => {
    const visualFollowup = source("src/features/create/CreateVisualFollowup.tsx");
    const planner = source("src/features/create/createPlanner.ts");
    const saveRoute = source("src/app/api/create/save/route.ts");
    const followupRoute = source("src/app/api/create/intelligent-followup/route.ts");
    const confirmationGate = visualFollowup.indexOf("if (!isConfirmed)");
    const runtimeMatch = visualFollowup.indexOf(
      "resolveExistingTopicMatchesFromRuntime({ result })",
    );

    expect(confirmationGate).toBeGreaterThan(-1);
    expect(runtimeMatch).toBeGreaterThan(confirmationGate);
    expect(planner).not.toContain("await recordCreatePlannerAiUsage({");
    expect(saveRoute).toContain("accessMs");
    expect(saveRoute).toContain("contextMs");
    expect(saveRoute).toContain("saveMs");
    expect(followupRoute).toContain("plannerMs");
    expect(followupRoute).toContain("contextMs");
    expect(followupRoute).toContain("totalMs");
  });
});
