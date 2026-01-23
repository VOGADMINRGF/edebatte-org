import { NextRequest, NextResponse } from "next/server";
import { voteDraftsCol } from "@features/feeds/db";
import { requireAdminOrEditor } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrEditor(req);
  if (gate) return gate;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 200);

  const col = await voteDraftsCol();
  const docs = await col.find({}).sort({ createdAt: -1 }).limit(limit).toArray();

  return NextResponse.json({
    ok: true,
    count: docs.length,
    items: docs.map((d: any) => ({
      id: d._id ? String(d._id) : d.id,
      title: d.title,
      sourceUrl: d.sourceUrl,
      claimsCount: Array.isArray(d.claims) ? d.claims.length : 0,
      createdAt: d.createdAt,
      status: d.status,
    })),
  });
}
