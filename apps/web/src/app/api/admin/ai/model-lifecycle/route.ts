import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { getAiRuntimePolicy } from "@features/ai/aiRuntimePolicy";
import { probeAllCoreProviderModels } from "@features/ai/providerModelLifecycleProbe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrResponse(req);
  if (auth instanceof Response) return auth;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const [providers, policy] = await Promise.all([
      probeAllCoreProviderModels({ signal: controller.signal }),
      Promise.resolve(getAiRuntimePolicy()),
    ]);
    const healthy = providers.every((entry) =>
      entry.status === "ok" || entry.status === "retired_migrated" || entry.status === "config_missing",
    );
    const drift = providers.filter((entry) => entry.migrated || entry.status === "model_not_found");

    return NextResponse.json(
      {
        ok: healthy,
        checkedAt: new Date().toISOString(),
        routing: {
          mode: policy.modelRoutingMode,
          profiles: policy.profiles,
          providers: {
            openai: policy.openai.modelsByProfile,
            anthropic: policy.anthropic.modelsByProfile,
            mistral: policy.mistral.modelsByProfile,
            gemini: policy.gemini.modelsByProfile,
          },
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
