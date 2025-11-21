import type { AccessGroup, AccessUser, RouteId } from "./types";
import { DEFAULT_ROUTE_POLICIES } from "./types";

type EdgeDecision = {
  allowed: boolean;
  requireLogin: boolean;
};

const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const STAFF_ROLES = new Set(["staff", "moderator", "editor", "redaktion", "kurator"]);

export function canViewRouteEdge(routeId: RouteId, user: AccessUser | null): EdgeDecision {
  const policy = DEFAULT_ROUTE_POLICIES.find((candidate) => candidate.routeId === routeId);
  if (!policy) return { allowed: true, requireLogin: false };

  if (policy.allowAnonymous) return { allowed: true, requireLogin: false };

  if (!user?.id) return { allowed: false, requireLogin: true };

  const groups = deriveGroups(user);
  if (policy.defaultGroups.some((group) => groups.has(group))) {
    return { allowed: true, requireLogin: false };
  }
  return { allowed: false, requireLogin: false };
}

function deriveGroups(user: AccessUser): Set<AccessGroup> {
  const groups = new Set<AccessGroup>();
  if (user.groups) {
    user.groups.filter(Boolean).forEach((group) => groups.add(group));
  }
  if (user.accessTier) groups.add(user.accessTier);

  (user.roles ?? []).forEach((raw) => {
    const role = raw?.toLowerCase();
    if (!role) return;
    if (ADMIN_ROLES.has(role)) {
      groups.add("admin");
      groups.add("staff");
      return;
    }
    if (role === "creator") groups.add("creator");
    if (STAFF_ROLES.has(role)) groups.add("staff");
  });

  return groups;
}
