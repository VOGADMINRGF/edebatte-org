// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { canViewRouteEdge } from "@features/access/checkRouteAccessEdge";
import { matchRoute } from "@features/access/routeMatchers";
import type { AccessUser } from "@features/access/types";
import type { AccessTier } from "@features/pricing/types";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const routeId = matchRoute(pathname);
  if (!routeId) {
    return NextResponse.next();
  }

  const user = extractUser(req);
  const decision = canViewRouteEdge(routeId, user);

  if (decision.allowed) {
    return NextResponse.next();
  }

  if (decision.requireLogin) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return new NextResponse("Forbidden", { status: 403 });
}

function extractUser(req: NextRequest): AccessUser | null {
  const userId = req.cookies.get("u_id")?.value;
  if (!userId) return null;
  const tier = req.cookies.get("u_tier")?.value as AccessTier | undefined;
  const primaryRole = req.cookies.get("u_role")?.value;
  const groupsCookie = req.cookies.get("u_groups")?.value;
  const groups = groupsCookie ? (groupsCookie.split(",").map((s) => s.trim()).filter(Boolean) as AccessUser["groups"]) : [];
  const roles = primaryRole ? [primaryRole] : undefined;

  return {
    id: userId,
    accessTier: tier ?? null,
    roles,
    groups: groups ?? [],
  };
}

// Nur echte Seiten, keine statics
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
