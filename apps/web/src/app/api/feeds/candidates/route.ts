import { NextRequest, NextResponse } from "next/server";
import { statementCandidatesCol } from "@features/feeds/db";
import { requireAdminOrEditor } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrEditor(req);
  if (gate) return gate;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 200);
  const status = url.searchParams.get("status");
  const query: Record<string, unknown> = {};
  if (status) query.analyzeStatus = status;

  const col = await statementCandidatesCol();
  const docs = await col
    .find(query)
    .sort({ analyzeRequestedAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({
    ok: true,
    count: docs.length,
    items: docs.map((d: any) => ({
      id: d.id,
      sourceTitle: d.sourceTitle,
      sourceUrl: d.sourceUrl,
      analyzeStatus: d.analyzeStatus,
      analyzeError: d.analyzeError ?? null,
      createdAt: d.createdAt,
      publishedAt: d.publishedAt ?? null,
    })),
  });
}
