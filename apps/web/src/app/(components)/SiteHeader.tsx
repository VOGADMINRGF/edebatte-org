"use client";

import { useEffect, useState } from "react";
import LocaleSwitcher from "@/components/LocaleSwitcher";

const NAV_LINKS = [
  { href: "/howtoworks/bewegung", label: "Die Bewegung" },
  { href: "/howtoworks/edebatte", label: "eDebatte" },
  { href: "/swipe", label: "Zum Swipe" },
  { href: "/statements/new", label: "Beitrag verfassen" },
  { href: "/evidence/global", label: "Evidence" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let aborted = false;
    if (typeof document === "undefined") return;
    if (!document.cookie.includes("u_id=")) return;

    async function loadAccount() {
      try {
        const res = await fetch("/api/account/overview", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json().catch(() => ({}));
        if (!body?.overview || aborted) return;
        setAccount({
          name: body.overview.displayName || body.overview.email,
          email: body.overview.email,
        });
      } catch {
        /* ignore */
      }
    }
    loadAccount();
    return () => {
      aborted = true;
    };
  }, []);

  const initials =
    account?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DU";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-white via-white/90 to-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 border-b border-white/40 shadow-[0_5px_20px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a
          href="/"
          className="text-lg font-bold tracking-tight drop-shadow-sm"
          style={{
            backgroundImage: "linear-gradient(120deg,var(--brand-cyan),var(--brand-blue))",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          VoiceOpenGov
        </a>

        <nav className="hidden items-center gap-3 text-sm font-semibold text-slate-700 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </a>
          ))}
          <LocaleSwitcher />
          <a
            href="/mitglied-werden"
            className="rounded-full bg-brand-grad px-4 py-1.5 text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)]"
          >
            Mitglied werden
          </a>
          {account ? (
            <div className="relative" onMouseLeave={() => setAccountMenuOpen(false)}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                onClick={() => setAccountMenuOpen((v) => !v)}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white">
                  {initials}
                </span>
                Mein Konto
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-lg">
                  <a
                    href="/account"
                    className="block rounded-xl px-3 py-2 text-slate-700 transition hover:bg-slate-100"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    Profil öffnen
                  </a>
                  <button
                    className="block w-full rounded-xl px-3 py-2 text-left text-rose-600 transition hover:bg-rose-50"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-1 text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </a>
          )}
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher />
          <button
            type="button"
            className="rounded-full border border-slate-300/70 bg-white/80 p-2 text-slate-700 shadow-sm"
            onClick={() => setOpen((v) => !v)}
            aria-label="Navigation öffnen"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white/95 shadow-sm md:hidden">
          <div className="flex flex-col gap-3 px-4 py-4 text-sm font-semibold text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-slate-500">Navigation</span>
              <LocaleSwitcher />
            </div>
            <div className="flex flex-col gap-2">
              {NAV_LINKS.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              ))}
            </div>
            <a
              href="/mitglied-werden"
              className="rounded-full bg-brand-grad px-4 py-2 text-center text-white shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
              onClick={() => setOpen(false)}
            >
              Mitglied werden
            </a>
            {account ? (
              <a
                href="/account"
                className="rounded-full border border-slate-200 px-4 py-2 text-center text-slate-700"
                onClick={() => setOpen(false)}
              >
                Mein Konto
              </a>
            ) : (
              <a
                href="/login"
                className="rounded-full border border-slate-200 px-4 py-2 text-center text-slate-700"
                onClick={() => setOpen(false)}
              >
                Login
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
