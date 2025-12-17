import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { recordSwipeVote } from "@/modules/swipes/service";
import type { SwipeVotePayload } from "@/modules/swipes/types";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Omit<SwipeVotePayload, "userId" | "source">;

  if (!body.statementId || !body.decision) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const payload: SwipeVotePayload = {
    ...body,
    userId,
    source: "swipes",
  };

  await recordSwipeVote(payload);

  return NextResponse.json({ ok: true });
}
