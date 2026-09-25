import Link from "next/link";
import type { Eventuality, SwipeItem } from "@/features/swipes/types";

type SwipeDetailSheetProps = {
  open: boolean;
  item: SwipeItem | null;
  eventualities: Eventuality[] | null;
  loadingEventualities: boolean;
  dossierHref: string | null;
  evidenceHref: string | null;
  votesHref: string | null;
  onClose: () => void;
};

export function SwipeDetailSheet({
  open,
  item,
  eventualities,
  loadingEventualities,
  dossierHref,
  evidenceHref,
  votesHref: _votesHref,
  onClose,
}: SwipeDetailSheetProps) {
  if (!open || !item) return null;

  const contextHref = typeof item.contextHref === "string" ? item.contextHref : null;
  const contextLabel = contextHref?.startsWith("/runden")
    ? "Zum Thema"
    : contextHref?.startsWith("/create")
      ? "Etwas ergänzen"
      : contextHref
        ? "Zum Zusammenhang"
        : null;
  const shortContext = resolveShortContext(item.text);

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Mehr erfahren schließen" onClick={onClose} className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
      <section className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_-24px_60px_rgba(2,6,23,0.45)] md:left-1/2 md:bottom-6 md:max-h-[86vh] md:w-[760px] md:-translate-x-1/2 md:rounded-3xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_100%_0%,rgba(14,165,233,0.11),rgba(15,23,42,0)_45%)]" />
        <header className="relative flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Mehr erfahren</p>
            <h3 className="text-xl font-semibold text-[rgb(var(--fg))]">{item.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="vog-chip">Zurück zur Frage</button>
        </header>

        <article className="relative mt-5 rounded-2xl border border-sky-300/45 bg-sky-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Kurz erklärt</p>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--fg))]">
            {shortContext || "Hier findest du den wichtigsten Kontext zur Frage. Weitere Perspektiven und Quellen kannst du darunter bei Bedarf öffnen."}
          </p>
          {item.supplyLabel ? (
            <p className="mt-3 text-xs leading-5 text-[rgb(var(--muted))]">
              <span className="font-semibold text-[rgb(var(--fg))]">Warum sehe ich das?</span> {item.supplyLabel}{item.supplyHint ? ` · ${item.supplyHint}` : ""}
            </p>
          ) : null}
        </article>

        <p className="relative mt-4 text-xs leading-5 text-[rgb(var(--muted))]">
          Du entscheidest selbst, wie tief du einsteigen möchtest. Das Meinungsbild anderer zeigen wir hier bewusst nicht vor deiner Entscheidung.
        </p>

        <div className="relative mt-4 space-y-2">
          <details className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[rgb(var(--fg))]">
              <span>Andere Möglichkeiten & offene Folgen</span>
              <span aria-hidden className="text-[rgb(var(--muted))] group-open:rotate-45">+</span>
            </summary>
            {loadingEventualities ? (
              <p className="mt-3 text-sm text-[rgb(var(--muted))]">Lade weitere Perspektiven …</p>
            ) : eventualities && eventualities.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {eventualities.slice(0, 4).map((evt) => (
                  <li key={evt.id} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-3">
                    <p className="text-sm font-semibold text-[rgb(var(--fg))]">{evt.shortLabel || evt.title}</p>
                    {evt.description ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{evt.description}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">Noch keine weiteren Möglichkeiten hinterlegt. Wenn etwas fehlt, kannst du es ergänzen.</p>
            )}
          </details>

          <details className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[rgb(var(--fg))]">
              <span>Quellen</span>
              <span className="text-xs font-normal text-[rgb(var(--muted))]">{item.evidenceCount > 0 ? `${item.evidenceCount} Hinweise` : "noch keine"}</span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
              {item.evidenceCount > 0 ? "Prüfe, worauf sich die Frage und ihre Hintergründe stützen." : "Zu dieser Frage sind noch keine Quellenhinweise hinterlegt."}
            </p>
            {evidenceHref ? <Link href={evidenceHref} className="mt-3 inline-flex vog-chip">Quellen prüfen</Link> : null}
          </details>

          <details className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[rgb(var(--fg))]">
              <span>Was ist noch offen?</span>
              <span className="text-xs font-normal text-[rgb(var(--muted))]">{item.eventualitiesCount > 0 ? `${item.eventualitiesCount} Punkte` : "ergänzbar"}</span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted))]">
              {item.eventualitiesCount > 0 ? "Hier sind weitere Möglichkeiten oder offene Punkte hinterlegt." : "Noch keine offenen Punkte hinterlegt. Fehlende Perspektiven können ergänzt werden."}
            </p>
            {contextHref && contextLabel ? <Link href={contextHref} className="mt-3 inline-flex vog-chip">{contextLabel}</Link> : null}
          </details>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--border))] pt-4">
          <button type="button" onClick={onClose} className="vog-chip vog-chip--active">Zurück & abstimmen</button>
          {dossierHref ? <Link href={dossierHref} className="vog-chip">Vollständigen Hintergrund</Link> : null}
          {contextHref && contextLabel ? <Link href={contextHref} className="vog-chip">Etwas ergänzen</Link> : null}
        </div>
      </section>
    </div>
  );
}

function resolveShortContext(text?: string) {
  const value = text?.trim();
  if (!value) return null;
  const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.slice(0, 2).join(" ");
}
