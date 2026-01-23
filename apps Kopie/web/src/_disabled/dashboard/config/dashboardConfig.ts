// src/app/dashboard/config/dashboardConfig.ts
export const DASHBOARD_MODULES = [
  {
    label: "Übersicht",
    href: "/dashboard",
    roles: ["admin", "redaktion", "org", "user"],
  },
  { label: "System-Health", href: "/dashboard/health", roles: ["admin"] },
  {
    label: "Nutzung/Kosten",
    href: "/dashboard/usage",
    roles: ["admin", "org"],
  },
  {
    label: "Fehlerprotokoll",
    href: "/dashboard/errors",
    roles: ["admin", "redaktion"],
  },
  { label: "Organisationen", href: "/dashboard/orgs", roles: ["admin", "org"] },
  { label: "Redaktion", href: "/dashboard/redaktion", roles: ["redaktion"] },
  {
    label: "Mein Bereich",
    href: "/dashboard/user",
    roles: ["admin", "org", "user", "redaktion"],
  },
];
