// packages/core/auth/rbac.ts
export type Role = "guest" | "user" | "verified" | "editor" | "admin" | "owner";

export const ROLE_RANK: Record<Role, number> = {
  guest: 0, user: 1, verified: 2, editor: 3, admin: 4, owner: 5,
};

export const PERMISSIONS = {
  EDITOR_ITEM_PUBLISH:   "editor:item:publish",
  EDITOR_ITEM_REORDER:   "editor:item:reorder",
  EDITOR_ITEM_WRITE:     "editor:item:write",
  FEEDS_DRAFT_VIEW:      "feeds:drafts:view",
  FEEDS_DRAFT_PUBLISH:   "feeds:drafts:publish",
  VIEW_REPORTS_VERIFIED: "reports:view:verified-only",
  FACTCHECK_ENQUEUE:     "factcheck:enqueue",
  FACTCHECK_STATUS:      "factcheck:status",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// kurze Aliase, damit ROLE_PERMS robust bleibt
const P = PERMISSIONS;

const baseVerified: Permission[] = [P.VIEW_REPORTS_VERIFIED];
const baseEditor:   Permission[] = [
  ...baseVerified,
  P.EDITOR_ITEM_WRITE,
  P.EDITOR_ITEM_PUBLISH,
  P.EDITOR_ITEM_REORDER,
  P.FEEDS_DRAFT_VIEW,
  P.FEEDS_DRAFT_PUBLISH,
  P.FACTCHECK_ENQUEUE,
  P.FACTCHECK_STATUS,
];

const ROLE_PERMS: Record<Role, Permission[]> = {
  guest:    [],
  user:     [],
  verified: [...baseVerified],
  editor:   [...baseEditor],
  admin:    [...baseEditor],
  owner:    [...baseEditor],
};

export function hasRole(userRole: Role, minRole: Role) {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole];
}

export function hasPermission(userRole: Role, perm: Permission) {
  return ROLE_PERMS[userRole]?.includes(perm) ?? false;
}
