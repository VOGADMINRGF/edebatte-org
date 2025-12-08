"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useCurrentUser } from "@/hooks/auth";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/mitglied-werden",
    label: "Swipes",
    description:
      "Themen & Positionen bewerten – Schnell-Abstimmungen zu laufenden eDebatte-Themen (Vorverkauf unter „Mitmachen“).",
  },
  {
    href: "/mitglied-werden",
    label: "Statements",
    description:
      "Eigene Positionen einbringen – deine Argumente & Vorschläge zu aktuellen eDebatte-Themen.",
  },
  {
    href: "/mitglied-werden",
    label: "Streams",
    description:
      "Themen live diskutieren – Themen als Stream vorstellen und gemeinsam vertiefen.",
  },
  {
    href: "/mitglied-werden",
    label: "Reports",
    description:
      "Übersichten & Ergebnisse – Reports zu Themen, Abstimmungen und Beteiligung in deiner Region.",
  },
];

export function SiteHeader() {
  const { locale } = useLocale();
  const { user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const localeLabel = useMemo(
    () => (locale || "de").toUpperCase(),
    [locale],
  );

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

        {/* Rechts: nur Hamburger, Locale-Badge erst im Drawer */}
        <div className="flex items-center gap-2">
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
        <div className="border-t border-slate-100/80 bg-white/95">
          <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-500">
                Navigations
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
                  key={item.label}
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
                Mitmachen
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
