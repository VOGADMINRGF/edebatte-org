import { NextRequest, NextResponse } from "next/server";
import ResponsibilityDirectoryEntry from "@/models/responsibility/DirectoryEntry";
import { logger } from "@/utils/logger";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") ?? undefined;
  const level = searchParams.get("level") ?? undefined;
  const regionCode = searchParams.get("regionCode") ?? undefined;

  const filter: Record<string, any> = {};
  if (locale) filter.locale = locale;
  if (level) filter.level = level;
  if (regionCode) filter.regionCode = regionCode;

  const rl = await rateLimitOrThrow("responsibility:directory", 200, 60 * 60 * 1000, {
    salt: "public",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }

  try {
    const entries = await ResponsibilityDirectoryEntry.find(filter)
      .sort({ level: 1, displayName: 1 })
      .lean();

    return NextResponse.json({ ok: true, entries });
  } catch (err: any) {
    logger.error({ msg: "responsibility.directory.read_failed", err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
