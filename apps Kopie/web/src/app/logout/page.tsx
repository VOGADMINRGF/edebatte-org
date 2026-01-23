export const dynamic = "force-dynamic";

export default function LogoutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="rounded-3xl bg-white/90 px-6 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 space-y-3">
          <div className="text-xs uppercase tracking-[0.25em] text-sky-600">Abgemeldet</div>
          <h1 className="text-2xl font-semibold text-slate-900">
            <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
              Du bist jetzt abgemeldet.
            </span>
          </h1>
          <p className="text-sm text-slate-600">
            Wir haben deinen Wunsch verarbeitet. Du kannst die Seite schließen oder dich jederzeit neu anmelden.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              Zur Anmeldung
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
