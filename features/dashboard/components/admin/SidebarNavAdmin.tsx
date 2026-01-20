// features/dashboard/components/admin/SidebarNavAdmin.tsx
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/admin/overview", label: "Übersicht" },
  { href: "/admin/users", label: "Nutzer" },
  { href: "/admin/content", label: "Inhalte" },
  { href: "/admin/settings", label: "Einstellungen" },
];

export default function SidebarNavAdmin() {
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  return (
    <aside className="w-56 bg-white shadow flex flex-col gap-1 p-4 dark:bg-neutral-900">
      <div className="mb-4 font-bold text-xl">Admin</div>
      {NAV.map((nav) => {
        const active = pathname?.startsWith(nav.href);
        return (
          <a
            key={nav.href}
            href={nav.href}
            className={clsx(
              "block px-3 py-2 rounded text-gray-800 dark:text-neutral-100 hover:bg-violet-100 dark:hover:bg-neutral-800",
              active && "font-semibold underline"
            )}
          >
            {nav.label}
          </a>
        );
      })}
    </aside>
  );
}
