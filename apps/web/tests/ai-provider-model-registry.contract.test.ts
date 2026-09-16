import { describe, expect, it, vi } from "vitest";
import {
  describeProviderModel,
  getProviderModelRegistry,
  resolveProviderModel,
  resolveProviderModelForRouting,
} from "@features/ai/providerModelRegistry";
import { getAiRuntimePolicyFromEnv, resolveAiRuntimeModel } from "@features/ai/aiRuntimePolicy";
import { probeProviderModelLifecycle } from "@features/ai/providerModelLifecycleProbe";

describe("provider model registry", () => {
  it("separates VOG preferred models from provider-recommended retirement replacements", () => {
    const anthropic = getProviderModelRegistry("anthropic");
    expect(anthropic.preferredModel).toBe("claude-opus-5");
    expect(anthropic.providerRecommendedReplacements["claude-opus-4-1-20250805"]).toBe("claude-opus-4-8");
    expect(anthropic.retiredReplacements["claude-opus-4-1-20250805"]).toBe("claude-opus-5");
  });

  it("resolves known retired model ids and preserves unknown custom ids", () => {
    expect(resolveProviderModel("anthropic", "claude-sonnet-4-20250514")).toBe("claude-sonnet-5");
    expect(resolveProviderModel("gemini", "models/gemini-2.5-flash")).toBe("gemini-3.8-flash");
    expect(resolveProviderModel("openai", "custom-openai-model")).toBe("custom-openai-model");
  });

  it("reports configured/effective drift explicitly", () => {
    expect(describeProviderModel("anthropic", "claude-opus-4-1-20250805")).toEqual({
      configuredModel: "claude-opus-4-1-20250805",
      effectiveModel: "claude-opus-5",
      lifecycle: "retired",
      migrated: true,
      providerRecommendedReplacement: "claude-opus-4-8",
    });
  });

  it("keeps legacy routing stable by default", () => {
    expect(resolveProviderModelForRouting("openai", { routingMode: "legacy", tier: "economy" })).toBe("gpt-5");
    expect(resolveProviderModelForRouting("anthropic", { routingMode: "legacy", tier: "balanced" })).toBe("claude-opus-5");
  });

  it("maps profiled routing to explicit economy balanced and quality tiers", () => {
    expect(resolveProviderModelForRouting("openai", { routingMode: "profiled", tier: "economy" })).toBe("gpt-5.6-luna");
    expect(resolveProviderModelForRouting("openai", { routingMode: "profiled", tier: "balanced" })).toBe("gpt-5.6-terra");
    expect(resolveProviderModelForRouting("openai", { routingMode: "profiled", tier: "quality" })).toBe("gpt-5.6-sol");
    expect(resolveProviderModelForRouting("gemini", { routingMode: "profiled", tier: "economy" })).toBe("gemini-3.5-flash-lite");
    expect(resolveProviderModelForRouting("gemini", { routingMode: "profiled", tier: "balanced" })).toBe("gemini-3.6-flash");
    expect(resolveProviderModelForRouting("gemini", { routingMode: "profiled", tier: "quality" })).toBe("gemini-3.8-flash");
  });

  it("lets explicit tier env values override registry defaults without bypassing retirement migration", () => {
    expect(resolveProviderModelForRouting("anthropic", {
      routingMode: "profiled",
      tier: "quality",
      configuredModel: "claude-opus-4-1-20250805",
    })).toBe("claude-opus-5");
  });
});

describe("runtime model routing policy", () => {
  it("defaults to legacy mode and current central-registry defaults", () => {
    const policy = getAiRuntimePolicyFromEnv({});
    expect(policy.modelRoutingMode).toBe("legacy");
    expect(policy.anthropic.model).toBe("claude-opus-5");
    expect(policy.gemini.model).toBe("gemini-3.8-flash");
    expect(resolveAiRuntimeModel("openai", "providerProbe", policy)).toBe("gpt-5");
    expect(resolveAiRuntimeModel("openai", "fullContract", policy)).toBe("gpt-5");
  });

  it("uses economy for probes balanced for planner and quality for full contracts when profiled", () => {
    const policy = getAiRuntimePolicyFromEnv({ AI_MODEL_ROUTING_MODE: "profiled" });
    expect(resolveAiRuntimeModel("openai", "providerProbe", policy)).toBe("gpt-5.6-luna");
    expect(resolveAiRuntimeModel("openai", "planner", policy)).toBe("gpt-5.6-terra");
    expect(resolveAiRuntimeModel("openai", "fullContract", policy)).toBe("gpt-5.6-sol");
    expect(resolveAiRuntimeModel("anthropic", "providerProbe", policy)).toBe("claude-haiku-4-5-20251001");
    expect(resolveAiRuntimeModel("anthropic", "fullContractLite", policy)).toBe("claude-sonnet-5");
    expect(resolveAiRuntimeModel("anthropic", "fullContract", policy)).toBe("claude-opus-5");
  });

  it("supports per-tier operator overrides", () => {
    const policy = getAiRuntimePolicyFromEnv({
      AI_MODEL_ROUTING_MODE: "profiled",
      OPENAI_MODEL_ECONOMY: "custom-economy",
      OPENAI_MODEL_BALANCED: "custom-balanced",
      OPENAI_MODEL_QUALITY: "custom-quality",
    });
    expect(resolveAiRuntimeModel("openai", "providerProbe", policy)).toBe("custom-economy");
    expect(resolveAiRuntimeModel("openai", "planner", policy)).toBe("custom-balanced");
    expect(resolveAiRuntimeModel("openai", "fullContract", policy)).toBe("custom-quality");
  });

  it("rejects unknown routing modes instead of silently guessing", () => {
    expect(() => getAiRuntimePolicyFromEnv({ AI_MODEL_ROUTING_MODE: "auto" })).toThrow(/legacy or profiled/);
  });
});

describe("provider model lifecycle probe", () => {
  it("fails closed when the effective model is absent from the provider catalog", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "claude-sonnet-5" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await probeProviderModelLifecycle("anthropic", {
      env: {
        ANTHROPIC_API_KEY: "test-key",
        ANTHROPIC_MODEL: "claude-opus-5",
      },
      fetchImpl,
    });

    expect(result.providerReachable).toBe(true);
    expect(result.modelAvailable).toBe(false);
    expect(result.status).toBe("model_not_found");
  });

  it("marks a retired configured id as migrated only when its effective model exists", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "claude-opus-5" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await probeProviderModelLifecycle("anthropic", {
      env: {
        ANTHROPIC_API_KEY: "test-key",
        ANTHROPIC_MODEL: "claude-opus-4-1-20250805",
      },
      fetchImpl,
    });

    expect(result.migrated).toBe(true);
    expect(result.effectiveModel).toBe("claude-opus-5");
    expect(result.providerRecommendedReplacement).toBe("claude-opus-4-8");
    expect(result.modelAvailable).toBe(true);
    expect(result.status).toBe("retired_migrated");
  });

  it("normalizes Gemini models/ prefixes returned by the catalog", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ models: [{ name: "models/gemini-3.8-flash" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await probeProviderModelLifecycle("gemini", {
      env: {
        GEMINI_API_KEY: "test-key",
        GEMINI_MODEL: "gemini-3.8-flash",
      },
      fetchImpl,
    });

    expect(result.status).toBe("ok");
    expect(result.modelAvailable).toBe(true);
  });
});
