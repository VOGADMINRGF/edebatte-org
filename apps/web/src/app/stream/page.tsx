"use client";

import Link from "next/link";
import useUser from "@features/user/context/UserContext";
import StreamList from "@features/stream/components/StreamList";

export default function StreamPage() {
  const { user } = useUser();
  const needsVerification = user && user.verification !== "legitimized";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-6xl px-4 py-12 space-y-6">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
            Live &amp; Replay
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
            Streams zu aktuellen Themen
          </h1>
          <p className="text-sm text-slate-600 md:text-base">
            Schau live rein, diskutier mit und verfolge die wichtigsten Fragen im Kontext der
            aktuellen Debatten.
          </p>
        </header>

        {!user && (
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
            <p className="font-semibold">Mitmachen?</p>
            <p className="mt-1">
              Streams kannst du ohne Login anschauen. Für Abstimmungen und eigene Fragen brauchst
              du ein Konto.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/login?next=/stream"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
              >
                Einloggen
              </Link>
              <Link
                href="/register?next=/stream"
                className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-700 hover:border-sky-300"
              >
                Konto anlegen
              </Link>
            </div>
          </div>
        )}

        {needsVerification && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Abstimmungen erfordern Verifizierung</p>
            <p className="mt-1">
              Du kannst Streams ansehen, aber für Live-Abstimmungen ist eine PostIdent-Verifizierung
              nötig.
            </p>
            <Link
              href="/verify?next=/stream"
              className="mt-3 inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-semibold text-amber-900 hover:border-amber-300"
            >
              Verifizierung starten
            </Link>
          </div>
        )}

        <div className="rounded-3xl border border-slate-100 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-6">
          <StreamList />
        </div>
      </section>
    </main>
  );
}
