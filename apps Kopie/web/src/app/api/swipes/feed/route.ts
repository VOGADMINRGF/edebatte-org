import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAccountOverview } from "@features/account/service";
import { getSwipeFeed } from "@/features/swipes/service";
import type { SwipeFeedRequest } from "@/features/swipes/types";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<SwipeFeedRequest>;

  const overview = await getAccountOverview(userId);
  const edebattePackage = (overview as any)?.edebatte?.package ?? "none";

  const feedReq: SwipeFeedRequest = {
    userId,
    edebattePackage,
    filter: body.filter,
    cursor: body.cursor ?? null,
    limit: body.limit ?? 20,
  };

  const resp = await getSwipeFeed(feedReq);
  return NextResponse.json(resp);
}
