// E200: Public root layout with locale bootstrap and consent banner.
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/context/LocaleContext";
import { DEFAULT_LOCALE, type SupportedLocale, isSupportedLocale } from "@/config/locales";
import { SiteHeader } from "./(components)/SiteHeader";
import { getPrivacyStrings } from "./privacyStrings";
import { VogCookieBanner } from "@/components/privacy/VogCookieBanner";
import { CONSENT_COOKIE_NAME, parseConsentCookie } from "@/lib/privacy/consent";

export const metadata: Metadata = {
  title: "VoiceOpenGov",
  description: "eDebatte – Anliegen analysieren, sauber & transparent.",
};
export const viewport = {
  themeColor: "#06b6d4",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = await detectInitialLocale(cookieStore);
  const initialConsent = parseConsentCookie(cookieStore.get(CONSENT_COOKIE_NAME)?.value);
  const privacyStrings = getPrivacyStrings(initialLocale);

  return (
    <html lang={initialLocale} className="h-full">
      <body className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white text-neutral-900 antialiased">
        <LocaleProvider initialLocale={initialLocale}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-white/70 backdrop-blur">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-neutral-600 md:flex-row md:items-center md:justify-between">
                <span>© 2025 VoiceOpenGov</span>
                <div className="flex items-center gap-4">
                  <a href="/kontakt" className="font-medium text-slate-800 hover:text-slate-900">
                    Kontakt
                  </a>
                  <a href="/datenschutz" className="font-medium text-slate-800 hover:text-slate-900">
                    Datenschutz
                  </a>
                  <a href="/ki-nutzung" className="font-medium text-slate-800 hover:text-slate-900">
                    KI-Nutzung
                  </a>
                  <a href="/impressum" className="font-medium text-slate-800 hover:text-slate-900">
                    Impressum
                  </a>
                </div>
              </div>
            </footer>
            <div className="h-[env(safe-area-inset-bottom)]" />
            <VogCookieBanner strings={privacyStrings} initialConsent={initialConsent} />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}

async function detectInitialLocale(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<SupportedLocale> {
  const cookieLocale = cookieStore.get("lang")?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.split(";")[0]?.trim();
    if (primary) {
      const short = primary.slice(0, 2).toLowerCase();
      if (isSupportedLocale(short)) return short;
    }
  }

  return DEFAULT_LOCALE;
}
