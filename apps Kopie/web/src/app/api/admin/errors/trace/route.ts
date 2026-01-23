import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { ErrorLogModel } from "@/models/ErrorLog";

export async function PATCH(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const body = (await req.json().catch(() => null)) as {
    traceId?: string;
    resolved?: boolean;
  } | null;

  const traceId = body?.traceId?.trim();
  if (!traceId || typeof body?.resolved !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const col = await ErrorLogModel.collection();
  const res = await col.updateMany(
    { traceId },
    { $set: { resolved: body.resolved, updatedAt: new Date() } },
  );

  return NextResponse.json({
    ok: true,
    traceId,
    matched: res.matchedCount ?? 0,
    updated: res.modifiedCount ?? 0,
  });
}
