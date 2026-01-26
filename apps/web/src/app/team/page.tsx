export default function TeamPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-3xl px-4 py-16 space-y-8 text-center">
        <h1 className="headline-grad text-3xl font-extrabold md:text-4xl">Team</h1>
        <div className="space-y-4 text-slate-700 text-lg">
        <p>
          eDebatte wird von einem interdisziplinären Team getragen – mit
          Fokus auf faire Verfahren, klare Regeln und eine verlässliche
          Infrastruktur.
        </p>
        <p>
          Du möchtest mitwirken oder kooperieren? Schreib uns gerne über{" "}
          <a className="font-semibold text-sky-700 underline underline-offset-4" href="/kontakt">
            /kontakt
          </a>
          .
        </p>
        </div>
      </section>
    </main>
  );
}
