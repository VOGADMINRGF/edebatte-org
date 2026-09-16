import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { probeAllCoreProviderModels } from "@features/ai/providerModelLifecycleProbe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminOrResponse();
  if (auth instanceof NextResponse) return auth;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const providers = await probeAllCoreProviderModels({ signal: controller.signal });
    const healthy = providers.every((entry) =>
      entry.status === "ok" || entry.status === "retired_migrated" || entry.status === "config_missing",
    );
    const drift = providers.filter((entry) => entry.migrated || entry.status === "model_not_found");

    return NextResponse.json(
      {
        ok: healthy,
        checkedAt: new Date().toISOString(),
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
