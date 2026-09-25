import { describe, expect, it } from "vitest";
import { resolveAnthropicModelName } from "@features/ai/providers/anthropic";
import { resolveGeminiModelName } from "@features/ai/providers/gemini";

describe("AI provider model lifecycle", () => {
  it("migrates retired Anthropic model ids before runtime calls", () => {
    expect(resolveAnthropicModelName("claude-opus-4-1-20250805")).toBe("claude-opus-5");
    expect(resolveAnthropicModelName("claude-opus-4-20250514")).toBe("claude-opus-5");
    expect(resolveAnthropicModelName("claude-sonnet-4-20250514")).toBe("claude-sonnet-5");
    expect(resolveAnthropicModelName("claude-3-7-sonnet-20250219")).toBe("claude-sonnet-5");
    expect(resolveAnthropicModelName("claude-3-5-sonnet-20240620")).toBe("claude-sonnet-5");
  });

  it("uses an active Anthropic default and preserves current/unknown ids", () => {
    expect(resolveAnthropicModelName()).toBe("claude-opus-5");
    expect(resolveAnthropicModelName("claude-sonnet-5")).toBe("claude-sonnet-5");
    expect(resolveAnthropicModelName("custom-anthropic-model")).toBe("custom-anthropic-model");
  });

  it("migrates retired or deprecated Gemini model ids before runtime calls", () => {
    expect(resolveGeminiModelName("gemini-1.5-flash-latest")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("gemini-1.5-flash")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("gemini-2.0-flash")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("gemini-2.0-flash-lite")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModelName("gemini-2.5-flash")).toBe("gemini-3.8-flash");
  });

  it("normalizes Gemini model prefixes and preserves current/unknown ids", () => {
    expect(resolveGeminiModelName()).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("models/gemini-2.5-flash")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("gemini-3.8-flash")).toBe("gemini-3.8-flash");
    expect(resolveGeminiModelName("custom-gemini-model")).toBe("custom-gemini-model");
  });
});
