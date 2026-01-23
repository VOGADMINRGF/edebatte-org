"use client";
import Link from "next/link";
import clsx from "clsx";
export default function SidebarNavClient({ items, role }:{
  items: { href: string; label: string; roles?: string[] }[]; role: string;
}) {
  const visible = items.filter(it => !it.roles || it.roles.includes(role));
  return (
    <nav className="flex flex-col gap-1">
      {visible.map(it => (
        <Link key={it.href} href={it.href}
          className={clsx("rounded-md px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800")}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
