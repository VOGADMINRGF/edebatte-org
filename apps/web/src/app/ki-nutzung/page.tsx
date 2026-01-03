export default function KiNutzungPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 space-y-10">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl font-bold text-coral">KI-Nutzung</h1>
        <p className="text-lg text-gray-700">
          Wir setzen ausgewählte KI-Dienste ein, um Inhalte verständlich und fair aufzubereiten. Diese
          Übersicht zeigt, welche Anbieter eingebunden sind und nach welchen Prinzipien wir sie nutzen.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Eingesetzte Provider</h2>
        <p className="text-gray-700">
          Aktuell nutzen wir unter anderem Modelle von OpenAI, Anthropic, Mistral und – wo verfügbar – Gemini.
          Die konkrete Liste kann sich ändern, wenn wir bessere oder sicherere Alternativen finden.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Wofür wir KI einsetzen</h2>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>Analyse und Strukturierung von Beiträgen, Kontextkarten und Stellungnahmen.</li>
          <li>Übersetzungen und sprachliche Vereinheitlichung.</li>
          <li>Erklär- und Kontextkarten, damit Inhalte schneller verständlich werden.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Leitplanken</h2>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>Grundsatz: minimale personenbezogene Daten und transparente Dokumentation.</li>
          <li>Klare Schutzregeln gegen Missbrauch; sensible Felder werden maskiert oder entfernt.</li>
          <li>KI-Ergebnisse werden geprüft – Entscheidungen treffen Menschen, nicht Modelle.</li>
        </ul>
        <p className="text-gray-700">
          Weitere Hinweise zu Datenverarbeitung, Cookies und Rechten findest du unter
          <a className="text-coral underline" href="/datenschutz"> /datenschutz</a>.
        </p>
      </section>
    </main>
  );
}
