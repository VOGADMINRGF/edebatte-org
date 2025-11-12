import { ObjectId } from "@core/triMongo";
import { NextRequest, NextResponse } from "next/server";


export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!ObjectId.isValid(params.id))
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
    body: JSON.stringify({ statementId: params.id, value: reaction }),
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  return NextResponse.json(j, { status: r.status });
}
