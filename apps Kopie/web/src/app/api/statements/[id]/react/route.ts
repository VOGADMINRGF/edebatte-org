import { ObjectId } from "@core/db/triMongo";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!ObjectId.isValid(id))
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const { reaction } = await req.json().catch(() => ({}));
  if (!["agree", "neutral", "disagree"].includes(reaction)) {
    return NextResponse.json({ error: "bad_reaction" }, { status: 400 });
  }

  // intern an /api/votes/cast weiterreichen – Cookie direkt vom Request
  const r = await fetch(new URL("/api/votes/cast", req.url).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": req.cookies.get("u_id")?.value || "",
    },
    body: JSON.stringify({ statementId: id, value: reaction }),
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  return NextResponse.json(j, { status: r.status });
}
