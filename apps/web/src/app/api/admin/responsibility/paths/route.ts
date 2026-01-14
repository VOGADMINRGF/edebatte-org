import { NextRequest, NextResponse } from "next/server";
import ResponsibilityPath from "@/models/responsibility/Path";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { searchParams } = new URL(req.url);
  const statementId = searchParams.get("statementId");

  const filter = statementId ? { statementId } : {};
  const paths = await ResponsibilityPath.find(filter).sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ ok: true, paths });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const rl = await rateLimitOrThrow("admin:responsibility:paths", 30, 60 * 60 * 1000, {
    salt: "admin",
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", retryInMs: rl.retryIn },
      { status: 429 },
    );
  }

  const body = await req.json();
  if (!body || typeof body.statementId !== "string" || !Array.isArray(body.nodes)) {
    return NextResponse.json(
      { ok: false, error: "statementId and nodes[] are required" },
      { status: 400 },
    );
  }

  const payload = {
    statementId: body.statementId,
    locale: body.locale ?? "de",
    nodes: body.nodes.map((node: any) => ({
      level: node.level ?? "unknown",
      actorKey: node.actorKey ?? "unknown",
      displayName: node.displayName ?? node.actorKey ?? "Unbekannt",
      description: node.description ?? undefined,
      contactUrl: node.contactUrl ?? undefined,
      processHint: node.processHint ?? undefined,
      relevance: typeof node.relevance === "number" ? node.relevance : undefined,
    })),
  };

  const path = await ResponsibilityPath.findOneAndUpdate(
    { statementId: payload.statementId },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return NextResponse.json({ ok: true, path });
}
