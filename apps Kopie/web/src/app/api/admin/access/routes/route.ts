export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEffectiveRoutePolicies, countRouteOverrides } from "@core/access/db";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const [policies, counts] = await Promise.all([getEffectiveRoutePolicies(), countRouteOverrides()]);
  return NextResponse.json({
    ok: true,
    routes: policies.map((policy) => ({
      ...policy,
      overrides: counts[policy.routeId] ?? 0,
    })),
  });
}
