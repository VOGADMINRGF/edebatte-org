"use client";

import { useState } from "react";

const NAV_LINKS = [
  { href: "/howtoworks#bewegung", label: "Die Bewegung" },
  { href: "/howtoworks#edebatte", label: "eDebatte" },
  { href: "/swipe", label: "Zum Swipe" },
  { href: "/statements/new", label: "Beitrag verfassen" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

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

        <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-700 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </a>
          ))}
          <a
            href="/mitglied-werden"
            className="rounded-full bg-brand-grad px-4 py-1.5 text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)]"
          >
            Mitglied werden
          </a>
        </nav>

        <button
          type="button"
          className="rounded-full border border-slate-300/70 bg-white/80 p-2 text-slate-700 shadow-sm md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Navigation öffnen"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white/95 shadow-sm md:hidden">
          <div className="flex flex-col gap-3 px-4 py-4 text-sm font-semibold text-slate-700">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
            <a
              href="/mitglied-werden"
              className="rounded-full bg-brand-grad px-4 py-2 text-center text-white shadow-[0_10px_25px_rgba(16,185,129,0.35)]"
              onClick={() => setOpen(false)}
            >
              Mitglied werden
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
