import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callOpenAIJson: vi.fn(),
  callAnthropic: vi.fn(),
  callMistral: vi.fn(),
  logAiUsage: vi.fn(),
}));

vi.mock("@features/ai", () => ({
  callOpenAIJson: (...args: unknown[]) => mocks.callOpenAIJson(...args),
}));
vi.mock("@features/ai/providers/anthropic", () => ({
  callAnthropic: (...args: unknown[]) => mocks.callAnthropic(...args),
}));
vi.mock("@features/ai/providers/mistral", () => ({
  callMistral: (...args: unknown[]) => mocks.callMistral(...args),
}));
vi.mock("@core/telemetry/aiUsage", () => ({
  logAiUsage: (...args: unknown[]) => mocks.logAiUsage(...args),
}));

import { buildCreatePlanner } from "@/features/create/createPlanner";
import { hasValidatedCreatePlannerProviderIdentity } from "@/features/create/createPlannerProviderContract";

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_PLANNER_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_DISABLED",
  "ANTHROPIC_MODEL",
  "MISTRAL_API_KEY",
  "MISTRAL_MODEL",
  "AI_PROVIDER_ORDER",
] as const;

const SOURCE_TEXT = Array.from(
  { length: 12 },
  () =>
    "Vor mehreren Schulen fehlen sichere Querungen. Eltern fordern außerdem verlässliche kommunale Verkehrskontrollen und beschreiben eigenständige Standorte mit unterschiedlichen Zuständigkeiten.",
).join(" ");

function buildValidPlannerPayload() {
  return {
    plannerTopic: "Sichere Schulwege im Bezirk",
    plannerCore:
      "Eltern fordern sichere Querungen und verlässliche Kontrollen vor Schulen.",
    plannerScope: ["district"],
    plannerStance: "pro",
    plannerClusters: [
      "Schulwegsicherheit",
      "Sichere Querungen",
      "Kommunale Verkehrskontrollen",
    ],
    plannerOpenQuestions: [
      "Welche Schule und welche Querung sollen zuerst geprüft werden?",
    ],
    shortSummary:
      "Der Beitrag fordert konkrete kommunale Maßnahmen für sichere Schulwege.",
    topicCandidates: ["Sichere Schulwege im Bezirk", "Schulwegsicherheit"],
    clusterCandidates: [
      "Schulwegsicherheit",
      "Sichere Querungen",
      "Kommunale Verkehrskontrollen",
    ],
    scopeCandidates: ["district"],
    openQuestions: [
      "Welche Schule und welche Querung sollen zuerst geprüft werden?",
    ],
    graphSearchTerms: [
      "Schulwegsicherheit",
      "sichere Querungen",
      "Verkehrskontrollen",
    ],
    materialSignals: [],
    recommendedLane: "create_fast_followup",
  };
}

async function runPlanner() {
  return buildCreatePlanner({
    text: SOURCE_TEXT,
    locale: "de",
    requestId: "provider-contract-run",
    operationId: "provider-contract-run",
  });
}

describe("create planner cross-provider fallback contract", () => {
  const originalEnv = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "openai-test-key";
    process.env.OPENAI_MODEL = "gpt-5";
    process.env.OPENAI_PLANNER_MODEL = "gpt-4.1-mini";
    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
    process.env.ANTHROPIC_DISABLED = "0";
    process.env.ANTHROPIC_MODEL = "claude-sonnet-test";
    delete process.env.MISTRAL_API_KEY;
    process.env.MISTRAL_MODEL = "mistral-large-test";
    process.env.AI_PROVIDER_ORDER = "openai,anthropic,mistral";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("accepts a validated OpenAI success without invoking an alternative provider", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify(buildValidPlannerPayload()),
    });

    const planner = await runPlanner();

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).not.toHaveBeenCalled();
    expect(mocks.callMistral).not.toHaveBeenCalled();
    expect(planner).toMatchObject({
      source: "openai",
      plannerProvider: "openai",
      providerAttemptCount: 1,
      providerCallSucceeded: true,
      plannerDegraded: false,
      plannerDebug: {
        usedProvider: "openai",
        usedModel: "gpt-4.1-mini",
      },
    });
    expect(planner.providerAttempts).toEqual([
      expect.objectContaining({
        attempt: 1,
        provider: "openai",
        model: "gpt-4.1-mini",
        status: "succeeded",
      }),
    ]);
    expect(hasValidatedCreatePlannerProviderIdentity(planner)).toBe(true);
  });

  it("uses exactly one Anthropic alternative after an OpenAI rate limit", async () => {
    mocks.callOpenAIJson.mockRejectedValue(
      Object.assign(new Error("rate limit 429"), {
        status: 429,
      }),
    );
    mocks.callAnthropic.mockResolvedValue({
      text: JSON.stringify(buildValidPlannerPayload()),
      model: "claude-sonnet-test",
    });

    const planner = await runPlanner();

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).toHaveBeenCalledTimes(1);
    expect(mocks.callMistral).not.toHaveBeenCalled();
    expect(planner.source).toBe("anthropic");
    expect(planner.plannerProvider).toBe("anthropic");
    expect(planner.providerAttemptCount).toBe(2);
    expect(planner.plannerDegraded).toBe(false);
    expect(planner.plannerDebug.usedModel).toBe("claude-sonnet-test");
    expect(planner.permissions.canPublish).toBe(false);
    expect(planner.permissions.canSave).toBe(false);
    expect(planner.providerAttempts).toEqual([
      expect.objectContaining({
        attempt: 1,
        provider: "openai",
        status: "failed",
        resultCode: "rate_limited",
      }),
      expect.objectContaining({
        attempt: 2,
        provider: "anthropic",
        model: "claude-sonnet-test",
        status: "succeeded",
      }),
    ]);
    expect(hasValidatedCreatePlannerProviderIdentity(planner)).toBe(true);
  });

  it("accepts Mistral as the single policy-selected alternative provider", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.MISTRAL_API_KEY = "mistral-test-key";
    mocks.callOpenAIJson.mockRejectedValue(new Error("provider unavailable"));
    mocks.callMistral.mockResolvedValue({
      text: JSON.stringify(buildValidPlannerPayload()),
      model: "mistral-large-test",
    });

    const planner = await runPlanner();

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).not.toHaveBeenCalled();
    expect(mocks.callMistral).toHaveBeenCalledTimes(1);
    expect(planner).toMatchObject({
      source: "mistral",
      plannerProvider: "mistral",
      providerAttemptCount: 2,
      plannerDegraded: false,
      plannerDebug: {
        usedProvider: "mistral",
        usedModel: "mistral-large-test",
      },
    });
    expect(hasValidatedCreatePlannerProviderIdentity(planner)).toBe(true);
  });

  it("shares the two-call budget across OpenAI model candidates and providers", async () => {
    mocks.callOpenAIJson.mockRejectedValue(new Error("404 model not found"));

    const planner = await runPlanner();

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(2);
    expect(mocks.callOpenAIJson.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-4.1-mini",
    });
    expect(mocks.callOpenAIJson.mock.calls[1]?.[0]).toMatchObject({
      model: "gpt-5",
    });
    expect(mocks.callAnthropic).not.toHaveBeenCalled();
    expect(mocks.callMistral).not.toHaveBeenCalled();
    expect(planner.providerAttemptCount).toBe(2);
    expect(planner.providerAttempts).toHaveLength(2);
    expect(planner.source).toBe("technical_fallback");
  });

  it("uses the remaining second slot for an alternative after a quality failure", async () => {
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        ...buildValidPlannerPayload(),
        plannerTopic: "Öffentliches Anliegen",
        plannerCore: "Aussage",
        topicCandidates: ["Öffentliches Anliegen"],
        graphSearchTerms: ["Öffentliches Anliegen"],
      }),
    });
    mocks.callAnthropic.mockResolvedValue({
      text: JSON.stringify(buildValidPlannerPayload()),
      model: "claude-sonnet-actual",
    });

    const planner = await runPlanner();

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).toHaveBeenCalledTimes(1);
    expect(planner.source).toBe("anthropic");
    expect(planner.plannerDebug.usedModel).toBe("claude-sonnet-actual");
    expect(planner.providerAttempts).toEqual([
      expect.objectContaining({
        attempt: 1,
        provider: "openai",
        status: "quality_failed",
      }),
      expect.objectContaining({
        attempt: 2,
        provider: "anthropic",
        model: "claude-sonnet-actual",
        status: "succeeded",
      }),
    ]);
    expect(hasValidatedCreatePlannerProviderIdentity(planner)).toBe(true);
  });

  it("keeps the technical fallback visible when the second provider returns invalid JSON", async () => {
    process.env.MISTRAL_API_KEY = "mistral-test-key";
    mocks.callOpenAIJson.mockRejectedValue(new Error("provider unavailable"));
    mocks.callAnthropic.mockResolvedValue({
      text: "{invalid-json",
      model: "claude-sonnet-test",
    });

    const planner = await runPlanner();

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).toHaveBeenCalledTimes(1);
    expect(mocks.callMistral).not.toHaveBeenCalled();
    expect(planner).toMatchObject({
      source: "technical_fallback",
      plannerProvider: "local_fallback",
      providerAttemptCount: 2,
      providerCallSucceeded: false,
      plannerDegraded: true,
      degradedReason: "invalid_json",
      qualityStatus: "failed",
      plannerDebug: {
        attemptedProvider: "anthropic",
        attemptedModel: "claude-sonnet-test",
        usedProvider: "local_fallback",
      },
    });
  });

  it("rejects a quality-gate failure without inventing a validated result", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    mocks.callOpenAIJson.mockResolvedValue({
      text: JSON.stringify({
        ...buildValidPlannerPayload(),
        plannerTopic: "Öffentliches Anliegen",
        plannerCore: "Aussage",
        topicCandidates: ["Öffentliches Anliegen"],
        graphSearchTerms: ["Öffentliches Anliegen"],
      }),
    });

    const planner = await runPlanner();

    expect(planner).toMatchObject({
      source: "technical_fallback",
      providerAttemptCount: 1,
      providerCallSucceeded: false,
      plannerDegraded: true,
      degradedReason: "quality_gate_failed",
      qualityStatus: "failed",
    });
    expect(mocks.callAnthropic).not.toHaveBeenCalled();
    expect(mocks.callMistral).not.toHaveBeenCalled();
  });

  it("never starts a third provider attempt after the selected alternative fails", async () => {
    process.env.MISTRAL_API_KEY = "mistral-test-key";
    mocks.callOpenAIJson.mockRejectedValue(new Error("provider unavailable"));
    mocks.callAnthropic.mockRejectedValue(new Error("second provider unavailable"));

    const planner = await runPlanner();

    expect(mocks.callOpenAIJson).toHaveBeenCalledTimes(1);
    expect(mocks.callAnthropic).toHaveBeenCalledTimes(1);
    expect(mocks.callMistral).not.toHaveBeenCalled();
    expect(planner.providerAttemptCount).toBe(2);
    expect(planner.plannerDegraded).toBe(true);
    expect(planner.providerCallSucceeded).toBe(false);
  });
});
