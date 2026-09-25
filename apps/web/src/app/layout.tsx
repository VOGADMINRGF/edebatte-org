// E200: Public root layout with locale bootstrap and privacy gate.
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import "./create-mobile-polish.css";
import { BRAND } from "@/lib/brand";
import { LocaleProvider } from "@/context/LocaleContext";
import { DEFAULT_LOCALE, getDir, type SupportedLocale, isSupportedLocale } from "@/config/locales";
import { SiteHeader } from "./(components)/SiteHeader";
import { PrivacyGateProvider } from "@/components/privacy/PrivacyGateProvider";
import { AnalyticsTracker } from "@/components/privacy/AnalyticsTracker";
import { CONSENT_COOKIE_NAME, LEGACY_CONSENT_COOKIE_NAME, parseConsentCookie } from "@/lib/privacy/consent";
import SiteFooter from "@/components/SiteFooter";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ReadingModeProvider } from "@/components/providers/reading-mode-provider";
import { MobileAppShellChrome } from "@/components/mobile/MobileAppShellChrome";
import { loadServerUser } from "@/lib/server/auth/loadServerUser";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.baseUrl),
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.tagline_de,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: BRAND.name,
  },
  openGraph: {
    title: BRAND.name,
    description: BRAND.tagline_de,
    url: BRAND.baseUrl,
    siteName: BRAND.name,
  },
  twitter: {
    title: BRAND.name,
    description: BRAND.tagline_de,
    site: BRAND.domain,
  },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06b6d4",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialLocale = await detectInitialLocale(cookieStore);
  const initialConsent = parseConsentCookie(
    cookieStore.get(CONSENT_COOKIE_NAME)?.value ?? cookieStore.get(LEGACY_CONSENT_COOKIE_NAME)?.value,
  );
  const initialUser = await loadServerUser();

  return (
    <html lang={initialLocale} dir={getDir(initialLocale)} className="h-full" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <ReadingModeProvider>
            <LocaleProvider initialLocale={initialLocale}>
              <PrivacyGateProvider initialConsent={initialConsent}>
                <div className="flex min-h-screen flex-col">
                  <SiteHeader initialUser={initialUser} />
                  <main data-site-main="true" className="flex-1">
                    {children}
                  </main>
                  <SiteFooter />
                  <MobileAppShellChrome />
                  <div data-site-safe-area-spacer="true" />
                  <AnalyticsTracker />
                </div>
              </PrivacyGateProvider>
            </LocaleProvider>
          </ReadingModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

async function detectInitialLocale(cookieStore: Awaited<ReturnType<typeof cookies>>): Promise<SupportedLocale> {
  const headerStore = await headers();
  const requestLocale = headerStore.get("x-edebatte-locale");
  if (isSupportedLocale(requestLocale)) return requestLocale;

  const cookieLocale = cookieStore.get("lang")?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

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
