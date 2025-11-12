// apps/web/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-gradient-to-b from-cyan-50 via-blue-50/40 to-white text-neutral-900 antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 border-b bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
              <a href="/" className="font-extrabold tracking-tight">
                VoiceOpenGov
              </a>
              <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-700">
                <a href="/reports">Reports</a>
                <a href="/statements">Statements</a>
                <a href="/kontakt">Kontakt</a>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t bg-white/70 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-neutral-600">
              © 2025 Voice Open Gov
            </div>
          </footer>

          {/* iOS Safe Area */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </body>
    </html>
  );
}
