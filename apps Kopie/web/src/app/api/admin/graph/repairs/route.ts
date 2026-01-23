export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { graphRepairsCol } from "@features/graphAdmin/db";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const params = req.nextUrl.searchParams;
  const type = params.get("type")?.trim();
  const status = params.get("status")?.trim();
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get("limit") ?? 30)));

  const filter: Record<string, unknown> = {};
  if (type && type !== "all") filter.type = type;
  if (status && status !== "all") filter.status = status;

  const col = await graphRepairsCol();
  const total = await col.countDocuments(filter);
  const rows = await col
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const items = rows.map((row) => ({
    id: row._id ? String(row._id) : undefined,
    type: row.type,
    status: row.status,
    payload: row.payload,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
    appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
    rejectedAt: row.rejectedAt ? row.rejectedAt.toISOString() : null,
  }));

  return NextResponse.json({ ok: true, items, total, page, pageSize });
}
