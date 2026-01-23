import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { dossierRevisionsCol } from "@features/dossier/db";
import { computeRevisionHash } from "@features/dossier/revisionHash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISABLE_HASH_CHAIN = process.env.VOG_DISABLE_REVISION_HASH_CHAIN === "1";

type RouteContext = {
  params: Promise<{ dossierId: string }>;
};

function parseTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  if (DISABLE_HASH_CHAIN) {
    return NextResponse.json({ ok: false, error: "hash_chain_disabled" }, { status: 409 });
  }

  const { dossierId } = await context.params;
  const items = await (await dossierRevisionsCol())
    .find({ dossierId })
    .sort({ timestamp: 1, _id: 1 })
    .toArray();

  let prevHash: string | undefined;
  for (let idx = 0; idx < items.length; idx += 1) {
    const rev = items[idx] as any;
    const timestamp = parseTimestamp(rev.timestamp);
    if (!timestamp) {
      return NextResponse.json({
        ok: false,
        index: idx,
        revId: rev.revId,
        error: "invalid_timestamp",
      }, { status: 409 });
    }

    const expected = computeRevisionHash({
      prevHash,
      dossierId: rev.dossierId,
      entityType: rev.entityType,
      entityId: rev.entityId,
      action: rev.action,
      diffSummary: rev.diffSummary,
      byRole: rev.byRole,
      byUserId: rev.byUserId ? String(rev.byUserId) : undefined,
      timestamp,
    });

    const prevOk = (rev.prevHash ?? undefined) === prevHash;
    const hashOk = rev.hash === expected;
    if (!prevOk || !hashOk) {
      return NextResponse.json({
        ok: false,
        index: idx,
        revId: rev.revId,
        error: prevOk ? "hash_mismatch" : "prev_hash_mismatch",
        expectedPrevHash: prevHash ?? null,
        actualPrevHash: rev.prevHash ?? null,
        expectedHash: expected,
        actualHash: rev.hash ?? null,
      }, { status: 409 });
    }

    prevHash = rev.hash;
  }

  return NextResponse.json({
    ok: true,
    count: items.length,
    lastHash: prevHash ?? null,
  });
}
