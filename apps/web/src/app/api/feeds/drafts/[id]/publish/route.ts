import { NextRequest, NextResponse } from "next/server";
import { publishVoteDraft } from "@features/feeds/publishVoteDraft";
import { requireAdminOrEditor } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminOrEditor(req);
  if (gate) return gate;

  const { id } = await ctx.params;
  const out = await publishVoteDraft(id);
  const status = out.ok
    ? 200
    : out.error === "draft_not_found" || out.error === "candidate_not_found" || out.error === "analyze_result_not_found"
    ? 404
    : out.error === "already_published"
    ? 409
    : 400;
  return NextResponse.json(out, { status });
}
