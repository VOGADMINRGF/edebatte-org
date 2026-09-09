import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callOpenAIJson: vi.fn(),
  logAiUsage: vi.fn(),
}));

vi.mock("@features/ai", () => ({
  callOpenAIJson: (...args: unknown[]) => mocks.callOpenAIJson(...args),
}));

vi.mock("@core/telemetry/aiUsage", () => ({
  logAiUsage: (...args: unknown[]) => mocks.logAiUsage(...args),
}));

import { buildCreatePlanner } from "@/features/create/createPlanner";

describe("create planner timeout contract", () => {
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalPlannerTimeout = process.env.CREATE_PLANNER_TIMEOUT_MS;
  const originalOpenAiModel = process.env.OPENAI_MODEL;
  const originalOpenAiPlannerModel = process.env.OPENAI_PLANNER_MODEL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_MODEL = "gpt-5";
    process.env.OPENAI_PLANNER_MODEL = "gpt-4.1-mini";
    delete process.env.CREATE_PLANNER_TIMEOUT_MS;
  });

  afterEach(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
    if (originalPlannerTimeout === undefined) delete process.env.CREATE_PLANNER_TIMEOUT_MS;
    else process.env.CREATE_PLANNER_TIMEOUT_MS = originalPlannerTimeout;
    if (originalOpenAiModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalOpenAiModel;
    if (originalOpenAiPlannerModel === undefined) delete process.env.OPENAI_PLANNER_MODEL;
    else process.env.OPENAI_PLANNER_MODEL = originalOpenAiPlannerModel;
  });

  it("uses the 6500ms fast-intake ceiling and classifies provider aborts as TIMEOUT", async () => {
    const timeoutError = Object.assign(new Error("The operation was aborted."), {
      name: "AbortError",
      meta: { code: "TIMEOUT" },
    });
    mocks.callOpenAIJson.mockRejectedValue(timeoutError);

    const planner = await buildCreatePlanner({
      text: "Ich bin für besseren Tierschutz und Tierhaltung in Europa und weltweit.",
      locale: "de",
      requestId: "request-timeout",
      operationId: "operation-timeout",
      dossierId: "dossier-timeout",
    });

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callOpenAIJson).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1-mini",
        timeoutMs: 6_500,
      }),
    );
    expect(planner.source).toBe("technical_fallback");
    expect(planner.recommendedLane).toBe("standard");
    expect(planner.providerPlan.plannerProvider).toBe("local_fallback");
    expect(planner.plannerDegraded).toBe(true);
    expect(planner.degradedReason).toBe("timeout");
    expect(planner.plannerTopic).toBe("Analyse noch nicht validiert");
    expect(planner.topicCandidates).toEqual([]);
    expect(planner.plannerDebug.attemptedProvider).toBe("openai");
    expect(planner.plannerDebug.providerAvailable).toBe(true);
    expect(planner.plannerDebug.providerErrorCode).toBe("TIMEOUT");
    expect(planner.plannerDebug).not.toHaveProperty("errorMessage");
    expect(JSON.stringify(planner)).not.toContain("aborted");
    expect(planner.permissions.nonMutative).toBe(true);
    expect(planner.permissions.canDeepSearch).toBe(false);
    expect(mocks.logAiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        pipeline: "other",
        operationId: "operation-timeout",
        requestId: "request-timeout",
        dossierId: "dossier-timeout",
        success: false,
        errorKind: "TIMEOUT",
      }),
    );
  });
});
