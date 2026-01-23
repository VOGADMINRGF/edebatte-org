import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { ErrorLogModel } from "@/models/ErrorLog";

function buildRegex(raw?: string | null) {
  const value = raw?.trim();
  if (!value) return null;
  return new RegExp(escapeRegExp(value), "i");
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));
  const level = searchParams.get("level");
  const resolved = searchParams.get("resolved");
  const traceId = searchParams.get("traceId");
  const query = searchParams.get("q");

  const filter: any = {};
  if (level) filter.level = level;
  if (resolved === "true") filter.resolved = true;
  if (resolved === "false") filter.resolved = false;
  if (traceId) filter.traceId = traceId;

  const regex = buildRegex(query);
  if (regex) {
    filter.$or = [
      { message: { $regex: regex } },
      { path: { $regex: regex } },
      { traceId: { $regex: regex } },
    ];
  }

  const col = await ErrorLogModel.collection();
  const total = await col.countDocuments(filter);
  const projection = {
    traceId: 1,
    message: 1,
    level: 1,
    timestamp: 1,
    createdAt: 1,
    resolved: 1,
    path: 1,
  };

  const items = await col
    .find(filter, { projection } as any)
    .sort({ timestamp: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  const mapped = items.map((item: any) => ({
    ...item,
    _id: item._id?.toString?.() ?? String(item._id),
  }));

  return NextResponse.json({ ok: true, items: mapped, page, pageSize, total });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
