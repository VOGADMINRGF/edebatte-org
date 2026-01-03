export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { AccessGroup, RouteId, RouteMatchMode, RoutePolicy } from "@features/access/types";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  upsertCustomRoutePolicy,
  getEffectiveRoutePolicy,
  getEffectiveRoutePolicies,
} from "@core/access/db";

type CreateBody = {
  pathPattern?: string;
  label?: string;
  defaultGroups?: AccessGroup[];
  allowAnonymous?: boolean;
  matchMode?: RouteMatchMode;
  routeId?: string;
};

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body?.pathPattern) {
    return NextResponse.json({ ok: false, error: "missing_path" }, { status: 400 });
  }

  const pathPattern = normalizePath(body.pathPattern);
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : pathPattern;
  const allowAnonymous =
    typeof body.allowAnonymous === "boolean"
      ? body.allowAnonymous
      : !pathPattern.startsWith("/admin");

  const defaultGroups =
    Array.isArray(body.defaultGroups) && body.defaultGroups.length > 0
      ? body.defaultGroups
      : allowAnonymous
      ? (["public"] as AccessGroup[])
      : (["staff", "admin"] as AccessGroup[]);

  const routeId = normalizeRouteId(body.routeId, pathPattern);
  const matchMode = body.matchMode ?? "prefix";

  const exists = await getEffectiveRoutePolicy(routeId as RouteId);
  if (exists) {
    return NextResponse.json({ ok: false, error: "route_exists" }, { status: 409 });
  }

  const policyList = await getEffectiveRoutePolicies();
  if (policyList.some((policy) => policy.pathPattern === pathPattern)) {
    return NextResponse.json({ ok: false, error: "path_exists" }, { status: 409 });
  }

  const policy: RoutePolicy = {
    routeId: routeId as RouteId,
    pathPattern,
    label,
    defaultGroups,
    allowAnonymous,
    locked: false,
    matchMode,
  };

  await upsertCustomRoutePolicy(policy);

  return NextResponse.json({ ok: true, policy });
}

function normalizePath(input: string) {
  const raw = input.trim();
  if (!raw.startsWith("/")) return `/${raw}`;
  return raw;
}

function normalizeRouteId(candidate: string | undefined, pathPattern: string) {
  if (candidate && candidate.trim()) {
    return candidate.trim().startsWith("custom:")
      ? candidate.trim()
      : `custom:${candidate.trim()}`;
  }
  const slug = pathPattern
    .replace(/^\//, "")
    .replace(/\//g, "_")
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .toLowerCase();
  return `custom:${slug || "route"}`;
}
