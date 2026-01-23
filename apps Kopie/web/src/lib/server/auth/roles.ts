import type { UserRole } from "@/types/user";

export const ADMIN_DASHBOARD_ROLES: UserRole[] = ["admin", "superadmin"];

export function userIsAdminDashboard(user: { roles?: UserRole[] | null } | null): boolean {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.some((role) => ADMIN_DASHBOARD_ROLES.includes(role));
}

export function userIsSuperadmin(user: { roles?: UserRole[] | null } | null): boolean {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.includes("superadmin");
}
