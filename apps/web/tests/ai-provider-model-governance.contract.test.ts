import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PROVIDER_MODEL_REGISTRY } from "@features/ai/providerModelRegistry";
import { probeProviderModelLifecycle } from "@features/ai/providerModelLifecycleProbe";

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

  it("checks the explicitly routed model instead of silently probing the legacy provider model", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ id: "gpt-5.6-sol" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    const result = await probeProviderModelLifecycle("openai", {
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-5",
      },
      fetchImpl,
      configuredModelOverride: "gpt-5.6-sol",
    });

    expect(result.configuredModel).toBe("gpt-5.6-sol");
    expect(result.effectiveModel).toBe("gpt-5.6-sol");
    expect(result.modelAvailable).toBe(true);
    expect(result.status).toBe("ok");
  });
});
