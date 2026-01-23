import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getEventualitiesForStatement } from "@/features/swipes/service";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { statementId?: string };

  if (!body.statementId) {
    return NextResponse.json({ error: "MISSING_STATEMENT_ID" }, { status: 400 });
  }

  const resp = await getEventualitiesForStatement({
    userId,
    statementId: body.statementId,
  });

  return NextResponse.json(resp);
}
