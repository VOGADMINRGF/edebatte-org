// apps/web/src/app/admin/config/adminConfig.ts
export type AdminModule = {
  href: string;
  label: string;
  roles: string[]; // z.B. ['admin', 'owner']
};

export const ADMIN_ALLOWED_ROLES = ["admin", "owner", "superadmin"] as const;

export const ADMIN_MODULES: AdminModule[] = [
  {
    href: "/admin",
    label: "Dashboard",
    roles: ["admin", "owner", "superadmin"],
  },
  {
    href: "/admin/users",
    label: "Benutzer",
    roles: ["admin", "owner", "superadmin"],
  },
  {
    href: "/admin/system",
    label: "Systemstatus",
    roles: ["admin", "owner", "superadmin"],
  },
  // weitere Module hier ergänzen …
];
