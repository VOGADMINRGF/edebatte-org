export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { upsertUserOverride, deleteUserOverride } from "@core/access/db";
import type { RouteId, UserRouteOverrideMode } from "@features/access/types";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ userId: string; routeId: RouteId }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const { userId, routeId } = await context.params;
  const body = (await req.json().catch(() => null)) as {
    mode?: UserRouteOverrideMode;
    reason?: string;
    expiresAt?: string | null;
  } | null;
  if (!body?.mode) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  await upsertUserOverride({
    userId,
    routeId,
    mode: body.mode,
    reason: body.reason,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ userId: string; routeId: RouteId }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const { userId, routeId } = await context.params;
  await deleteUserOverride(userId, routeId);
  return NextResponse.json({ ok: true });
}
