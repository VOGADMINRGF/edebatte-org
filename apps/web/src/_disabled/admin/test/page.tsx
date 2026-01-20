// apps/web/src/app/admin/test/page.tsx
"use client";

import Link from "next/link";

const checkItems = [
  { label: "Stream-Kacheln sichtbar & korrekt", href: "/stream" },
  { label: "Unterstützen-Button im Header", href: "/unterstuetzen" },
  { label: "CI-Farben & Fonts greifen", href: "/" },
  { label: "Impressum geladen & erreichbar", href: "/impressum" },
  { label: "Datenschutzseite erreichbar", href: "/daten" },
  { label: "Satzung aufrufbar & formatiert", href: "/satzung" },
  { label: "Footer mit Links korrekt gerendert", href: "/" },
  { label: "Build & Dev starten ohne Fehler", href: "#check-console" },
];

export default function AdminTestPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">✅ eDebatte Admin Checkliste</h1>
      <ul className="space-y-4">
        {checkItems.map((item) => (
          <li
            key={item.href}
            className="border rounded-lg p-4 hover:bg-gray-50"
          >
            <Link href={item.href} className="text-coral font-medium">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-gray-500">
        Hinweis: Für Punkt 8 bitte Logs in Konsole prüfen (<code>pnpm dev</code>{" "}
        &amp; <code>pnpm build</code>).
      </p>
    </div>
  );
}
