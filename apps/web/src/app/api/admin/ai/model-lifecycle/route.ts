import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { getAiRuntimePolicy, type AiRuntimeProfileName } from "@features/ai/aiRuntimePolicy";
import {
  deriveProviderModelLifecycleHealth,
  probeProviderModelsLifecycle,
} from "@features/ai/providerModelLifecycleProbe";
import type { CoreModelProvider } from "@features/ai/providerModelRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORE_PROVIDERS: CoreModelProvider[] = ["openai", "anthropic", "mistral", "gemini"];

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrResponse(req);
  if (auth instanceof Response) return auth;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const policy = getAiRuntimePolicy();
    const modelsByProvider = {
      openai: policy.openai.modelsByProfile,
      anthropic: policy.anthropic.modelsByProfile,
      mistral: policy.mistral.modelsByProfile,
      gemini: policy.gemini.modelsByProfile,
    } as const;

    const providerGroups = await Promise.all(
      CORE_PROVIDERS.map(async (provider) => {
        const profileModels = modelsByProvider[provider];
        const uniqueModels = Array.from(new Set(Object.values(profileModels)));
        const results = await probeProviderModelsLifecycle(
          provider,
          [undefined, ...uniqueModels],
          { signal: controller.signal },
        );
        const [providerResult, ...routedResults] = results;
        if (!providerResult) throw new Error(`provider lifecycle result missing for ${provider}`);

        return {
          providerResult,
          routingChecks: uniqueModels.map((model, index) => ({
            provider,
            model,
            profiles: (Object.entries(profileModels) as Array<[AiRuntimeProfileName, string]>)
              .filter(([, candidate]) => candidate === model)
              .map(([profile]) => profile),
            result: routedResults[index]!,
          })),
        };
      }),
    );

    const providers = providerGroups.map((group) => group.providerResult);
    const routingChecks = providerGroups.flatMap((group) => group.routingChecks);
    const allResults = [...providers, ...routingChecks.map((entry) => entry.result)];
    const health = deriveProviderModelLifecycleHealth(allResults);
    const ok = health !== "blocked";
    const drift = [
      ...providers.filter((entry) => entry.migrated || entry.status === "model_not_found"),
      ...routingChecks
        .filter((entry) => entry.result.migrated || entry.result.status === "model_not_found")
        .map((entry) => ({
          ...entry.result,
          profiles: entry.profiles,
          routedModel: entry.model,
        })),
    ];

    return NextResponse.json(
      {
        ok,
        health,
        checkedAt: new Date().toISOString(),
        routing: {
          mode: policy.modelRoutingMode,
          profiles: policy.profiles,
          providers: modelsByProvider,
          checks: routingChecks,
        },
        providers,
        drift,
      },
      {
        status: health === "blocked" ? 503 : 200,
        headers: { "cache-control": "no-store" },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
