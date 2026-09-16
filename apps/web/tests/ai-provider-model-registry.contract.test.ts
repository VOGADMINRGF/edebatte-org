import { describe, expect, it, vi } from "vitest";
import {
  describeProviderModel,
  getProviderModelRegistry,
  resolveProviderModel,
} from "@features/ai/providerModelRegistry";
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
