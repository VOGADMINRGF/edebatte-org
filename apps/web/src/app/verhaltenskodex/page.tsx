export default function VerhaltenskodexPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <h1 className="text-3xl font-bold text-coral text-center">
        Verhaltenskodex
      </h1>
      <div className="space-y-4 text-gray-700 text-lg">
        <p className="text-center">
          VoiceOpenGov lebt von respektvollem Austausch. Unser Anspruch ist ein
          fairer, sachlicher und sicherer Raum für alle.
        </p>
        <ul className="list-disc pl-6 space-y-2 text-base">
          <li>Respektvoller Umgang – Kritik an Inhalten, nicht an Personen.</li>
          <li>Keine Diskriminierung, keine Beleidigungen, keine Hetze.</li>
          <li>Quellen sauber angeben und Aussagen nachvollziehbar belegen.</li>
          <li>Moderation schützt faire Regeln und greift bei Verstößen ein.</li>
        </ul>
        <p className="text-sm text-slate-600 text-center">
          Für Fragen oder Meldungen erreichst du uns über{" "}
          <a className="text-coral underline" href="/kontakt">
            /kontakt
          </a>
          .
        </p>
      </div>
    </main>
  );
}
