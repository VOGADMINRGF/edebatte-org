"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguagePreferences } from "@/context/LocaleContext";
import {
  AUTO_TRANSLATE_LOCALES,
  isPublicPathname,
  mapTranslatableStrings,
  useAutoTranslateText,
} from "@/lib/i18n/autoTranslate";
import { UI_LANGS, type LanguageCode } from "@features/i18n/languages";
import { getLocaleConfig, isCoreLocale, isSupportedLocale } from "@/config/locales";
import { useCurrentUser } from "@/hooks/auth";
import type { AuthUser } from "@/hooks/auth";
import ThemeToggle from "@/components/ThemeToggle";
import { classifyMobileAppShellPath } from "@/features/wrapper/mobileAppShellContract";
import { resolveHeaderAuthTruth } from "@features/auth/headerAuthTruth";

type NavItem = { id: string; href: string; label: string };

function buildPrimaryNav(user: AuthUser | null | undefined): NavItem[] {
  return [
    { id: "participate", href: "/swipes", label: "Mitmachen" },
    { id: "topics", href: "/themen", label: "Themen" },
    { id: "start", href: "/runden/new?gtm=1", label: "Etwas starten" },
    {
      id: "organization",
      href: user ? "/account/organization/dashboard" : "/account/organization",
      label: "Organisation",
    },
  ];
}

function deriveInitials(value: string) {
  const parts = value.trim().split(" ").filter(Boolean);
  if (!parts.length) return "DU";
  return `${parts[0]?.[0]?.toUpperCase() ?? ""}${parts[1]?.[0]?.toUpperCase() ?? ""}` || "DU";
}

function isActiveNavHref(pathname: string | null, href: string) {
  const normalizedHref = href.split("?")[0] ?? href;
  if (!pathname) return false;
  return pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
}

export function SiteHeader({ initialUser }: { initialUser?: AuthUser | null }) {
  const { uiLocale, setUiLocale, readingLocale } = useLanguagePreferences();
  const {
    user: currentUser,
    loading: currentUserLoading,
    error: currentUserError,
    confirmLoggedOut,
  } = useCurrentUser(initialUser);
  const authTruth = resolveHeaderAuthTruth({ initialUser, currentUser, currentUserLoading });
  const user = authTruth.user;
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const localePanelRef = useRef<HTMLDivElement | null>(null);
  const isSwipeFocusPath = pathname?.startsWith("/swipes") || pathname?.startsWith("/demo/swipes");
  const mobileShellPolicy = useMemo(() => classifyMobileAppShellPath(pathname), [pathname]);
  const compactMobileShell = mobileShellPolicy.compactHeader;
  const activeLocaleConfig = useMemo(() => getLocaleConfig(uiLocale), [uiLocale]);
  const localeLabel = uiLocale.toUpperCase();
  const translationPending = isPublicPathname(pathname) && AUTO_TRANSLATE_LOCALES.includes(uiLocale);
  const t = useAutoTranslateText({ locale: uiLocale, namespace: "site-header" });
  const navLinks = useMemo(() => {
    const baseLinks = buildPrimaryNav(user ?? null);
    if (uiLocale === "de") return baseLinks;
    return baseLinks.map((item) => mapTranslatableStrings(item, t, { namespace: "nav" }));
  }, [uiLocale, t, user]);
  const avatarLabel = deriveInitials(user?.name || user?.email || "Du");
  const avatarUrl = user?.avatarUrl ?? null;
  const unknownAccountLabel = currentUserError
    ? t("Accountstatus derzeit nicht verfügbar", "auth.unavailable")
    : t("Accountstatus wird geprüft", "auth.loading");

  const localeOptions = UI_LANGS.flatMap((lang) => {
    if (!isCoreLocale(lang.code)) return [];
    const cfg = getLocaleConfig(lang.code);
    return [{ code: lang.code, label: cfg.label || lang.label, flag: cfg.flagEmoji || "🏳️" }];
  });

  useEffect(() => {
    if (!mobileOpen) setLocaleOpen(false);
  }, [mobileOpen]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (localeOpen && localePanelRef.current && !localePanelRef.current.contains(target)) setLocaleOpen(false);
      if (mobileOpen && headerRef.current && !headerRef.current.contains(target)) setMobileOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setLocaleOpen(false);
      setMobileOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [localeOpen, mobileOpen]);

  const handleLocaleSelect = (next: LanguageCode) => {
    if (!isSupportedLocale(next)) return;
    setUiLocale(next);
    setLocaleOpen(false);
    router.refresh();
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) return;
      confirmLoggedOut();
      setMobileOpen(false);
      router.refresh();
    } catch (err) {
      console.warn("logout failed", err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header
      ref={headerRef}
      data-site-header="true"
      className={`sticky top-0 z-40 border-b border-[rgb(var(--border))] bg-[color-mix(in_oklab,rgb(var(--bg))_88%,rgb(var(--card))_12%)] shadow-[0_10px_28px_rgba(2,6,23,0.06)] backdrop-blur-xl ${isSwipeFocusPath ? "max-md:hidden" : ""}`}
    >
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 md:gap-4 md:px-5 md:py-3.5 ${compactMobileShell ? "max-md:py-1.5" : ""}`}>
        <Link href="/" className="rounded-full px-1 py-1">
          <span
            className="text-xl font-extrabold leading-tight tracking-tight md:text-[1.4rem] lg:text-[1.55rem]"
            style={{ backgroundImage: "linear-gradient(120deg,var(--brand-cyan),var(--brand-blue))", WebkitBackgroundClip: "text", color: "transparent" }}
          >
            eDebatte
          </span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex" aria-label={t("Hauptnavigation", "aria.main-nav")}>
          {navLinks.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActiveNavHref(pathname, item.href) ? "page" : undefined}
              className={`inline-flex items-center rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                isActiveNavHref(pathname, item.href)
                  ? "border-[rgb(var(--grad-from))]/35 bg-[color-mix(in_oklab,rgb(var(--card))_86%,rgb(var(--grad-from))_14%)] text-[rgb(var(--fg))] shadow-sm"
                  : "border-transparent text-[rgb(var(--muted))] hover:border-[rgb(var(--border))] hover:text-[rgb(var(--fg))]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div ref={localePanelRef} className="relative hidden sm:block">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t(`UI-Sprache wählen (aktuell ${activeLocaleConfig.label})`, "aria.locale")}
                aria-expanded={localeOpen}
                onClick={() => setLocaleOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]"
              >
                <span aria-hidden="true">{activeLocaleConfig.flagEmoji || "🏳️"}</span>
                <span>{localeLabel}</span>
              </button>
              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Lesen {readingLocale.toUpperCase()}</span>
              {translationPending ? <span className="text-[10px] font-semibold text-amber-700">{t("Auto-Übersetzung", "status.auto")}</span> : null}
            </div>
            {localeOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2 shadow-lg">
                {localeOptions.map((lang) => (
                  <button key={lang.code} type="button" onClick={() => handleLocaleSelect(lang.code)} className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--bg))]">
                    <span>{lang.flag} {lang.code.toUpperCase()}</span><span>{lang.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {authTruth.status === "guest" ? <Link href="/login" className="vog-btn-brand hidden px-4 py-2 text-xs uppercase tracking-wide text-white sm:inline-flex">{t("Login", "cta.login")}</Link> : null}
          {authTruth.status === "unknown" ? <span role="status" aria-label={unknownAccountLabel} className="hidden text-xs text-[rgb(var(--muted))] sm:block">{unknownAccountLabel}</span> : null}

          <button
            type="button"
            aria-label={user ? t("Account-Menü öffnen", "aria.account") : t("Navigation öffnen", "aria.navigation")}
            onClick={() => setMobileOpen((value) => !value)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-sm font-semibold text-[rgb(var(--muted))] ${compactMobileShell ? "hidden md:inline-flex" : ""}`}
          >
            {user ? (
              avatarUrl ? <span aria-label={avatarLabel} className="h-full w-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${avatarUrl})` }} /> : avatarLabel
            ) : (
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
          <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
            <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wide">{t("Was möchtest du tun?", "mobile.nav")}</span><ThemeToggle variant="icon" /></div>
            <nav aria-label={t("Mobile Navigation", "aria.mobile-nav")} className="flex flex-col gap-2">
              {navLinks.map((entry) => (
                <Link key={entry.id} href={entry.href} onClick={() => setMobileOpen(false)} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm font-semibold text-[rgb(var(--fg))]">
                  {entry.label}
                </Link>
              ))}
              {authTruth.status !== "unknown" ? <Link href={user ? "/account" : "/login"} onClick={() => setMobileOpen(false)} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm font-semibold">{user ? t("Mein Konto", "account") : t("Anmelden", "login")}</Link> : null}
              {user ? <button type="button" onClick={handleLogout} disabled={loggingOut} className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--muted))]">{loggingOut ? t("Abmelden …", "logout.pending") : t("Abmelden", "logout")}</button> : null}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
