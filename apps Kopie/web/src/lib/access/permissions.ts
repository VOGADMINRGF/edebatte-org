// apps/web/src/lib/access/permissions.ts
export type GlobalRole =
  | "guest"
  | "user"
  | "verified"
  | "moderator"
  | "admin"
  | "superadmin";

export type OrgRole = "member" | "moderator" | "manager" | "owner";

export type Permission =
  | "statement:create"
  | "statement:edit"
  | "statement:delete"
  | "statement:moderate"
  | "vote:cast"
  | "vote:retract"
  | "report:create"
  | "admin:access"
  | "org:manage"
  | "org:invite";

export interface RpUser {
  id: string;
  roles: GlobalRole[]; // z. B. ["user","verified"]
  verified?: boolean;
  orgRoles?: Record<string, OrgRole[]>; // orgId -> ["member","manager"]
  flags?: Record<string, boolean>;
}

export interface PermissionContext {
  resourceOwnerId?: string;
  orgId?: string;
}

export const DEFAULT_POLICY: Record<Permission, GlobalRole[]> = {
  "statement:create": ["user", "verified", "moderator", "admin", "superadmin"],
  "statement:edit": ["verified", "moderator", "admin", "superadmin"],
  "statement:delete": ["moderator", "admin", "superadmin"],
  "statement:moderate": ["moderator", "admin", "superadmin"],
  "vote:cast": ["user", "verified", "moderator", "admin", "superadmin"],
  "vote:retract": ["user", "verified", "moderator", "admin", "superadmin"],
  "report:create": ["user", "verified", "moderator", "admin", "superadmin"],
  "admin:access": ["admin", "superadmin"],
  "org:manage": ["admin", "superadmin"],
  "org:invite": ["admin", "superadmin"],
};

const ORG_ORDER: OrgRole[] = ["member", "moderator", "manager", "owner"];
function hasOrgPower(
  user: RpUser | null | undefined,
  orgId?: string,
  min: OrgRole = "manager",
) {
  if (!user || !orgId) return false;
  const roles = user.orgRoles?.[orgId] ?? [];
  const needIdx = ORG_ORDER.indexOf(min);
  const best = roles.reduce(
    (max, r) => Math.max(max, ORG_ORDER.indexOf(r)),
    -1,
  );
  return best >= needIdx;
}

/** Alias-Helper: behandle "legitimized" als "verified" (falls aus alter Welt) */
export function normalizeRoles(
  roles: readonly string[] | undefined,
): GlobalRole[] {
  const out: GlobalRole[] = [];
  for (const r of roles ?? []) {
    if (r === "legitimized") out.push("verified");
    else if (
      [
        "guest",
        "user",
        "verified",
        "moderator",
        "admin",
        "superadmin",
      ].includes(r)
    )
      out.push(r as GlobalRole);
  }
  return out.length ? out : (["guest"] as GlobalRole[]);
}

/** Basischer Checker (server-geeignet) */
export function checkPermission(
  user: RpUser | null | undefined,
  permission: Permission,
  ctx?: PermissionContext,
  policy: Record<Permission, GlobalRole[]> = DEFAULT_POLICY,
): boolean {
  if (!user) return false;

  // globale Rollen (mit Alias-Normalisierung)
  const roles = normalizeRoles(user.roles);
  const allowed = new Set(policy[permission] ?? []);
  const hasGlobal = roles.some((r) => allowed.has(r));
  let ok = hasGlobal;

  // Bonus-Regel: verifizierte Nutzer dürfen eigene Statements editieren
  if (!ok && permission === "statement:edit" && user.verified) ok = true;

  // Owner-Edit, aber kein Owner-Delete
  if (
    !ok &&
    (permission === "statement:edit" || permission === "statement:delete")
  ) {
    if (ctx?.resourceOwnerId && ctx.resourceOwnerId === user.id) {
      ok = permission === "statement:edit";
    }
  }

  // Org-Scopes
  if (!ok && (permission === "org:manage" || permission === "org:invite")) {
    if (
      hasOrgPower(
        user,
        ctx?.orgId,
        permission === "org:manage" ? "manager" : "moderator",
      )
    ) {
      ok = true;
    }
  }

  return ok;
}
