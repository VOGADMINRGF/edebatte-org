import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thema einreichen – VoiceOpenGov",
};

export default function ThemaEinreichenPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Thema einreichen
          </p>
          <h1
            className="text-3xl md:text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            So wird aus deinem Anliegen ein prüfbares Thema
          </h1>
          <p className="text-base md:text-lg text-slate-700 leading-relaxed">
            Du reichst dein Thema als klaren, prüfbaren Vorschlag ein. Wir helfen
            dir dabei, es in Statements, Zuständigkeiten und einen Zeitbezug zu
            strukturieren. Danach kannst du alles noch anpassen, bevor es in die
            öffentliche Prüfung geht.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/statements/new"
              className="btn btn-primary bg-brand-grad text-white"
            >
              Zum Statement-Editor
            </Link>
            <Link
              href="/faq"
              className="btn border border-slate-300 bg-white/80 hover:bg-white"
            >
              FAQ ansehen
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            {
              title: "1. Anliegen skizzieren",
              body: "Beschreibe dein Thema in 1–3 klaren Sätzen. Je präziser, desto besser.",
            },
            {
              title: "2. Strukturvorschlag",
              body: "Wir erzeugen Kernaussagen, Kontextfragen und eine erste Zuständigkeit.",
            },
            {
              title: "3. Prüfen & anpassen",
              body: "Du kannst Formulierungen korrigieren, ergänzen oder Hinweise geben.",
            },
            {
              title: "4. Öffentliche Phase",
              body: "Das Thema wird geprüft, diskutiert und je nach Verfahren zur Abstimmung vorbereitet.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {item.title}
              </p>
              <p className="mt-2 text-sm text-slate-700">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              So sollte dein Beitrag aufgebaut sein
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                <strong>Kernaussage:</strong> Was soll konkret passieren oder
                entschieden werden?
              </li>
              <li>
                <strong>Zuständigkeit:</strong> Wer ist verantwortlich (z. B.
                Kommune, Land, Bund, EU)?
              </li>
              <li>
                <strong>Zeithorizont:</strong> Bis wann oder ab wann soll etwas
                umgesetzt werden?
              </li>
              <li>
                <strong>Belege:</strong> Quellen oder Beispiele helfen bei der
                Prüfung (optional, aber empfohlen).
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Gut zu wissen
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>Bitte keine personenbezogenen Daten einreichen.</li>
              <li>Formuliere sachlich und überprüfbar.</li>
              <li>
                Mehrere Aussagen sind okay – wir helfen dir beim Strukturieren.
              </li>
              <li>
                Beiträge können redaktionell geprüft und zusammengeführt
                werden.
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/95 p-6 md:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Bereit, dein Thema einzureichen?
              </h2>
              <p className="text-sm text-slate-700">
                Starte im Statement-Editor und strukturiere dein Anliegen in
                wenigen Minuten.
              </p>
            </div>
            <Link
              href="/statements/new"
              className="btn btn-primary bg-brand-grad text-white"
            >
              Jetzt starten
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
