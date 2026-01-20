export default function TeamPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <h1 className="text-3xl font-bold text-coral text-center">Team</h1>
      <div className="space-y-4 text-gray-700 text-lg text-center">
        <p>
          eDebatte wird von einem interdisziplinären Team getragen – mit
          Fokus auf faire Verfahren, klare Regeln und eine verlässliche
          Infrastruktur.
        </p>
        <p>
          Du möchtest mitwirken oder kooperieren? Schreib uns gerne über{" "}
          <a className="text-coral underline" href="/kontakt">
            /kontakt
          </a>
          .
        </p>
      </div>
    </main>
  );
}
