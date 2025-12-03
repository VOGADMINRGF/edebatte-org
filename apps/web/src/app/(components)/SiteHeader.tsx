"use client";

import { useState } from "react";
import Link from "next/link";
import { HeaderLoginInline } from "@/components/auth/HeaderLoginInline";
import { useLocale } from "@/context/LocaleContext";
import { useCurrentUser } from "@/hooks/auth";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/swipe",
    label: "Swipe",
    description: "Beiträge abstimmen",
  },
  {
    href: "/statements",
    label: "Statements",
    description: "Beiträge verfassen",
  },
  {
    href: "/streams",
    label: "Streams",
    description: "Themen vortragen & anschauen",
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Aktuelles aus der Region",
  },
];

export function SiteHeader() {
  const { locale } = useLocale();
  const { user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const localeLabel = (locale || "de").toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-lg font-extrabold leading-tight tracking-tight"
            style={{
              backgroundImage:
                "linear-gradient(120deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            VoiceOpenGov
          </span>
        </Link>

        {/* Desktop-Navigation */}
        <nav
          className="hidden items-center gap-4 text-sm font-semibold text-slate-700 lg:flex"
          aria-label="Hauptnavigation"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={`${item.label} – ${item.description}`}
              aria-label={`${item.label} – ${item.description}`}
              className="rounded-full px-3 py-1.5 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}

          {/* Mitglied werden (Desktop) */}
          <Link
            href="/mitglied-werden"
            className="rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-1.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.35)] hover:brightness-105"
          >
            Mitglied werden
          </Link>

          {/* Login / Konto */}
          {user ? (
            <Link
              href="/account"
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-600"
            >
              Konto
            </Link>
          ) : (
            <HeaderLoginInline />
          )}
        </nav>

        {/* Rechts: Locale-Badge + Hamburger (Mobile/Tablet) */}
        <div className="flex items-center gap-2 lg:hidden">
          <span
            aria-label={`Sprache: ${localeLabel}`}
            className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
          >
            {localeLabel}
          </span>
          <button
            type="button"
            aria-label="Navigation öffnen"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-full border border-slate-300/80 bg-white/90 p-2 text-slate-700 shadow-sm"
          >
            <span className="sr-only">Menü</span>
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M4 7h16M4 12h16M4 17h10"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile-Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-100/80 bg-white/95 lg:hidden">
          <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Navigation
              </span>
              <span
                aria-label={`Sprache: ${localeLabel}`}
                className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {localeLabel}
              </span>
            </div>

            <nav
              aria-label="Mobile Navigation"
              className="flex flex-col gap-2 text-sm font-semibold text-slate-800"
            >
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left hover:border-sky-300 hover:bg-sky-50"
                >
                  <span className="block text-sm font-semibold">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-slate-600">
                    {item.description}
                  </span>
                </Link>
              ))}

              <Link
                href="/mitglied-werden"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-[0_10px_25px_rgba(56,189,248,0.4)]"
              >
                Mitglied werden
              </Link>

              {user ? (
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-600"
                >
                  Konto
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-600"
                >
                  Login
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
