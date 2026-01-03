import Link from "next/link";

export default function PrivatsphaerePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Privatsphaere
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              Privatsphaere &amp; Datensicherheit
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              Auf dieser Seite findest du die wichtigsten Wege zu Datenschutz,
              Widerspruch und Kontosicherheit. So gelangst du schnell dorthin,
              wo du Entscheidungen treffen oder Hilfe bekommen kannst.
            </p>
          </header>

          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Schnellzugriff
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <LinkCard
                  href="/datenschutz"
                  label="Datenschutz"
                  body="Verarbeitungszwecke, Rechte und Kontakt."
                />
                <LinkCard
                  href="/widerspruch"
                  label="Widerspruch & Kuendigung"
                  body="Widerspruch gegen Datenverarbeitung oder Kuendigung."
                />
                <LinkCard
                  href="/account/security"
                  label="Kontosicherheit"
                  body="Sicherheitsoptionen fuer dein Konto."
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Transparenz & Kontrolle
              </p>
              <p className="mt-2">
                Wenn du noch Fragen hast oder einen konkreten Fall klaeren
                moechtest, melde dich jederzeit ueber das Kontaktformular.
              </p>
              <Link
                href="/kontakt"
                className="mt-3 inline-flex font-semibold text-sky-700 underline underline-offset-4"
              >
                Kontakt aufnehmen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function LinkCard({ href, label, body }: { href: string; label: string; body: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-slate-200 hover:text-slate-900"
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{body}</p>
    </Link>
  );
}
