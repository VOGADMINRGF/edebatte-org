"use client";

import Link from "next/link";
import useUser from "@features/user/context/UserContext";
import StreamList from "@features/stream/components/StreamList";

export default function StreamPage() {
  const { role } = useUser();
  const canSeeViews = ["admin", "superadmin", "moderator", "creator"].includes(role);
  const canManageStreams = ["admin", "superadmin", "moderator", "creator"].includes(role);

  return (
    <main className="min-h-screen overflow-x-clip bg-[rgb(var(--bg))] pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-6xl space-y-5 px-4 py-5 md:py-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Live &amp; Events</p>
          <h1 className="text-2xl font-extrabold text-[rgb(var(--fg))] md:text-4xl">
            Live dabei sein oder selbst etwas einbringen
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[rgb(var(--muted))] md:text-base">
            Sieh laufende und vergangene Events. Eigene Fragen, Hinweise oder Themen startest du direkt über eDebatte.
          </p>
        </header>

        <div className="space-y-2">
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <a
              href="#live-streams"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2 text-sm font-bold text-slate-950"
            >
              Live ansehen
            </a>
            <Link
              href="/create"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
            >
              Beitrag einbringen
            </Link>
          </div>
          {canManageStreams ? (
            <p className="px-1 text-xs text-[rgb(var(--muted))]">
              Du möchtest selbst senden?{" "}
              <Link href="/dashboard/streams" className="font-semibold text-sky-500 underline underline-offset-4">
                Event vorbereiten →
              </Link>
            </p>
          ) : null}
        </div>

        <section
          id="live-streams"
          aria-label="Live und vergangene Events"
          className="scroll-mt-4 min-w-0 overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-6"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[rgb(var(--fg))]">Events</h2>
              <p className="text-xs text-[rgb(var(--muted))]">Live, geplant oder als Rückblick.</p>
            </div>
            <span className="rounded-full border border-[rgb(var(--border))] px-2.5 py-1 text-[11px] text-[rgb(var(--muted))]">
              Öffentlich
            </span>
          </div>
          <StreamList showViews={canSeeViews} showToolbar={false} statusSections={false} />
        </section>

        <p className="px-1 text-xs leading-5 text-[rgb(var(--muted))]">
          Nichts wird automatisch veröffentlicht.
        </p>
      </section>
    </main>
  );
}
