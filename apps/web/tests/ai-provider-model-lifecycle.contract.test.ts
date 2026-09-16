import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAiRuntimePolicyFromEnv } from "@features/ai/aiRuntimePolicy";
import {
  PROVIDER_MODEL_REGISTRY,
  knownRetiredModelIds,
  resolveProviderModel,
} from "@features/ai/providerModelRegistry";
import { resolveAnthropicModelName } from "@features/ai/providers/anthropic";
import { resolveGeminiModelName } from "@features/ai/providers/gemini";

const RUNTIME_MODEL_CONFIG_FILES = [
  "features/ai/aiRuntimePolicy.ts",
  "features/ai/providers/openai.ts",
  "features/ai/providers/anthropic.ts",
  "features/ai/providers/mistral.ts",
  "features/ai/providers/gemini.ts",
  "apps/web/.env.example",
] as const;

describe("AI provider model lifecycle", () => {
  it("uses one registry for current provider defaults", () => {
    expect(PROVIDER_MODEL_REGISTRY.anthropic.preferred).toBe("claude-opus-5");
    expect(PROVIDER_MODEL_REGISTRY.anthropic.fallback).toBe("claude-sonnet-5");
    expect(PROVIDER_MODEL_REGISTRY.gemini.preferred).toBe("gemini-3.8-flash");
    expect(PROVIDER_MODEL_REGISTRY.gemini.fallback).toBe("gemini-3.6-flash");
    expect(PROVIDER_MODEL_REGISTRY.openai.preferred).toBe("gpt-5");
    expect(PROVIDER_MODEL_REGISTRY.mistral.preferred).toBe("mistral-large-latest");
  });

  it("migrates retired Anthropic ids to the upstream-recommended generation", () => {
    expect(resolveAnthropicModelName("claude-opus-4-1-20250805")).toBe("claude-opus-4-8");
    expect(resolveAnthropicModelName("claude-opus-4-20250514")).toBe("claude-opus-4-8");
    expect(resolveAnthropicModelName("claude-sonnet-4-20250514")).toBe("claude-sonnet-4-6");
    expect(resolveAnthropicModelName("claude-3-7-sonnet-20250219")).toBe("claude-sonnet-4-6");
    expect(resolveAnthropicModelName("claude-3-5-sonnet-20240620")).toBe("claude-sonnet-4-6");
  });

  it("keeps VOG preferred models separate from provider retirement replacements", () => {
    const resolution = resolveProviderModel("anthropic", "claude-opus-4-1-20250805");
    expect(resolution.configured).toBe("claude-opus-4-1-20250805");
    expect(resolution.effective).toBe("claude-opus-4-8");
    expect(resolution.providerRecommended).toBe("claude-opus-4-8");
    expect(resolution.migrated).toBe(true);
    expect(PROVIDER_MODEL_REGISTRY.anthropic.preferred).toBe("claude-opus-5");
  });

  it("migrates shutdown Gemini generations but preserves still-supported 2.5", () => {
    expect(resolveGeminiModelName("gemini-1.5-flash-latest")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("gemini-1.5-flash")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("gemini-2.0-flash")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModelName("gemini-2.0-flash-lite")).toBe("gemini-3.5-flash-lite");
    expect(resolveGeminiModelName("gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });

  it("normalizes Gemini model prefixes and preserves current/unknown ids", () => {
    expect(resolveGeminiModelName()).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("models/gemini-2.5-flash")).toBe("gemini-2.5-flash");
    expect(resolveGeminiModelName("gemini-3.8-flash")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("custom-gemini-model")).toBe("custom-gemini-model");
  });

  it("normalizes retired env configuration at the runtime-policy boundary", () => {
    const policy = getAiRuntimePolicyFromEnv({
      ANTHROPIC_MODEL: "claude-opus-4-1-20250805",
      GEMINI_MODEL: "gemini-2.0-flash",
    });
    expect(policy.anthropic.model).toBe("claude-opus-4-8");
    expect(policy.gemini.model).toBe("gemini-3.6-flash");
  });

  it("keeps known retired model ids out of runtime configuration surfaces", () => {
    const repoRoot = path.resolve(process.cwd(), "../..");
    const retiredIds = knownRetiredModelIds();
    const offenders: string[] = [];

    for (const relativePath of RUNTIME_MODEL_CONFIG_FILES) {
      const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
      for (const retiredId of retiredIds) {
        if (content.includes(retiredId)) offenders.push(`${relativePath}: ${retiredId}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
