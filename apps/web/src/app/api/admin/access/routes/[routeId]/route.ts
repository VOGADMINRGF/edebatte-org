export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getCustomRoutePolicy,
  getEffectiveRoutePolicy,
  upsertRoutePolicy,
  upsertCustomRoutePolicy,
  deleteCustomRoutePolicy,
  deleteRoutePolicyOverride,
} from "@core/access/db";
import type { AccessGroup, RouteId } from "@features/access/types";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ routeId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { routeId: rawRouteId } = await context.params;
  const routeId = rawRouteId as RouteId;
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

  const custom = await getCustomRoutePolicy(routeId);
  if (custom) {
    await upsertCustomRoutePolicy({
      ...custom,
      defaultGroups,
      allowAnonymous,
    });
  } else {
    await upsertRoutePolicy(routeId, { defaultGroups, allowAnonymous });
  }

  const updated = await getEffectiveRoutePolicy(routeId);
  return NextResponse.json({ ok: true, policy: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ routeId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { routeId: rawRouteId } = await context.params;
  const routeId = rawRouteId as RouteId;

  const policy = await getEffectiveRoutePolicy(routeId);
  if (!policy) {
    return NextResponse.json({ ok: false, error: "unknown_route" }, { status: 404 });
  }
  if (policy.locked) {
    return NextResponse.json({ ok: false, error: "locked_route" }, { status: 400 });
  }

  const custom = await getCustomRoutePolicy(routeId);
  if (custom) {
    await deleteCustomRoutePolicy(routeId);
  }
  await deleteRoutePolicyOverride(routeId);

  return NextResponse.json({ ok: true });
}
