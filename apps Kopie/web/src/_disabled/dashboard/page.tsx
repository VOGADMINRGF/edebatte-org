"use client";
import Link from "next/link";

export default function DashboardPage() {
  // Wenn du beides auf einer Seite willst, sonst einfach eines löschen!
  const links = [
    { href: "/dashboard/reporting", label: "Report-Analyse" },
    { href: "/dashboard/users", label: "Mitglieder & Rollen" },
    { href: "/dashboard/streams", label: "Streams & Beteiligung" },
    { href: "/dashboard/language", label: "Übersetzungs-Status" },
    { href: "/dashboard/logs", label: "System-Logs & Monitoring" },
    { href: "/dashboard/api", label: "API- & System-Status" },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-20 space-y-12">
      <h1 className="text-3xl font-bold text-coral text-center">
        Mein Dashboard
      </h1>
      <p className="text-center text-gray-600 text-lg">
        Verwalte deine Streams, erstelle neue Formate oder werte Beteiligung
        aus.
      </p>

      {/* Spezial-Links (optisch wie Cards) */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link
          href="/dashboard/create-stream"
          className="bg-coral/10 hover:bg-coral/20 border border-coral rounded-lg p-6 text-center shadow-sm transition"
        >
          <h2 className="text-xl font-semibold text-coral mb-2">
            ➕ Stream erstellen
          </h2>
          <p className="text-sm text-gray-700">
            Plane einen neuen Livestream mit Fragen, Themen und regionalem
            Bezug.
          </p>
        </Link>

        <Link
          href="/dashboard/manage-streams"
          className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-6 text-center shadow-sm transition"
        >
          <h2 className="text-xl font-semibold text-indigo-800 mb-2">
            📋 Streams verwalten
          </h2>
          <p className="text-sm text-gray-700">
            Aktive oder geplante Streams bearbeiten, pausieren oder beenden.
          </p>
        </Link>

        <Link
          href="/dashboard/reports"
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg p-6 text-center shadow-sm transition"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            📊 Reports einsehen
          </h2>
          <p className="text-sm text-gray-700">
            Statistiken, Beteiligung und Auswertung (für Admins oder Premium).
          </p>
        </Link>
      </div>

      {/* Allgemeine Dashboard-Links (optisch neutral) */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="p-4 border rounded hover:shadow bg-white transition text-center"
          >
            <h2 className="text-lg font-semibold text-coral">{link.label}</h2>
          </Link>
        ))}
      </div>
    </main>
  );
}
