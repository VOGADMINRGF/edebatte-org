import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdminOrResponse: vi.fn(),
  buildCreatePlanner: vi.fn(),
}));

vi.mock("@/lib/server/auth/admin", () => ({
  requireAdminOrResponse: (...args: unknown[]) => mocks.requireAdminOrResponse(...args),
}));

vi.mock("@/features/create/createPlanner", () => ({
  buildCreatePlanner: (...args: unknown[]) => mocks.buildCreatePlanner(...args),
  resolveCreatePlannerTimeoutMs: (text?: string) => (text ? 6_500 : 10_000),
}));

import { POST } from "@/app/api/admin/ai/create-planner-smoke/route";

function request() {
  return new NextRequest("http://localhost/api/admin/ai/create-planner-smoke", {
    method: "POST",
  });
}

function plannerResult(overrides: Record<string, unknown> = {}) {
  return {
    source: "openai",
    plannerProvider: "openai",
    plannerDegraded: false,
    degradedReason: null,
    qualityStatus: "specific",
    topicCandidates: ["Verkehr", "Wohnen", "Grünflächen"],
    scopeCandidates: ["municipal"],
    providerCallAttempted: true,
    providerCallSucceeded: true,
    plannerDebug: {
      attemptedProvider: "openai",
      usedProvider: "openai",
      attemptedModel: "gpt-4.1-mini",
      usedModel: "gpt-5",
      providerAvailable: true,
      providerErrorCode: null,
      providerErrorMessage: null,
      errorMessage: null,
      rawPayloadValid: true,
      rawTextValid: true,
      normalizedPayloadValid: true,
      qualityGatePassed: true,
      rawText: "{\"sensitive\":\"must-not-leak\"}",
    },
    ...overrides,
  };
}

describe("/api/admin/ai/create-planner-smoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_PLANNER_MODEL", "gpt-4.1-mini");
    vi.stubEnv("OPENAI_MODEL", "gpt-5");
    vi.stubEnv("CREATE_PLANNER_TIMEOUT_MS", "10000");
    mocks.requireAdminOrResponse.mockResolvedValue({ userId: "admin-1" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the live planner smoke behind the admin gate", async () => {
    mocks.requireAdminOrResponse.mockResolvedValue(
      new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }),
    );

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.buildCreatePlanner).not.toHaveBeenCalled();
  });

  it("runs the exact create planner path and returns safe operator diagnostics", async () => {
    mocks.buildCreatePlanner.mockResolvedValue(plannerResult());

    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("create_planner");
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({
      provider: "openai",
      model: "gpt-5",
      selectedSmokeModel: "gpt-4.1-mini",
      effectiveModel: "gpt-5",
      openAiSmokeModelMismatch: true,
      timeoutMs: 6_500,
      rootCause: "CREATE_PLANNER_OK",
    });
    expect(body.plannerSmoke).toMatchObject({
      source: "openai",
      qualityStatus: "specific",
      topicCount: 3,
      modelCandidates: ["gpt-4.1-mini", "gpt-5"],
      selectedTimingLane: "fast",
      timeoutMs: 6_500,
    });
    expect(mocks.buildCreatePlanner).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.any(String),
        locale: "de",
        operationType: "admin_create_planner_smoke",
      }),
    );
    expect(mocks.buildCreatePlanner.mock.calls[0]?.[0].text).toContain("Rahnsdorf");

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("must-not-leak");
    expect(serialized).not.toContain("providerErrorMessage");
    expect(serialized).not.toContain("rawText");
  });

  it("surfaces MODEL_NOT_FOUND without returning the provider payload", async () => {
    mocks.buildCreatePlanner.mockResolvedValue(
      plannerResult({
        source: "technical_fallback",
        plannerProvider: "local_fallback",
        plannerDegraded: true,
        degradedReason: "model_not_found",
        qualityStatus: "failed",
        topicCandidates: [],
        scopeCandidates: ["unclear"],
        providerCallAttempted: true,
        providerCallSucceeded: false,
        plannerDebug: {
          attemptedProvider: "openai",
          usedProvider: "local_fallback",
          attemptedModel: "gpt-4.1-mini",
          usedModel: null,
          providerAvailable: true,
          providerErrorCode: "MODEL_NOT_FOUND",
          providerErrorMessage: "sensitive upstream detail",
          errorMessage: "sensitive upstream detail",
          rawPayloadValid: false,
          rawTextValid: false,
          normalizedPayloadValid: false,
          qualityGatePassed: false,
          rawText: "sensitive provider response",
        },
      }),
    );

    const response = await POST(request());
    const body = await response.json();

    expect(body.ok).toBe(false);
    expect(body.rows[0]).toMatchObject({
      status: "failed",
      rootCause: "MODEL_NOT_FOUND",
      providerErrorCode: "MODEL_NOT_FOUND",
      selectedSmokeModel: "gpt-4.1-mini",
      effectiveModel: "gpt-4.1-mini",
    });
    expect(body.createAnalyzeApi).toMatchObject({
      state: "failed",
      code: "MODEL_NOT_FOUND",
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("sensitive upstream detail");
    expect(serialized).not.toContain("sensitive provider response");
  });

  it("reports the canonical planner default even when no planner model env is set", async () => {
    vi.unstubAllEnvs();
    mocks.requireAdminOrResponse.mockResolvedValue({ userId: "admin-1" });
    mocks.buildCreatePlanner.mockResolvedValue(
      plannerResult({
        plannerDebug: {
          attemptedProvider: "openai",
          usedProvider: "openai",
          attemptedModel: "gpt-5",
          usedModel: "gpt-5",
          providerAvailable: true,
          providerErrorCode: null,
          providerErrorMessage: null,
          errorMessage: null,
          rawPayloadValid: true,
          rawTextValid: true,
          normalizedPayloadValid: true,
          qualityGatePassed: true,
          rawText: null,
        },
      }),
    );

    const response = await POST(request());
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.rows[0]).toMatchObject({
      selectedSmokeModel: "gpt-5",
      effectiveModel: "gpt-5",
      openAiSmokeModelMismatch: false,
    });
    expect(body.plannerSmoke.modelCandidates).toEqual(["gpt-5"]);
  });
});
