export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { isStaffRequest } from "../../../../../feeds/utils";
import { upsertUserOverride, deleteUserOverride } from "@core/access/db";
import type { RouteId, UserRouteOverrideMode } from "@features/access/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string; routeId: RouteId } },
) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as {
    mode?: UserRouteOverrideMode;
    reason?: string;
    expiresAt?: string | null;
  } | null;
  if (!body?.mode) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  await upsertUserOverride({
    userId: params.userId,
    routeId: params.routeId,
    mode: body.mode,
    reason: body.reason,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string; routeId: RouteId } },
) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  await deleteUserOverride(params.userId, params.routeId);
  return NextResponse.json({ ok: true });
}
