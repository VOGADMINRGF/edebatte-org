import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <nav
        aria-label="Review-Bereiche"
        className="flex flex-wrap gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-sm"
      >
        <Link
          href="/admin/review"
          className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-sky-400"
        >
          Review Queue
        </Link>
        <Link
          href="/admin/review/voxy-studio"
          className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-sky-400"
        >
          Voxy Video Studio
        </Link>
        <Link
          href="/admin/review/voxy-visual-qa"
          className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-sky-400"
        >
          Voxy 200-% QA
        </Link>
      </nav>
      {children}
    </div>
  );
}
