// packages/ui/src/layout/Header.tsx
"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">eDebatte</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/report">Reports</Link>
          <Link href="/statements">Statements</Link>
          <Link href="/kontakt">Kontakt</Link>
        </nav>
      </div>
    </header>
  );
}
