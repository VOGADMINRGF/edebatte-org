// apps/web/src/config/accessControl.ts

export type Role =
  | "guest"
  | "user"
  | "legitimized"
  | "admin"
  | "superadmin"
  | "moderator"
  | "ngo"
  | "politics";

export interface AccessRule {
  path: string;
  allowedRoles: Role[];
}

export interface AccessControlConfig {
  rules: AccessRule[];
  defaultRole?: Role;
}

export const accessControl: AccessControlConfig = {
  rules: [
    { path: "/admin", allowedRoles: ["admin", "superadmin", "moderator"] },
    {
      path: "/account",
      allowedRoles: [
        "user",
        "legitimized",
        "admin",
        "moderator",
        "ngo",
        "politics",
      ],
    },
    { path: "/ngo", allowedRoles: ["ngo", "admin", "moderator"] },
    { path: "/politics", allowedRoles: ["politics", "admin", "moderator"] },
  ],
  defaultRole: "guest",
};
