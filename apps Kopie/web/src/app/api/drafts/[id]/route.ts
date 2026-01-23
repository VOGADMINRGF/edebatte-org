import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { patchDraft, getDraft } from "@/server/draftStore";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const draft = await getDraft(id);
  return NextResponse.json({ ok: !!draft, draft });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;        // <- Next verlangt await
  const body = await req.json();
  const res = await patchDraft(id, body);
  return NextResponse.json(res);
}
