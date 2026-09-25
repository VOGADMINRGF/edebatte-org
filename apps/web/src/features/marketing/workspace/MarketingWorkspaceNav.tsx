"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  reviewCount: number;
};

type UiLocale = "de" | "en";

const COPY = {
  de: {
    label: "Marketing-Arbeitsbereich",
    cockpit: "Cockpit",
    brands: "Marken",
    campaigns: "Kampagnen",
    review: "Inhalte & Freigaben",
    insights: "Ergebnisse",
    sources: "Quellen & Themen",
  },
  en: {
    label: "Marketing workspace",
    cockpit: "Cockpit",
    brands: "Brands",
    campaigns: "Campaigns",
    review: "Content & approvals",
    insights: "Results",
    sources: "Sources & topics",
  },
} as const;

export function MarketingWorkspaceNav({ reviewCount }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const locale: UiLocale = params.get("lang") === "en" ? "en" : "de";
  const copy = COPY[locale];
  const lang = `lang=${locale}`;

  const items = [
    { href: `/admin/marketing?${lang}`, label: copy.cockpit, active: pathname === "/admin/marketing" },
    { href: `/admin/marketing/brands?${lang}`, label: copy.brands, active: pathname === "/admin/marketing/brands" },
    { href: `/admin/marketing?${lang}#campaigns`, label: copy.campaigns, active: false },
    { href: `/admin/marketing/review?${lang}`, label: copy.review, active: pathname === "/admin/marketing/review", count: reviewCount },
    { href: `/admin/marketing/insights?${lang}`, label: copy.insights, active: pathname === "/admin/marketing/insights" },
    { href: `/admin/marketing/sources?${lang}`, label: copy.sources, active: pathname === "/admin/marketing/sources" },
  ];

  return (
    <nav
      aria-label={copy.label}
      className="sticky top-0 z-20 -mx-2 mb-6 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg))]/95 px-2 py-3 backdrop-blur"
      data-testid="marketing-workspace-navigation"
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-current={item.active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              item.active
                ? "border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-400/10 dark:text-sky-100"
                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:border-sky-300"
            }`}
          >
            {item.label}
            {typeof item.count === "number" ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-sky-700 px-1.5 py-0.5 text-xs text-white">
                {item.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
