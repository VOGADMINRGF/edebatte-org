import { NextRequest, NextResponse } from "next/server";
import { getUsageSnapshot } from "@core/telemetry/aiUsageSnapshot";
import type {
  AiPipelineName,
  AiProviderName,
} from "@core/telemetry/aiUsageTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(value: string | null): number {
  switch (value) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    default:
      return 1;
  }
}

function normalizeProvider(value: string | null): AiProviderName | undefined {
  if (!value || value === "all") return undefined;
  return value as AiProviderName;
}

function normalizePipeline(value: string | null): AiPipelineName | undefined {
  if (!value || value === "all") return undefined;
  return value as AiPipelineName;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const snapshot = await getUsageSnapshot({
      rangeDays: parseRange(searchParams.get("range")),
      provider: normalizeProvider(searchParams.get("provider")),
      pipeline: normalizePipeline(searchParams.get("pipeline")),
      region: searchParams.get("region") ?? undefined,
    });
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("[api] telemetry snapshot error", error);
    return NextResponse.json(
      { ok: false, error: "Telemetry not available" },
      { status: 500 },
    );
  }
}
