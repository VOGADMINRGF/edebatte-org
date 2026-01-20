"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/context/LocaleContext";
import { useContentLang } from "@/lib/i18n/contentLanguage";
import { UI_LANGS, type LanguageCode } from "@features/i18n/languages";
import { getLocaleConfig, type SupportedLocale } from "@/config/locales";
import { useCurrentUser, clearCachedUser, primeCachedUser } from "@/hooks/auth";
import type { AuthUser } from "@/hooks/auth";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/howtoworks/edebatte/dossier",
    label: "Dossier & Faktencheck",
    description: "Quellen, Claims und offene Fragen nachvollziehen.",
  },
  {
    href: "/swipes",
    label: "Abstimmen",
    description: "Positionen bewerten und Mehrheiten sichtbar machen.",
  },
  {
    href: "/mitglied-werden",
    label: "Mitmachen",
    description: "Mitgliedschaft und Beteiligung bei eDebatte starten.",
  },
  {
    href: "/nutzungsmodell",
    label: "Preise",
    description: "Nutzungsmodell und Pakete für Partner:innen.",
  },
  {
    href: "/faq",
    label: "FAQ",
    description: "Antworten zur Plattform und Methodik.",
  },
  {
    href: "/kontakt",
    label: "Kontakt",
    description: "Support, Presse und Anfragen.",
  },
];

function deriveInitials(value: string) {
  const parts = value.trim().split(" ").filter(Boolean);
  if (!parts.length) return "DU";
  const first = parts[0]?.[0]?.toUpperCase() ?? "";
  const second = parts[1]?.[0]?.toUpperCase() ?? "";
  return `${first}${second}` || first || "DU";
}

export function SiteHeader({ initialUser }: { initialUser?: AuthUser | null }) {
  const { locale, setLocale } = useLocale();
  const { lang: contentLang, setLang: setContentLang } = useContentLang();
  const { user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const avatarLabel = deriveInitials(user?.name || user?.email || "Du");
  const avatarUrl = user?.avatarUrl ?? null;

  const activeLang = contentLang || locale || "de";
  const activeLocaleConfig = useMemo(
    () => getLocaleConfig(activeLang as SupportedLocale),
    [activeLang],
  );
  const localeLabel = useMemo(
    () => activeLang.toUpperCase(),
    [activeLang],
  );
  const localeOptions = UI_LANGS.map((lang) => {
    const cfg = getLocaleConfig(lang.code as SupportedLocale);
    return {
      code: lang.code,
      label: cfg.label || lang.label,
      flag: cfg.flagEmoji || "🏳️",
    };
  });

  useEffect(() => {
    if (initialUser !== undefined) {
      primeCachedUser(initialUser ?? null);
    }
  }, [initialUser]);

  useEffect(() => {
    if (!mobileOpen) setLocaleOpen(false);
  }, [mobileOpen]);

  const handleLocaleSelect = (next: LanguageCode) => {
    setContentLang(next);
    setLocale(next as SupportedLocale);
    setLocaleOpen(false);
    router.refresh();
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("logout failed", err);
    } finally {
      clearCachedUser();
      setLoggingOut(false);
      setMobileOpen(false);
      router.refresh();
    }
  };

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
            eDebatte
          </span>
        </Link>

        {/* Rechts: Avatar/Account + Hamburger */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <button
              type="button"
              aria-label={`Sprache waehlen (aktuell ${activeLocaleConfig.label})`}
              aria-expanded={localeOpen}
              onClick={() => setLocaleOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-sky-300 hover:text-sky-600"
            >
              <span aria-hidden="true" className="text-base">
                {activeLocaleConfig.flagEmoji || "🏳️"}
              </span>
              <span>{localeLabel}</span>
            </button>
            {localeOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                {localeOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLocaleSelect(lang.code)}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true">{lang.flag}</span>
                      <span className="uppercase">{lang.code}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {!user && (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-600"
            >
              Login
            </Link>
          )}
          <button
            type="button"
            aria-label={user ? "Account-Menü öffnen" : "Navigation öffnen"}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/90 text-sm font-semibold text-slate-700 shadow-sm hover:border-sky-300"
          >
            {user ? (
              avatarUrl ? (
                <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
                  <span
                    aria-hidden="true"
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${avatarUrl})` }}
                  />
                </span>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 shadow-sm">
                  {avatarLabel}
                </span>
              )
            ) : (
              <>
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
              </>
            )}
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
              <button
                type="button"
                aria-label={`Sprache waehlen (aktuell ${activeLocaleConfig.label})`}
                aria-expanded={localeOpen}
                onClick={() => setLocaleOpen((v) => !v)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:border-sky-300 hover:text-sky-600"
              >
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true">{activeLocaleConfig.flagEmoji || "🏳️"}</span>
                  <span>{localeLabel}</span>
                </span>
              </button>
            </div>
            {localeOpen && (
              <div className="grid grid-cols-2 gap-2">
                {localeOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLocaleSelect(lang.code)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-600"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden="true">{lang.flag}</span>
                      <span className="uppercase">{lang.code}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}

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
                <div className="flex flex-col gap-2">
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-600"
                  >
                    Mein Konto
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-600 disabled:opacity-60"
                  >
                    {loggingOut ? "Abmelden …" : "Abmelden"}
                  </button>
                </div>
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
