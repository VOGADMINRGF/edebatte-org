export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import type { AuditEventDoc } from "@features/audit/types";

const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const scope = params.get("scope")?.trim();
  const action = params.get("action")?.trim();
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? 30)));

  const filter: Record<string, unknown> = {};
  if (scope) filter.scope = scope;
  if (action) filter.action = action;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    filter.at = range;
  }
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { action: regex },
      { "target.type": regex },
      { "target.id": regex },
    ];
  }

  const col = await coreCol<AuditEventDoc>("audit_events");
  const total = await col.countDocuments(filter);
  const rows = await col
    .find(filter)
    .sort({ at: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const items = rows.map((row) => ({
    id: row._id ? String(row._id) : undefined,
    at: row.at ? row.at.toISOString() : null,
    scope: row.scope,
    action: row.action,
    target: row.target,
    actor: {
      userId: row.actor?.userId ? String(row.actor.userId) : null,
      ipHash: row.actor?.ipHash ?? null,
    },
    reason: row.reason ?? null,
  }));

  return NextResponse.json({ ok: true, items, total, page, pageSize });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
