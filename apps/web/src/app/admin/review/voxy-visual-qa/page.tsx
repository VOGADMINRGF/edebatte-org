import VoxyVisualQaHumanReviewActions from "./VoxyVisualQaHumanReviewActions";

export const dynamic = "force-dynamic";

export default function VoxyVisualQaReviewPage() {
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
          Voxy · interner Review-Checkpoint
        </p>
        <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">200-% Visual QA</h1>
        <p className="max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
          Diese Fläche verbindet den reproduzierbaren 200-%-QA-Artifact mit dem bestehenden
          persistenten Voxy-Reviewpfad. Prüfe die revisionsgebundene Evidence außerhalb dieser
          Seite vollständig und übernimm anschließend exakt die dort ausgewiesene Required decision gate ID.
        </p>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
            <p className="font-semibold text-[rgb(var(--fg))]">1 · Evidence prüfen</p>
            <p className="mt-1 text-[rgb(var(--muted))]">16:9, 9:16 und 1:1 inklusive semantischer 200-%-Crops sichten.</p>
          </div>
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
            <p className="font-semibold text-[rgb(var(--fg))]">2 · Gate binden</p>
            <p className="mt-1 text-[rgb(var(--muted))]">Nur die Gate-ID derselben Revision und desselben Evidence-Key verwenden.</p>
          </div>
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
            <p className="font-semibold text-[rgb(var(--fg))]">3 · Menschlich entscheiden</p>
            <p className="mt-1 text-[rgb(var(--muted))]">Freigeben, Änderungen anfordern oder ablehnen; keine automatische Freigabe.</p>
          </div>
        </div>
      </section>

      <VoxyVisualQaHumanReviewActions />
    </div>
  );
}
