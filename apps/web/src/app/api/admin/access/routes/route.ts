export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEffectiveRoutePolicies, countRouteOverrides } from "@core/access/db";
import { isStaffRequest } from "@/app/api/admin/feeds/utils";

export async function GET(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const [policies, counts] = await Promise.all([getEffectiveRoutePolicies(), countRouteOverrides()]);
  return NextResponse.json({
    ok: true,
    routes: policies.map((policy) => ({
      ...policy,
      overrides: counts[policy.routeId] ?? 0,
    })),
  });
}
