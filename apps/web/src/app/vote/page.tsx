const steps = [
  "Vorlage lesen: Kurztext, Begründung, Pro/Contra, Quellen & Unsicherheiten – alles verlinkt.",
  "Berechtigung prüfen: eine Person = eine Stimme; Region-Nachweis nur bei Bedarf.",
  "Stimme abgeben: geheim – Identität getrennt von Stimme.",
  "Zählen & prüfen: Quorum, definierte Mehrheiten (z. B. 2/3 bei Grundsatzfragen).",
  "Veröffentlichen: Ergebnis, Beteiligung, Minderheitenbericht, Prüfprotokoll.",
];

const graphLegend = [
  { label: "Aussage", color: "#0ea5e9" },
  { label: "Beleg / Gegenbeleg", color: "#10b981" },
  { label: "Entscheidung", color: "#8b5cf6" },
];

export default function VotePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-4xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <h1
            className="text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage: "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Abstimmen – fair, nachvollziehbar, wirksam
          </h1>
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <p className="text-lg text-slate-700">
              In 20 Sekunden liest du eine klar formulierte Vorlage mit Pro & Contra, gibst eine geheime Stimme ab
              und siehst sofort Ergebnis, Quorum, Beteiligung und Minderheitenbericht. Regeln und Methodik sind von Anfang an öffentlich.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-700">
              {["Beteiligung: live", "Quorum transparent", "Methoden verlinkt"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border px-3 py-1"
                  style={{ borderColor: "var(--chip-border)", background: "var(--chip-bg)" }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">So läuft eine Abstimmung</h2>
          <ol className="list-decimal space-y-2 pl-6 text-sm text-slate-700">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Evidenz-Graph – so liest du ihn</h2>
          <p className="text-sm text-slate-700">
            Aussagen werden mit Belegen gestützt, Gegenbelege zeigen Grenzen. Daraus entsteht eine begründete Entscheidung.
            Pfeile zeigen, worauf sich etwas stützt; jede Kante verweist auf eine Quelle.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
            <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-700">
              {graphLegend.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
                  style={{ borderColor: item.color, color: item.color }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-2 rounded-xl bg-gradient-to-r from-slate-50 to-white p-4 text-xs text-slate-600">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="rounded-full bg-sky-100 px-3 py-2 font-semibold text-sky-700">
                  Aussage
                </div>
                <p>
                  Kurzer Satz, der später abgestimmt werden kann. Jede Aussage verweist auf Quellen.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="rounded-full bg-emerald-100 px-3 py-2 font-semibold text-emerald-700">
                  Belege sammeln
                </div>
                <p>Studien, Daten, Erfahrungsberichte – alles mit Herkunft (wer? wann? Kontext?).</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="rounded-full bg-rose-100 px-3 py-2 font-semibold text-rose-700">
                  Gegenposition prüfen
                </div>
                <p>Widersprüche, Unsicherheiten und offene Fragen werden sichtbar gehalten.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="rounded-full bg-violet-100 px-3 py-2 font-semibold text-violet-700">
                  Entscheidung
                </div>
                <p>
                  Auf Basis der Quellen entscheidet die Community; das Prüfprotokoll zeigt, warum und mit welchem Vertrauen.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Regeln – kurz vorgestellt</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Quorum 10 % (Standard). Grundsatzthemen erfordern 2/3 Mehrheit.</li>
            <li>Minderheitenbericht wird automatisch erstellt.</li>
            <li>Prüfprotokoll hält Ergebnis, Beteiligung, Quorum, Vertrauen fest.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Los geht’s</h2>
          <div className="flex flex-wrap gap-3">
            <a href="/statements" className="btn bg-brand-grad text-white shadow-soft">
              Statements ansehen
            </a>
            <a href="/contributions/new" className="btn border border-slate-300 bg-white">
              Eigenes Anliegen starten
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
