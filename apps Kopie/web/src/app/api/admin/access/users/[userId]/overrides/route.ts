export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  getUserOverridesWithMeta,
  upsertUserOverride,
} from "@core/access/db";
import type { RouteId, UserRouteOverrideMode } from "@features/access/types";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const { userId } = await context.params;
  const rows = await getUserOverridesWithMeta(userId);
  return NextResponse.json({
    ok: true,
    overrides: rows.map((row) => ({
      routeId: row.routeId,
      mode: row.mode,
      reason: row.reason ?? null,
      expiresAt: row.expiresAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const { userId } = await context.params;

  const body = (await req.json().catch(() => null)) as {
    routeId?: RouteId;
    mode?: UserRouteOverrideMode;
    reason?: string;
    expiresAt?: string | null;
  } | null;
  if (!body?.routeId || !body.mode) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  await upsertUserOverride({
    userId,
    routeId: body.routeId,
    mode: body.mode,
    reason: body.reason,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
  });

  return NextResponse.json({ ok: true });
}
