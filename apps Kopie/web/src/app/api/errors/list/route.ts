import { NextResponse } from "next/server";
import { ErrorLogModel } from "@/models/ErrorLog";
import type { ErrorLogDoc } from "@/models/ErrorLog";

/** GET /api/errors/list?page&pageSize&level&resolved&traceId */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10)));

  const filter: any = {};
  const level = searchParams.get("level");
  if (level) filter.level = level;

  const resolved = searchParams.get("resolved");
  if (resolved === "true") filter.resolved = true;
  if (resolved === "false") filter.resolved = false;

  const traceId = searchParams.get("traceId");
  if (traceId) filter.traceId = traceId;

  const col = await ErrorLogModel.collection();
  const total = await col.countDocuments(filter as any);

  const projection = { traceId: 1, message: 1, level: 1, timestamp: 1, createdAt: 1, resolved: 1, path: 1 };

  const items = await col
    .find(filter as any, { projection } as any)
    .sort({ timestamp: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  return NextResponse.json({ total, items, page, pageSize });
}
