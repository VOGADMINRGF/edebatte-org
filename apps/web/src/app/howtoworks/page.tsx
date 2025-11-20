const audiences = [
  {
    title: "Menschen vor Ort",
    body: "bringen Anliegen ein, sehen Fakten und stimmen geheim ab.",
  },
  {
    title: "Journalist:innen",
    body: "nutzen offene Dossiers, Embeds und Exporte – ohne Paywall.",
  },
  {
    title: "Verwaltungen & Organisationen",
    body: "erhalten Mandat, Plan und Audit-Trail – nachvollziehbar für alle.",
  },
];

const steps = [
  "Anliegen einreichen: Ziel, Region, Zuständigkeit, kurze Begründung.",
  "Fakten sammeln: Quellen, Daten, Gegenpositionen – alles verlinkt.",
  "Debatte: Pro & Contra werden gleich behandelt, Identität bleibt geschützt.",
  "Abstimmen: geheime Stimme, Quorum & Mehrheiten transparent.",
  "Umsetzen: Ergebnis mit Mandat, Plan, Risiken und Audit-Trail begleiten.",
];

const duet = [
  {
    title: "VoiceOpenGov",
    body: "Dachbewegung für direkte Demokratie. Wir verbinden lokale Anliegen mit einer weltweiten Allianz. Fokus: Werte, Offenheit, Schutz lokaler Mehrheiten.",
  },
  {
    title: "eDebatte",
    body: "Das Werkzeug der Bewegung. Hier bringst du Anliegen ein, gehst durch Faktenchecks und siehst Vertrauenswerte – alles nachvollziehbar für Bürger:innen, Medien und Verwaltungen.",
  },
  {
    title: "Zusammenspiel",
    body: "VoG sorgt für Haltung und Verantwortlichkeit, eDebatte liefert Methodik und Transparenz. So bleibt jede Region souverän und kann trotzdem grenzübergreifend lernen.",
  },
];

const evidenceLegend = [
  { label: "Aussage", color: "#0ea5e9", explainer: "klarer Satz, der später abgestimmt wird" },
  { label: "Beleg", color: "#10b981", explainer: "Studien, Daten, Erfahrungen mit Quelle" },
  { label: "Gegenbeleg", color: "#f97316", explainer: "zeigt Grenzen oder Widersprüche" },
  { label: "Entscheidung", color: "#8b5cf6", explainer: "zeigt, wie aus Evidenz ein Mandat wird" },
];

export default function HowToWorksPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section id="mission" className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <h1
            className="text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            So funktioniert VoiceOpenGov
          </h1>
          <div className="rounded-[40px] border border-transparent bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <div className="rounded-[36px] bg-white/90 p-6 space-y-4">
            <p className="text-lg text-slate-700">
              In einfachen Schritten: Anliegen schreiben, Fakten offenlegen, fair abstimmen, Umsetzung
              verfolgen. Alles heißt bei uns <strong>eDebatte</strong> – das Tool der VoiceOpenGov-Bewegung.
            </p>
            <p className="text-sm text-slate-600">
              VoiceOpenGov bleibt die Bewegung über allem: Sie steht für direkte Demokratie, hört jeder
              Stimme zu und lädt auch Diaspora-Communitys ein. eDebatte ist das handwerkliche System, das
              diese Haltung in klare Prozesse übersetzt.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-700">
              {["Quellen-Abdeckung: hoch", "Disagreement-Index: niedrig", "Re-Run-Stabilität: hoch"].map((chip) => (
                <span
                  key={chip}
                    className="rounded-full border px-3 py-1 shadow-sm"
                    style={{ borderColor: "var(--chip-border)", background: "rgba(14,165,233,0.08)" }}
                >
                  {chip}
                </span>
              ))}
            </div>
            </div>
          </div>
        </header>

        <section
          id="bewegung"
          className="rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.04)] space-y-3 p-6"
        >
          <h2 className="text-2xl font-bold text-slate-900">VoiceOpenGov = Dachbewegung</h2>
          <p className="text-sm text-slate-700">
            VoiceOpenGov ist eine übergeordnete Dachbewegung: Wir fördern direkte Demokratie weltweit,
            hören den Stimmen aller Bürger:innen zu und beziehen auch Diaspora-Communitys ein. In jeder
            Region zählt die Mehrheit vor Ort – gleichzeitig bleibt der Diskurs grenzübergreifend nutzbar.
          </p>
          <p className="text-sm text-slate-700">
            Unser Alleinstellungsmerkmal ist die Kombination aus Bewegung + Werkzeug. Mit{" "}
            <strong>eDebatte</strong> hat jede Person die Möglichkeit, Anliegen strukturiert einzureichen und
            faktenbasiert zu diskutieren. So bleibt die VoG-Ausrichtung immer aktuell – getragen von
            Mehrheiten, nicht von Hinterzimmern.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {duet.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-transparent bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-[1px] shadow-[0_15px_45px_rgba(15,23,42,0.08)]"
            >
              <div className="rounded-[calc(1rem-1px)] bg-white/95 p-4">
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-700">{item.body}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Für wen ist das?</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Der einfachste Einstieg – ein Beispiel</h2>
          <p className="text-sm text-slate-700">
            „Sicherer Schulweg“: Eine Mutter schlägt vor, vor der Schule Tempo 30 ganztägig einzuführen.
            Wir zerlegen das Anliegen in prüfbare Aussagen (Unfalllage, Verkehrsfluss, Alternativen), sammeln
            Quellen und zeigen Gegenpositionen. Danach entscheidet die Gemeinschaft – mit klaren Regeln.
          </p>
        </section>

        <section id="edebatte" className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">eDebatte – so läuft es</h2>
          <p className="text-sm text-slate-700">
            Die Plattform führt dich Schritt für Schritt: Anliegen einreichen, Fakten sichtbar machen, fair abstimmen,
            Umsetzung begleiten. Jeder Schritt folgt denselben Regeln – egal ob lokale Schule oder bundesweite Vorlage.
          </p>
          <ol className="list-decimal space-y-2 pl-6 text-sm text-slate-700">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Warum das einzigartig ist</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>
              <strong>Transparente Struktur:</strong> Anliegen werden sauber aufbereitet – maschinen- und menschenlesbar.
            </li>
            <li>
              <strong>Neutrale Verfahren:</strong> Öffentliche Regeln, Audit-Trail, Reproduzierbarkeit.
            </li>
            <li>
              <strong>Journalismus von Beginn an:</strong> Dossiers, Embeds & Exporte – lokal bis investigativ.
            </li>
            <li>
              <strong>Regionale Legitimität:</strong> Entscheidungen lassen sich auf Gemeinden, Kreise oder Länder begrenzen.
            </li>
          </ul>
        </section>

        <section id="evidenz" className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Evidenz-Graph & Fact-Checking – in Alltagssprache</h2>
          <p className="text-sm text-slate-700">
            Jede Aussage, jeder Beleg und jede Entscheidung hängen zusammen. Der Evidenz-Graph zeigt diese
            Verbindung als leicht lesbares Netz. Pfeile zeigen, worauf sich etwas stützt, Farben markieren den
            Typ der Information.
          </p>
          <div className="rounded-3xl border border-transparent bg-gradient-to-br from-white via-slate-50 to-sky-50 p-[1px] shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <div className="rounded-[calc(1.5rem-1px)] bg-white/95 p-4">
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
              {evidenceLegend.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
                  style={{ borderColor: item.color, color: item.color }}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {evidenceLegend.map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/70 p-4 text-sm text-slate-700"
                  style={{ borderColor: item.color + "33" }}
                >
                  <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
                  <p className="mt-1">{item.explainer}</p>
                </article>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-600">
              Die Community prüft Auffälligkeiten gemeinsam mit Kurator:innen sowie verifizierten Expert:innen.
              Jede Korrektur bleibt sichtbar – nichts wird nachträglich gelöscht.
            </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Fact-Checking & Trust-Score – Alltagssprache</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Wer prüft? Community, Kurator:innen und verifizierte Expert:innen.</li>
            <li>Was misst der Trust-Score? Mischung aus Quellenqualität, Plausibilität und Konsensbreite.</li>
            <li>Fehlerkultur: Korrekturen bleiben sichtbar, nichts wird versteckt.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Warum das fair ist</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Gleiche Regeln für Darstellung von Pro & Contra.</li>
            <li>Geheime Stimmabgabe; öffentlich sind nur Aggregate.</li>
            <li>Offene Methodik – keine nachträglichen Anpassungen.</li>
            <li>Minderheitenbericht gehört zum Standard.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Regeln – kurz & klar</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Quorum (Standard): 10 % der stimmberechtigten Einheit.</li>
            <li>Mehrheiten: Grundordnung/hohe Budgets → 2/3; Operatives → einfache Mehrheit.</li>
            <li>Bindungswirkung: intern verbindlich; extern adressieren wir zuständige Stellen mit Begründung.</li>
            <li>Barrierearm: klare Sprache, mobil-tauglich, symmetrische Darstellung.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Nach der Abstimmung</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Mandat & Zuständigkeit: Wer setzt um? Mit welchen Partnern?</li>
            <li>Plan: Meilensteine, Budget, Risiken – öffentlich trackbar.</li>
            <li>Wirkung: Kennzahlen & Lerneffekte fließen in die nächste Vorlage ein.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Journalistische Einbindung</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Journalism Charter – klar geregelt.</li>
            <li>Offene Dossiers & Embeds; Quellenketten stets verlinkt.</li>
            <li>Trennung Faktenlage (System) vs. Bewertung (redaktionell) – volle Unabhängigkeit.</li>
            <li>Exports: CSV/JSON ohne Re-Identifikation – methodische Hinweise inklusive.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Ausblick – Wirkung & Vertrauens-Score 2.0</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Impact-Dashboards zeigen Beteiligung & Wirkung über Zeit.</li>
            <li>Trust-Score 2.0: graphbasierte Maße (Quellgüte, Widersprüche, Korrekturen, Community-Review).</li>
            <li>Replikations-Kits: geprüfte Skripte/Daten für externe Nachrechnungen.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Mitmachen</h2>
          <div className="flex flex-wrap gap-3">
            <a href="/statements/new" className="btn bg-brand-grad text-white shadow-soft">
              Anliegen einreichen
            </a>
            <a href="/mitglied-werden" className="btn border border-slate-300 bg-white">
              Mitglied werden
            </a>
            <a href="/team" className="btn border border-slate-300 bg-white">
              Bewirb dich fürs Team
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
