"use client";

import Link from "next/link";
import useUser from "@features/user/context/UserContext";
import StreamList from "@features/stream/components/StreamList";

export default function StreamPage() {
  const { user, role } = useUser();
  const needsVerification = user && user.verification !== "legitimized";
  const canSeeViews = ["admin", "superadmin", "moderator", "creator"].includes(role);

  return (
    <main className="min-h-screen overflow-x-clip bg-[rgb(var(--bg))] pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-6xl space-y-5 px-4 py-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
            Events &amp; Beteiligung
          </p>
          <h1 className="text-2xl font-extrabold text-[rgb(var(--fg))] md:text-4xl">
            Öffentliche Events zu aktuellen Themen
          </h1>
          <p className="text-sm text-[rgb(var(--muted))] md:text-base">
            Hier erscheinen freigegebene Veranstaltungen und Debatten. Je nach Event kannst du
            live zusehen, ein vorhandenes Video ansehen oder Fragen und Hinweise einreichen.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!user ? (
            <>
              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[rgb(var(--muted))]">
                Öffentliche Events kannst du ansehen. Beteiligung kann je nach Event ein Konto erfordern.
              </span>
              <Link
                href="/login?next=/stream"
                className="inline-flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 font-semibold text-[rgb(var(--fg))]"
              >
                Einloggen
              </Link>
              <Link
                href="/register?next=/stream"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-3 py-1 font-semibold text-white"
              >
                Registrieren
              </Link>
            </>
          ) : null}
          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[rgb(var(--muted))]">
            Beiträge bleiben reviewpflichtig; es gibt keine automatische Veröffentlichung.
          </span>
          {needsVerification ? (
            <Link
              href="/verify?next=/stream"
              className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 font-semibold text-amber-900"
            >
              Verifizierung starten
            </Link>
          ) : null}
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-6">
          <StreamList showViews={canSeeViews} showToolbar={false} />
          <div className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm text-[rgb(var(--muted))]">
            Ist aktuell kein Event freigegeben, bleibt diese Übersicht bewusst leer. Themen,
            Dossiers und Swipes funktionieren unabhängig davon weiter.
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/runden" className="inline-flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]">
                Zum Anlassraum
              </Link>
              <Link href="/dossier" className="inline-flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]">
                Zu Dossiers
              </Link>
              <Link href="/themen" className="inline-flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]">
                Themen ansehen
              </Link>
              <Link href="/swipes" className="inline-flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]">
                Zu Swipes
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
