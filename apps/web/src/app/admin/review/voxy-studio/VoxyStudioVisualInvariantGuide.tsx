const VISUAL_INVARIANTS = [
  {
    title: "Handanatomie",
    detail:
      "Jede im Preview sichtbar gerenderte Hand muss genau fünf Finger behalten; keine generative oder additive Anatomie-Improvisation akzeptieren.",
    reviewKey: "voxy_presence",
  },
  {
    title: "VOG-Pin",
    detail:
      "Der kanonische VOG-Lapel-Pin muss sichtbar, scharf und an seinem freigegebenen Overlay-Anker bleiben.",
    reviewKey: "brand_fit",
  },
  {
    title: "eDebatte-Pocket-Mark",
    detail:
      "Die eDebatte-Markierung an der Außentasche muss sichtbar, unverzerrt und unabhängig vom Character-Layer erhalten bleiben.",
    reviewKey: "brand_fit",
  },
  {
    title: "Eine kanonische Waveform",
    detail:
      "Genau ein Jarvis-/Broadcast-Signal gehört hinter Voxy. Keine zweite Wellenform oder zusätzliche Signalspur akzeptieren.",
    reviewKey: "brand_fit",
  },
  {
    title: "Keine Logo-/Text-Kollision",
    detail:
      "Die Waveform darf weder die Logo-Zone noch dynamische Headline-, Quellen- oder Caption-Zonen kreuzen.",
    reviewKey: "brand_fit",
  },
] as const;

export default function VoxyStudioVisualInvariantGuide() {
  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
          Voxy · Sichtbare Canon-Checks
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
          Brand- und Anatomieprüfung im Human Preview Review
        </h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
          Diese Liste behauptet keinen automatischen Pass. Sie konkretisiert die bereits persistenten
          Review-Punkte <code>brand_fit</code> und <code>voxy_presence</code>. Der Mensch prüft die
          Punkte am exakt gebundenen privaten #568-Preview und speichert anschließend die bestehende
          Preview-Review-Entscheidung.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {VISUAL_INVARIANTS.map((check) => (
          <article
            key={check.title}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-[rgb(var(--fg))]">{check.title}</p>
              <code className="rounded bg-[rgb(var(--card))] px-2 py-1 text-[10px] text-[rgb(var(--muted))]">
                {check.reviewKey}
              </code>
            </div>
            <p className="mt-2 text-sm leading-5 text-[rgb(var(--muted))]">{check.detail}</p>
          </article>
        ))}
      </div>

      <p className="text-xs leading-5 text-[rgb(var(--muted))]">
        Zusätzlich bleibt der technische Final-Canon-Contract aktiv: kanonischer Alpha-Head,
        kanonischer Body-Master, keine Legacy-Neck-Plate und keine externen Avatar- oder Lip-Sync-Provider.
        Diese technischen Guards ersetzen die visuelle Human-Prüfung nicht.
      </p>
    </section>
  );
}
