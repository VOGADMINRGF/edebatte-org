import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PROVIDER_MODEL_REGISTRY } from "@features/ai/providerModelRegistry";
import {
  deriveProviderModelLifecycleHealth,
  probeProviderModelLifecycle,
  probeProviderModelsLifecycle,
} from "@features/ai/providerModelLifecycleProbe";

const repoRoot = path.resolve(process.cwd(), "../..");
const allowedRuntimeFile = path.normalize("features/ai/providerModelRegistry.ts");
const scannedRoots = [
  "features/ai",
  "apps/web/src",
  "scripts",
  "apps/web/.env.example",
] as const;
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".sh", ".json", ".example"]);

function retiredModelIds(): string[] {
  return Array.from(
    new Set(
      Object.values(PROVIDER_MODEL_REGISTRY).flatMap((entry) =>
        Object.keys(entry.retiredReplacements),
      ),
    ),
  ).sort((a, b) => b.length - a.length);
}

function collectFiles(candidate: string): string[] {
  const absolute = path.join(repoRoot, candidate);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];

  const out: string[] = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(path.relative(repoRoot, child)));
      continue;
    }
    const ext = path.extname(entry.name);
    if (textExtensions.has(ext)) out.push(child);
  }
  return out;
}

describe("AI provider model governance", () => {
  it("allows retired provider model IDs only in the central lifecycle registry", () => {
    const retired = retiredModelIds();
    expect(retired.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const root of scannedRoots) {
      for (const absolute of collectFiles(root)) {
        const relative = path.normalize(path.relative(repoRoot, absolute));
        if (relative === allowedRuntimeFile) continue;
        const content = fs.readFileSync(absolute, "utf8");
        for (const model of retired) {
          if (content.includes(model)) violations.push(`${relative}: ${model}`);
        }
      }
    }

    expect(violations, `Retired model IDs found outside ${allowedRuntimeFile}`).toEqual([]);
  });

  it("uses a targeted provider lookup when validating one OpenAI model", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toBe("https://api.openai.com/v1/models/gpt-5.6-sol");
      return new Response(JSON.stringify({ id: "gpt-5.6-sol" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const result = await probeProviderModelLifecycle("openai", {
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-5",
      },
      fetchImpl,
      configuredModelOverride: "gpt-5.6-sol",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.configuredModel).toBe("gpt-5.6-sol");
    expect(result.effectiveModel).toBe("gpt-5.6-sol");
    expect(result.modelAvailable).toBe(true);
    expect(result.status).toBe("ok");
  });

  it("treats a targeted 404 as model_not_found instead of provider_error", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "model not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await probeProviderModelLifecycle("openai", {
      env: { OPENAI_API_KEY: "test-key", OPENAI_MODEL: "missing-model" },
      fetchImpl,
    });

    expect(result.providerReachable).toBe(true);
    expect(result.modelAvailable).toBe(false);
    expect(result.status).toBe("model_not_found");
    expect(result.httpStatus).toBe(404);
  });

  it("uses x-goog-api-key header and no query-string secret for Gemini", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash");
      expect(String(url)).not.toContain("test-gemini-key");
      const headers = new Headers(init?.headers);
      expect(headers.get("x-goog-api-key")).toBe("test-gemini-key");
      return new Response(
        JSON.stringify({ name: "models/gemini-3.8-flash", baseModelId: "gemini-3.8-flash" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await probeProviderModelLifecycle("gemini", {
      env: { GEMINI_API_KEY: "test-gemini-key", GEMINI_MODEL: "gemini-3.8-flash" },
      fetchImpl,
    });

    expect(result.status).toBe("ok");
    expect(result.modelAvailable).toBe(true);
  });

  it("loads a provider catalog once when validating several routed models", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      expect(String(url)).toBe("https://api.openai.com/v1/models");
      return new Response(
        JSON.stringify({
          data: [
            { id: "gpt-5" },
            { id: "gpt-5.6-luna" },
            { id: "gpt-5.6-sol" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const results = await probeProviderModelsLifecycle(
      "openai",
      [undefined, "gpt-5.6-luna", "gpt-5.6-sol"],
      {
        env: {
          OPENAI_API_KEY: "test-key",
          OPENAI_MODEL: "gpt-5",
        },
        fetchImpl,
      },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(results.map((entry) => entry.effectiveModel)).toEqual([
      "gpt-5",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
    ]);
    expect(results.every((entry) => entry.status === "ok")).toBe(true);
  });

  it("distinguishes healthy, degraded and blocked lifecycle states", async () => {
    const healthyFetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: "gpt-5" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const healthy = await probeProviderModelLifecycle("openai", {
      env: { OPENAI_API_KEY: "test-key", OPENAI_MODEL: "gpt-5" },
      fetchImpl: healthyFetch,
    });

    const degraded = await probeProviderModelLifecycle("anthropic", { env: {} });

    const blockedFetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "model not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const blocked = await probeProviderModelLifecycle("openai", {
      env: { OPENAI_API_KEY: "test-key", OPENAI_MODEL: "gpt-5.6-sol" },
      fetchImpl: blockedFetch,
    });

    expect(deriveProviderModelLifecycleHealth([healthy])).toBe("healthy");
    expect(deriveProviderModelLifecycleHealth([healthy, degraded])).toBe("degraded");
    expect(deriveProviderModelLifecycleHealth([healthy, degraded, blocked])).toBe("blocked");
  });

  it("prevents automatic Vercel deployments for docs and AI-hardening branches while keeping main enabled", () => {
    const config = JSON.parse(fs.readFileSync(path.join(repoRoot, "vercel.json"), "utf8"));
    expect(config.git?.deploymentEnabled?.main).toBe(true);
    expect(config.git?.deploymentEnabled?.["docs/**"]).toBe(false);
    expect(config.git?.deploymentEnabled?.["hardening/ai-*"]).toBe(false);
  });
});
