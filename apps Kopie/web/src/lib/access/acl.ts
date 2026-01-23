export type Role = "guest" | "user" | "org" | "redaktion" | "admin" | "superadmin";

export type NavItem = {
  label: string;
  href: string;
  roles?: Role[]; // optional: nur sichtbar für diese Rollen
};

// akzeptiert entweder kompletten User oder nur die Rolle – passt zu deinem Aufruf
export function filterNav(userOrRole: { role?: Role } | Role): NavItem[] {
  const role: Role =
    (typeof userOrRole === "string" ? userOrRole : userOrRole.role) ?? "guest";

  const items: NavItem[] = [
    { label: "Home", href: "/" },
    {
      label: "Dashboard",
      href: "/dashboard",
      roles: ["user", "org", "redaktion", "admin"],
    },
    { label: "Admin", href: "/admin", roles: ["admin", "superadmin"] },
  ];

  return items.filter((it) => !it.roles || it.roles.includes(role));
}
