import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import ResponsibilityDirectoryEntry from "@/models/responsibility/DirectoryEntry";
import { rateLimit } from "@/utils/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<Response | null> {
  const jar = await cookies();
  if (jar.get("u_role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const entries = await ResponsibilityDirectoryEntry.find({})
    .sort({ level: 1, displayName: 1 })
    .lean();
  return NextResponse.json({ ok: true, entries });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const rl = await rateLimit("admin:responsibility:directory", 30, 60 * 60 * 1000, {
    salt: "admin",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }

  const body = await req.json();
  if (!body || typeof body.actorKey !== "string" || !body.actorKey.trim()) {
    return NextResponse.json(
      { ok: false, error: "actorKey required" },
      { status: 400 },
    );
  }

  const payload = {
    actorKey: body.actorKey.trim(),
    level: body.level ?? "unknown",
    locale: body.locale ?? "de",
    regionCode: body.regionCode ?? undefined,
    displayName: body.displayName ?? body.actorKey,
    description: body.description ?? undefined,
    contactUrl: body.contactUrl ?? undefined,
    meta: body.meta ?? undefined,
  };

  const entry = await ResponsibilityDirectoryEntry.findOneAndUpdate(
    { actorKey: payload.actorKey },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return NextResponse.json({ ok: true, entry });
}
