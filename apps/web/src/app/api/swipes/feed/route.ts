import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getAccountOverview } from "@features/account/service";
import { getSwipeFeed } from "@/features/swipes/service";
import type { SwipeFeedRequest } from "@/features/swipes/types";
import {
  resolveRequestScopeContext,
  summarizeRequestScopeContext,
} from "@/lib/server/auth/requestScope";

const SWIPES_SEEN_COOKIE = "edb_swipes_seen";

function readSeenIds(raw?: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;

  const body = (await req.json().catch(() => ({}))) as Partial<SwipeFeedRequest>;

  const overview = userId ? await getAccountOverview(userId).catch(() => null) : null;
  const edebattePackage = (overview as any)?.edebatte?.package ?? "none";
  const requestScope = userId ? await resolveRequestScopeContext(req).catch(() => null) : null;
  const scopeSummary = summarizeRequestScopeContext(requestScope);

  const feedReq: SwipeFeedRequest = {
    userId,
    edebattePackage,
    filter: {
      ...(body.filter ?? {}),
      viewerRegionIds:
        (body.filter?.viewerRegionIds?.length ? body.filter.viewerRegionIds : scopeSummary?.regionIds) ?? [],
      organizationId: body.filter?.organizationId ?? scopeSummary?.organizationId ?? undefined,
      organizationIds:
        (body.filter?.organizationIds?.length
          ? body.filter.organizationIds
          : scopeSummary?.organizationId
            ? [scopeSummary.organizationId]
            : []) ?? [],
      adminContext: body.filter?.adminContext ?? scopeSummary?.isOperatorMode ?? false,
    },
    cursor: body.cursor ?? null,
    limit: body.limit ?? 20,
  };

  const resp = await getSwipeFeed(feedReq);
  const seenIds = readSeenIds(cookieStore.get(SWIPES_SEEN_COOKIE)?.value);
  return NextResponse.json({
    ...resp,
    items: resp.items
      .filter((item) => !seenIds.has(item.id))
      .map((item) => ({
        ...item,
        hasEventualities: false,
      })),
  });
}
