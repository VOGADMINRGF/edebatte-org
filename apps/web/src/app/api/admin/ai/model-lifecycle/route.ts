import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { getAiRuntimePolicy, type AiRuntimeProfileName } from "@features/ai/aiRuntimePolicy";
import {
  probeAllCoreProviderModels,
  probeProviderModelLifecycle,
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
    const providers = await probeAllCoreProviderModels({ signal: controller.signal });
    const modelsByProvider = {
      openai: policy.openai.modelsByProfile,
      anthropic: policy.anthropic.modelsByProfile,
      mistral: policy.mistral.modelsByProfile,
      gemini: policy.gemini.modelsByProfile,
    } as const;

    const routedTargets = CORE_PROVIDERS.flatMap((provider) => {
      const profileModels = modelsByProvider[provider];
      const uniqueModels = Array.from(new Set(Object.values(profileModels)));
      return uniqueModels.map((model) => ({
        provider,
        model,
        profiles: (Object.entries(profileModels) as Array<[AiRuntimeProfileName, string]>)
          .filter(([, candidate]) => candidate === model)
          .map(([profile]) => profile),
      }));
    });

    const routingChecks = await Promise.all(
      routedTargets.map(async (target) => ({
        ...target,
        result: await probeProviderModelLifecycle(target.provider, {
          signal: controller.signal,
          configuredModelOverride: target.model,
        }),
      })),
    );

    const acceptedStatus = (status: string) =>
      status === "ok" || status === "retired_migrated" || status === "config_missing";
    const healthy =
      providers.every((entry) => acceptedStatus(entry.status)) &&
      routingChecks.every((entry) => acceptedStatus(entry.result.status));
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
        ok: healthy,
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
        status: healthy ? 200 : 503,
        headers: { "cache-control": "no-store" },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
