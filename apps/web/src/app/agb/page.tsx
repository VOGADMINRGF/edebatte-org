import Link from "next/link";

const CONTACT_EMAIL = "kontakt@voiceopengov.org";

export default function AgbPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Rechtliches
            </p>
            <h1 className="text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              Allgemeine Geschaeftsbedingungen (AGB)
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              Hier findest du die AGB fuer VoiceOpenGov und eDebatte. Wir
              finalisieren die rechtsverbindliche Fassung und veroeffentlichen
              sie hier, sobald sie vorliegt.
            </p>
          </header>

          <div className="mt-8 grid gap-4">
            <InfoCard
              title="Aktueller Stand"
              body="Die AGB befinden sich in der finalen Abstimmung. Sobald die
rechtsverbindliche Version veroeffentlicht ist, findest du sie an dieser Stelle."
            />

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Inhalte, die hier enthalten sein werden
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5">
                <li>Leistungsumfang und Nutzung der Plattform</li>
                <li>Mitgliedschaften, Pakete und Laufzeiten</li>
                <li>Kuendigung, Widerruf und Support</li>
                <li>Haftung, Pflichten und Verhaltensregeln</li>
              </ul>
            </div>

            <InfoCard
              title="Weitere rechtliche Informationen"
              body="Bis dahin findest du die wichtigsten Hinweise in diesen Bereichen:"
            />

            <div className="grid gap-3 md:grid-cols-3">
              <LinkCard href="/datenschutz" label="Datenschutz" />
              <LinkCard href="/widerrufsbelehrung" label="Widerrufsbelehrung" />
              <LinkCard href="/widerspruch" label="Widerspruch & Kuendigung" />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Kontakt
              </p>
              <p className="mt-2">
                Fragen zu den AGB oder einer Buchung? Schreib uns:
              </p>
              <a
                className="mt-2 inline-flex font-semibold text-sky-700 underline underline-offset-4"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-800 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-2 whitespace-pre-line">{body}</p>
    </div>
  );
}

function LinkCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-200 hover:text-slate-900"
    >
      {label}
    </Link>
  );
}
