// apps/web/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "./(components)/SiteHeader";

export const metadata: Metadata = {
  title: "VoiceOpenGov",
  description: "eDebatte – Anliegen analysieren, sauber & transparent.",
};
export const viewport: Viewport = {
  themeColor: "#06b6d4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white text-neutral-900 antialiased">
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
      </body>
    </html>
  );
}
