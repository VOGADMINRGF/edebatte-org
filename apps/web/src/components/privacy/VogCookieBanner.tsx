"use client";
// E200: Client-side consent banner without third-party CMPs.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PrivacyStrings } from "@/app/privacyStrings";
import {
  CONSENT_COOKIE_NAME,
  buildConsentCookie,
  parseConsentCookie,
  type VogConsent,
} from "@/lib/privacy/consent";

interface VogCookieBannerProps {
  strings: PrivacyStrings;
  initialConsent?: VogConsent | null;
}

function readConsentFromDocument(): VogConsent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
    ?.split("=")[1];
  return parseConsentCookie(raw);
}

export function VogCookieBanner({ strings, initialConsent }: VogCookieBannerProps) {
  const [consent, setConsent] = useState<VogConsent | null>(initialConsent ?? null);
  const [show, setShow] = useState(!initialConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState<boolean>(false);

  useEffect(() => {
    if (initialConsent) return;
    const existing = readConsentFromDocument();
    if (existing) {
      setConsent(existing);
      setAnalyticsOptIn(existing.analytics);
      setShow(false);
    }
  }, [initialConsent]);

  useEffect(() => {
    if (consent) {
      setAnalyticsOptIn(consent.analytics);
    }
  }, [consent]);

  const persistConsent = (value: VogConsent) => {
    if (typeof document === "undefined") return;
    const cookie = buildConsentCookie(value);
    document.cookie = cookie;
    setConsent(value);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-50 flex justify-center px-3">
      <div className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-emerald-100 bg-white/95 shadow-[0_20px_60px_rgba(16,185,129,0.18)] backdrop-blur">
        <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr] md:p-6">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {strings.banner.title}
            </div>
            <p className="text-sm text-slate-700">{strings.banner.lead}</p>
            <p className="text-[11px] text-slate-600">{strings.dialog.aiUsageBody}</p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <Link href="/datenschutz" className="font-semibold text-emerald-700 underline underline-offset-2">
                {strings.banner.links.privacy}
              </Link>
              <Link href="/impressum" className="font-semibold text-emerald-700 underline underline-offset-2">
                {strings.banner.links.imprint}
              </Link>
              <Link href="/ki-nutzung" className="font-semibold text-emerald-700 underline underline-offset-2">
                {strings.banner.links.aiUsage}
              </Link>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-emerald-900">{strings.banner.essentialTitle}</p>
              <p className="text-xs text-emerald-800">{strings.banner.essentialBody}</p>
            </div>
            <div className="space-y-2 rounded-lg border border-white/40 bg-white/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-emerald-900">{strings.banner.analyticsTitle}</p>
                  <p className="text-[11px] text-emerald-800">{strings.banner.analyticsBody}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={analyticsOptIn}
                    onChange={(e) => setAnalyticsOptIn(e.target.checked)}
                  />
                  <div className="h-6 w-11 rounded-full bg-emerald-200 transition peer-checked:bg-emerald-500" />
                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                </label>
              </div>
              {settingsOpen && (
                <p className="text-[11px] text-emerald-700">
                  {strings.dialog.intro}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-900">
              <button
                type="button"
                className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-white shadow hover:brightness-110"
                onClick={() => persistConsent({ essential: true, analytics: true })}
              >
                {strings.banner.buttons.acceptAll}
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border border-emerald-300 bg-white px-4 py-2 text-emerald-800 hover:bg-emerald-50"
                onClick={() => persistConsent({ essential: true, analytics: false })}
              >
                {strings.banner.buttons.onlyEssential}
              </button>
              <button
                type="button"
                className="rounded-full border border-transparent px-3 py-2 text-emerald-800 underline underline-offset-2"
                onClick={() => setSettingsOpen((prev) => !prev)}
              >
                {strings.banner.buttons.settings}
              </button>
            </div>
            {settingsOpen && (
              <div className="space-y-1 rounded-lg bg-white/60 p-3 text-[11px] text-emerald-800">
                <p className="font-semibold">{strings.dialog.title}</p>
                <p>{strings.dialog.aiUsageBody}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
