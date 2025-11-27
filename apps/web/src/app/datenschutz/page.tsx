export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 space-y-10">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl font-bold text-coral">Datenschutz</h1>
        <p className="text-lg text-gray-700">
          VoiceOpenGov ist eine Initiative – keine Partei, kein Verein und keine Stiftung. Wir behandeln
          personenbezogene Daten so sparsam wie möglich und passen diese Hinweise laufend an die rechtliche
          Prüfung an.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Welche Daten wir verarbeiten</h2>
        <ul className="list-disc space-y-2 pl-6 text-gray-700">
          <li>
            <strong>Account:</strong> Basisangaben wie E-Mail, Login-Informationen, optionale Profilfelder.
          </li>
          <li>
            <strong>Nutzung:</strong> Log- und Telemetriedaten für Stabilität und Sicherheit.
          </li>
          <li>
            <strong>Abstimmung &amp; Beteiligung:</strong> Stimmen, Beiträge, Kontextkarten und Bewertungen.
          </li>
          <li>
            <strong>Inhalte:</strong> Texte, Dateien und Metadaten, die du übermittelst.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Cookies und Einwilligungen</h2>
        <p className="text-gray-700">
          Wir unterscheiden zwischen essentiellen Cookies (Login, Sicherheit, Lastverteilung) und optionalen
          Cookies für Analyse oder Komfort. Details und Links findest du auch im Cookie-Banner. Für sensible
          öffentliche Formulare (z. B. Updates, Beiträge) nutzen wir HumanCheck-Token, um Missbrauch zu
          verhindern.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">KI- und API-Nutzung</h2>
        <p className="text-gray-700">
          Wir setzen ausgewählte KI-Provider ein, um Texte zu analysieren, zu strukturieren oder zu übersetzen.
          Details findest du unter <a className="text-coral underline" href="/ki-nutzung">/ki-nutzung</a>. KI
          trifft keine Entscheidungen allein; Guardrails und Prüfungen folgen den Prinzipien aus E150/E200.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Deine Rechte</h2>
        <p className="text-gray-700">
          Du kannst Auskunft, Berichtigung oder Löschung deiner Daten verlangen. Wende dich dafür an die unten
          genannte Kontaktadresse. Wir prüfen jedes Anliegen so schnell wie möglich.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">Kontakt</h2>
        <p className="text-gray-700">
          VoiceOpenGov Initiative<br />
          Kontakt-E-Mail: <a className="text-coral underline" href="mailto:privacy@voiceopengov.org">privacy@voiceopengov.org</a>
        </p>
        <p className="text-gray-700">
          Diese Hinweise werden laufend aktualisiert und rechtlich geprüft. Wenn etwas unklar ist, melde dich
          bitte direkt bei uns.
        </p>
      </section>
    </main>
  );
}
