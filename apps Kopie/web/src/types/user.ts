export type UserRole =
  | "guest"
  | "user"
  | "verified"
  | "moderator"
  | "admin"
  | "ngo"
  | "politics"
  | "legitimized"
  | "premium"
  | "superadmin";

// Dashboard-Gates
export const ADMIN_DASHBOARD_ROLES: UserRole[] = ["admin", "superadmin"];
export const SUPERADMIN_ONLY_ROLES: UserRole[] = ["superadmin"];
