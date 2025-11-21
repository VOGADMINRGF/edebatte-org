// apps/web/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/context/LocaleContext";
import { DEFAULT_LOCALE, type SupportedLocale, isSupportedLocale } from "@/config/locales";
import { SiteHeader } from "./(components)/SiteHeader";

export const metadata: Metadata = {
  title: "VoiceOpenGov",
  description: "eDebatte – Anliegen analysieren, sauber & transparent.",
};
export const viewport: Viewport = {
  themeColor: "#06b6d4",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLocale = await detectInitialLocale();

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
                </div>
              </div>
            </footer>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}

async function detectInitialLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
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
