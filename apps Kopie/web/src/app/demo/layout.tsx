import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { isDemoUser } from "@/lib/demo/demoAccess";

type Props = {
  children: ReactNode;
};

const DEMO_NAV = [
  { href: "/demo", label: "Studio" },
  { href: "/demo/dossier", label: "Dossier" },
  { href: "/demo/votes", label: "Votes" },
  { href: "/demo/mandat", label: "Mandat" },
  { href: "/demo/factcheck", label: "Factcheck" },
];

export default async function DemoLayout({ children }: Props) {
  const user = await getSessionUser();
  if (!isDemoUser(user)) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Demo
            </span>
            <span className="text-xs text-slate-500">nur Demo-Daten - Screenshot Studio</span>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            {DEMO_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:border-slate-300 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
