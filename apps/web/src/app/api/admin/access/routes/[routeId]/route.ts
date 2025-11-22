export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEffectiveRoutePolicy, upsertRoutePolicy } from "@core/access/db";
import type { AccessGroup, RouteId } from "@features/access/types";
import { isStaffRequest } from "../../../feeds/utils";

export async function PATCH(req: NextRequest, { params }: { params: { routeId: string } }) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const routeId = params.routeId as RouteId;
  const policy = await getEffectiveRoutePolicy(routeId);
  if (!policy) {
    return NextResponse.json({ ok: false, error: "unknown_route" }, { status: 404 });
  }
  if (policy.locked) {
    return NextResponse.json({ ok: false, error: "locked_route" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    defaultGroups?: AccessGroup[];
    allowAnonymous?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const defaultGroups =
    body.defaultGroups && Array.isArray(body.defaultGroups)
      ? (Array.from(new Set(body.defaultGroups)) as AccessGroup[])
      : policy.defaultGroups;
  const allowAnonymous =
    typeof body.allowAnonymous === "boolean" ? body.allowAnonymous : policy.allowAnonymous;

  await upsertRoutePolicy(routeId, { defaultGroups, allowAnonymous });

  const updated = await getEffectiveRoutePolicy(routeId);
  return NextResponse.json({ ok: true, policy: updated });
}
