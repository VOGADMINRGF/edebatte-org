import type { AccessUser, RouteId, AccessGroup } from "./types";
import { getEffectiveRoutePolicy, getUserOverrides } from "@core/access/db";

export type RouteAccessDecision = "allowed" | "login_required" | "forbidden";

const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const STAFF_ROLES = new Set(["staff", "moderator", "editor", "redaktion", "kurator"]);

export async function canViewRoute({
  routeId,
  user,
}: {
  routeId: RouteId;
  user: AccessUser | null;
}): Promise<RouteAccessDecision> {
  const policy = await getEffectiveRoutePolicy(routeId);
  if (!policy) return "allowed";

  if (policy.allowAnonymous) return "allowed";

  if (!user?.id) return "login_required";

  const overrides = await getUserOverrides(user.id);
  const activeOverride = overrides.find((override) => override.routeId === routeId);
  if (activeOverride) {
    if (activeOverride.mode === "deny") return "forbidden";
    if (activeOverride.mode === "allow") return "allowed";
  }

  const groups = deriveGroups(user);
  if (policy.defaultGroups.some((group) => groups.has(group))) return "allowed";

  return "forbidden";
}

function deriveGroups(user: AccessUser): Set<AccessGroup> {
  const groups = new Set<AccessGroup>();
  if (user.groups) {
    user.groups.filter(Boolean).forEach((group) => groups.add(group));
  }
  if (user.accessTier) groups.add(user.accessTier);

  (user.roles ?? []).forEach((roleRaw) => {
    const role = roleRaw?.toLowerCase();
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
