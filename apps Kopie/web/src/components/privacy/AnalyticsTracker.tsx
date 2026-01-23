"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  CONSENT_COOKIE_NAME,
  LEGACY_CONSENT_COOKIE_NAME,
  parseConsentCookie,
} from "@/lib/privacy/consent";

const VISITOR_COOKIE = "edb_vid";
const VISITOR_TTL_SEC = 60 * 60 * 24 * 30 * 6;

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!entry) return null;
  return entry.split("=")[1] ?? null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${VISITOR_TTL_SEC}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function ensureVisitorId(): string {
  const existing = readCookieValue(VISITOR_COOKIE);
  if (existing) return existing;
  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  setCookie(VISITOR_COOKIE, fresh);
  return fresh;
}

function readConsent() {
  const primary = readCookieValue(CONSENT_COOKIE_NAME);
  if (primary) return parseConsentCookie(primary);
  const legacy = readCookieValue(LEGACY_CONSENT_COOKIE_NAME);
  return parseConsentCookie(legacy);
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const consent = readConsent();
    if (!consent?.analytics) return;

    const visitorId = ensureVisitorId();

    void fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname, visitorId }),
      keepalive: true,
    });
  }, [pathname]);

  return null;
}
