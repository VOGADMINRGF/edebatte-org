import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createDraft } from "@/server/draftStore";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const draft = await createDraft({
    kind: String(body?.kind ?? "contribution"),
    text: String(body?.text ?? ""),
    analysis: body?.analysis ?? {},
  });
  return NextResponse.json({ ok: true, id: draft.id, draft });
}
