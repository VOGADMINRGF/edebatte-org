export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { callE150Orchestrator } from "@features/ai/orchestratorE150";
import { callOpenAIJson } from "@features/ai";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

const SMOKE_SYSTEM_PROMPT =
  "You are the E150 orchestration smoke-tester. Respond exactly with 'OK'.";
const SMOKE_USER_PROMPT =
  "E150 Orchestrator Smoke Test. Please respond with exactly 'OK'.";

type ProviderSmokeResult = {
  providerId: string;
  ok: boolean;
  durationMs: number;
  errorMessage?: string;
  state?: "disabled" | "skipped";
};

type OrchestratorSmokeResponse = {
  ok: boolean;
  bestProviderId?: string | null;
  bestRawText?: string | null;
  results: ProviderSmokeResult[];
  error?: string;
  probeStatus?: Record<string, { ok: boolean; errorKind: string | null; durationMs: number }>;
  probes?: Record<string, { ok: boolean; errorKind: string | null; status?: number | null; latencyMs?: number; checkedAt?: number }>;
};

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const mode = req.nextUrl.searchParams.get("mode");
  if (mode === "full") {
    return runFullSmoke();
  }

  try {
    const orchestratorResult = await callE150Orchestrator({
      systemPrompt: SMOKE_SYSTEM_PROMPT,
      userPrompt: SMOKE_USER_PROMPT,
      maxTokens: 32,
      timeoutMs: 3_000,
      telemetry: {
        pipeline: "orchestrator_smoke",
      },
    });

    const providerResults = buildProviderResults(orchestratorResult);

    const payload: OrchestratorSmokeResponse = {
      ok: providerResults.some((r) => r.ok),
      bestProviderId: orchestratorResult.best.provider,
      bestRawText: orchestratorResult.best.rawText,
      results: providerResults,
      probeStatus: Object.fromEntries(
        (orchestratorResult.meta.probes ?? []).map((p) => [
          p.provider,
          { ok: p.ok, errorKind: p.errorKind ?? null, durationMs: p.durationMs },
        ]),
      ),
      probes: Object.fromEntries(
        (orchestratorResult.meta.probes ?? []).map((p) => [
          p.provider,
          {
            ok: p.ok,
            errorKind: p.errorKind ?? null,
            status: (p as any).status ?? null,
            latencyMs: p.durationMs,
            checkedAt: (p as any).checkedAt ?? null,
          },
        ]),
      ),
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    const fallback = await runFallbackProviders().catch((fallbackErr) => [
      {
        providerId: "openai",
        ok: false,
        durationMs: 0,
        errorMessage:
          (fallbackErr as Error)?.message ?? "Fallback smoke test failed",
      },
    ]);

    return NextResponse.json({
      ok: fallback.some((entry) => entry.ok),
      bestProviderId: fallback.find((entry) => entry.ok)?.providerId ?? null,
      bestRawText: null,
      results: fallback,
      error: err?.message ?? "orchestrator error",
    } satisfies OrchestratorSmokeResponse);
  }
}

function buildProviderResults(orchestratorResult: Awaited<ReturnType<typeof callE150Orchestrator>>) {
  const candidateMap = new Map(
    orchestratorResult.candidates.map((candidate) => [candidate.provider, candidate]),
  );
  const failureMap = new Map(orchestratorResult.meta.failedProviders.map((fail) => [fail.provider, fail.error]));
  const disabled = orchestratorResult.meta.disabledProviders ?? [];
  const skipped = orchestratorResult.meta.skippedProviders ?? [];

  const used = orchestratorResult.meta.usedProviders.map((providerId) => {
    const candidate = candidateMap.get(providerId);
    const errorMessage = failureMap.get(providerId);
    const duration = orchestratorResult.meta.timings[providerId] ?? candidate?.durationMs ?? 0;

    return {
      providerId,
      ok: Boolean(candidate),
      durationMs: duration,
      errorMessage,
    } satisfies ProviderSmokeResult;
  });

  const disabledRows = disabled.map((entry) => ({
    providerId: entry.provider,
    ok: false,
    durationMs: 0,
    errorMessage: entry.reason,
    state: "disabled" as const,
  }));

  const skippedRows = skipped.map((entry) => ({
    providerId: entry.provider,
    ok: false,
    durationMs: 0,
    errorMessage: entry.reason,
    state: "skipped" as const,
  }));

  return [...used, ...disabledRows, ...skippedRows];
}

async function runFallbackProviders(): Promise<ProviderSmokeResult[]> {
  const started = Date.now();
  try {
    await callOpenAIJson({
      system: SMOKE_SYSTEM_PROMPT,
      user: SMOKE_USER_PROMPT,
      max_tokens: 32,
    });
    return [
      {
        providerId: "openai",
        ok: true,
        durationMs: Date.now() - started,
        errorMessage: undefined,
      },
    ];
  } catch (err: any) {
    return [
      {
        providerId: "openai",
        ok: false,
        durationMs: Date.now() - started,
        errorMessage: err?.message ?? "OpenAI fallback error",
      },
    ];
  }
}

const FULL_SAMPLE_TEXT =
  "In unserer Stadt soll ein autofreier Sonntag pro Monat eingeführt werden, um die Luftqualität zu verbessern und den ÖPNV zu stärken. Gleichzeitig gibt es Bedenken wegen Umsatzeinbußen im Einzelhandel und fehlender Barrierefreiheit für ältere Menschen.";

function cleanJson(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) cleaned = cleaned.slice(firstNewline + 1);
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence !== -1) cleaned = cleaned.slice(0, lastFence);
    cleaned = cleaned.trim();
  }
  return cleaned;
}

function validateCandidate(rawText: string): { ok: boolean; message?: string } {
  try {
    const parsed = JSON.parse(cleanJson(rawText));
    if (!parsed || typeof parsed !== "object") return { ok: false, message: "empty payload" };
    if (!Array.isArray((parsed as any).claims)) {
      return { ok: false, message: "claims missing" };
    }
    if (!Array.isArray((parsed as any).notes)) {
      return { ok: false, message: "notes missing" };
    }
    if (!Array.isArray((parsed as any).questions)) {
      return { ok: false, message: "questions missing" };
    }
    if (!Array.isArray((parsed as any).knots)) {
      return { ok: false, message: "knots missing" };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "parse failed" };
  }
}

async function runFullSmoke() {
  try {
    const orchestratorResult = await callE150Orchestrator({
      systemPrompt:
        "You are the E150 orchestrator. Return strictly valid JSON for contribution analysis, including claims, notes, questions and knots.",
      userPrompt: FULL_SAMPLE_TEXT,
      maxTokens: 1_400,
      timeoutMs: 10_000,
      requiredCapability: "core_analysis",
      telemetry: {
        pipeline: "orchestrator_smoke",
      },
    });

    const providerResults = buildProviderResults(orchestratorResult).map((row) => {
      if (!row.ok) return row;
      const candidate = orchestratorResult.candidates.find((c) => c.provider === row.providerId);
      if (!candidate) return row;
      const validation = validateCandidate(candidate.rawText);
      return {
        ...row,
        ok: validation.ok,
        errorMessage: validation.ok ? row.errorMessage : validation.message,
      } satisfies ProviderSmokeResult;
    });

    const payload: OrchestratorSmokeResponse = {
      ok: providerResults.some((r) => r.ok),
      bestProviderId: orchestratorResult.best.provider,
      bestRawText: orchestratorResult.best.rawText,
      results: providerResults,
      probeStatus: Object.fromEntries(
        (orchestratorResult.meta.probes ?? []).map((p) => [
          p.provider,
          { ok: p.ok, errorKind: p.errorKind ?? null, durationMs: p.durationMs },
        ]),
      ),
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        results: [],
        error: err?.message ?? "full smoke failed",
      } satisfies OrchestratorSmokeResponse,
      { status: 500 },
    );
  }
}
