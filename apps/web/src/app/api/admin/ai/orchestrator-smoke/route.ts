"use server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { callE150Orchestrator } from "@features/ai/orchestratorE150";
import { callOpenAIJson } from "@features/ai";
import { isStaffRequest } from "../../feeds/utils";

const SMOKE_SYSTEM_PROMPT =
  "You are the E150 orchestration smoke-tester. Respond exactly with 'OK'.";
const SMOKE_USER_PROMPT =
  "E150 Orchestrator Smoke Test. Please respond with exactly 'OK'.";

type ProviderSmokeResult = {
  providerId: string;
  ok: boolean;
  durationMs: number;
  errorMessage?: string;
};

type OrchestratorSmokeResponse = {
  ok: boolean;
  bestProviderId?: string | null;
  bestRawText?: string | null;
  results: ProviderSmokeResult[];
  error?: string;
};

export async function POST(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
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

  return orchestratorResult.meta.usedProviders.map((providerId) => {
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
