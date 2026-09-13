"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { classifyMobileAppShellPath, type MobileAppShellPolicy } from "@/features/wrapper/mobileAppShellContract";

type MobileNavItem = {
  id: "start" | "topics" | "swipes" | "stream" | "account";
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  icon: (active: boolean) => ReactNode;
};

const MOBILE_NAV_ITEMS: readonly MobileNavItem[] = [
  {
    id: "start",
    href: "/",
    label: "Start",
    isActive: (pathname) => pathname === "/" || pathname === "/start",
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-sky-500" : "text-[rgb(var(--muted))]"}`} aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "topics",
    href: "/themen",
    label: "Themen",
    isActive: (pathname) =>
      pathname === "/themen" ||
      pathname === "/runden" ||
      pathname === "/anlassraum" ||
      pathname.startsWith("/topic/") ||
      pathname.startsWith("/round/") ||
      pathname.startsWith("/dossier/"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-sky-500" : "text-[rgb(var(--muted))]"}`} aria-hidden="true">
        <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4zm0 5h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "swipes",
    href: "/swipes",
    label: "Swipes",
    isActive: (pathname) => pathname === "/swipes" || pathname.startsWith("/swipes/"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-sky-500" : "text-[rgb(var(--muted))]"}`} aria-hidden="true">
        <path
          d="M4 12c0-3.9 3.1-7 7-7 2.6 0 4.9 1.4 6.1 3.5l1.4-1.4a1 1 0 0 1 1.4 1.4l-3.3 3.3a1 1 0 0 1-1.4 0l-3.3-3.3A1 1 0 1 1 13.3 7L14.9 8.6A5 5 0 1 0 16 12h2a7 7 0 1 1-14 0z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "stream",
    href: "/stream",
    label: "Live",
    isActive: (pathname) => pathname === "/stream" || pathname.startsWith("/stream/"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-sky-500" : "text-[rgb(var(--muted))]"}`} aria-hidden="true">
        <path d="M5 7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zm6 3v4l4-2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "account",
    href: "/account#profil",
    label: "Profil",
    isActive: (pathname) => pathname === "/account" || pathname.startsWith("/account/"),
    icon: (active) => (
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${active ? "text-sky-500" : "text-[rgb(var(--muted))]"}`} aria-hidden="true">
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m0 2c-4 0-7 2-7 4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5C19 16 16 14 12 14"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

function applyShellBodyClasses(policy: MobileAppShellPolicy) {
  const body = document.body;
  body.classList.toggle("vog-mobile-app-shell", policy.shellEnabled);
  body.classList.toggle("vog-mobile-app-shell-nav", policy.bottomNavEnabled);
  body.classList.toggle("vog-mobile-app-shell-compact", policy.compactHeader);
}

export function MobileAppShellChrome() {
  const pathname = usePathname() ?? "/";
  const policy = useMemo(() => classifyMobileAppShellPath(pathname), [pathname]);

  useEffect(() => {
    applyShellBodyClasses(policy);
    return () => {
      document.body.classList.remove("vog-mobile-app-shell");
      document.body.classList.remove("vog-mobile-app-shell-nav");
      document.body.classList.remove("vog-mobile-app-shell-compact");
    };
  }, [policy]);

  if (!policy.bottomNavEnabled) return null;

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          [data-site-header="true"] {
            display: none !important;
          }
        }
      `}</style>
      <nav
        aria-label="Mobile Hauptnavigation"
        data-mobile-app-bottom-nav="true"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.55rem)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[11px] font-semibold ${
                    active
                      ? "bg-[color-mix(in_oklab,rgb(var(--card))_82%,rgb(var(--bg))_18%)] text-[rgb(var(--fg))]"
                      : "text-[rgb(var(--muted))]"
                  }`}
                >
                  {item.icon(active)}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
