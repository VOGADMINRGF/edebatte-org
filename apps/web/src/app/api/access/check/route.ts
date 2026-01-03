export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEffectiveRoutePolicies, getUserOverrides } from "@core/access/db";
import type { AccessGroup, RoutePolicy, AccessUser } from "@features/access/types";

type AccessDecision = "allowed" | "login_required" | "forbidden";

export async function GET(req: NextRequest) {
  const pathParam = req.nextUrl.searchParams.get("path");
  const pathname = pathParam ? normalizePath(pathParam) : req.nextUrl.pathname;

  const policies = await getEffectiveRoutePolicies();
  const policy = findPolicy(policies, pathname);
  if (!policy) {
    return NextResponse.json({ ok: true, decision: "allowed", routeId: null });
  }

  const user = extractUser(req);
  const decision = await evaluatePolicy(policy, user);

  return NextResponse.json({
    ok: true,
    decision,
    routeId: policy.routeId,
    pathPattern: policy.pathPattern,
  });
}

async function evaluatePolicy(policy: RoutePolicy, user: AccessUser | null): Promise<AccessDecision> {
  if (policy.allowAnonymous) return "allowed";

  if (!user?.id) return "login_required";

  if (policy.loginOnly) return "allowed";

  const overrides = await getUserOverrides(user.id);
  const activeOverride = overrides.find((override) => override.routeId === policy.routeId);
  if (activeOverride?.mode === "deny") return "forbidden";
  if (activeOverride?.mode === "allow") return "allowed";

  const groups = deriveGroups(user);
  if (policy.defaultGroups.some((group) => groups.has(group))) return "allowed";

  return "forbidden";
}

function findPolicy(policies: RoutePolicy[], pathname: string): RoutePolicy | null {
  const sorted = [...policies].sort((a, b) => {
    const modeA = a.matchMode === "exact" ? 1 : 0;
    const modeB = b.matchMode === "exact" ? 1 : 0;
    if (modeA !== modeB) return modeB - modeA;
    return b.pathPattern.length - a.pathPattern.length;
  });

  for (const policy of sorted) {
    if (matchesPolicy(policy, pathname)) return policy;
  }
  return null;
}

function matchesPolicy(policy: RoutePolicy, pathname: string): boolean {
  const regex = new RegExp(pathPatternToRegex(policy.pathPattern, policy.matchMode));
  return regex.test(pathname);
}

function pathPatternToRegex(pattern: string, mode: RoutePolicy["matchMode"] = "prefix"): string {
  let safePattern = pattern;
  if (!safePattern.startsWith("/")) {
    safePattern = `/${safePattern}`;
  }
  const segments = safePattern.split("/").filter((seg, index) => !(index === 0 && seg.length === 0));
  const regexParts = segments.map((segment) => {
    if (!segment) return "";
    if (segment.startsWith(":")) {
      return "[^/]+";
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  const pathBody = regexParts.filter(Boolean).join("/");
  const base = pathBody.length ? `/${pathBody}` : "/";
  const suffix =
    mode === "exact"
      ? base === "/"
        ? ""
        : "/?"
      : "(?:/.*)?";
  return `^${base}${suffix}$`;
}

function extractUser(req: NextRequest): AccessUser | null {
  const userId = req.cookies.get("u_id")?.value;
  if (!userId) return null;
  const tier = req.cookies.get("u_tier")?.value || null;
  const primaryRole = req.cookies.get("u_role")?.value;
  const groupsCookie = req.cookies.get("u_groups")?.value;
  const groups = groupsCookie
    ? (groupsCookie.split(",").map((s) => s.trim()).filter(Boolean) as AccessUser["groups"])
    : [];
  const roles = primaryRole ? [primaryRole] : undefined;

  return {
    id: userId,
    accessTier: tier,
    roles,
    groups: groups ?? [],
  };
}

function deriveGroups(user: AccessUser): Set<AccessGroup> {
  const groups = new Set<AccessGroup>();
  if (user.groups) {
    user.groups.filter(Boolean).forEach((group) => groups.add(group));
  }
  if (user.accessTier) groups.add(user.accessTier);

  const adminRoles = new Set(["admin", "superadmin"]);
  const staffRoles = new Set(["staff", "moderator", "editor", "redaktion", "kurator"]);

  (user.roles ?? []).forEach((raw) => {
    const role = raw?.toLowerCase();
    if (!role) return;
    if (adminRoles.has(role)) {
      groups.add("admin");
      groups.add("staff");
      return;
    }
    if (role === "creator") groups.add("creator");
    if (staffRoles.has(role)) groups.add("staff");
  });

  return groups;
}

function normalizePath(raw: string) {
  if (!raw) return "/";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      return url.pathname;
    } catch {
      return "/";
    }
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}
