import {
  MANUAL_ANLASSRAUM_COMMUNITY_OPTIONS_MODE_CHOICES,
  type ManualAnlassraumCommunityOptionsMode,
} from "@/features/surfaces/runden/manualAnlassraumSetup";

type AnlassraumOptionEditorProps = {
  conversionMode?: boolean;
  communityOptionsMode: ManualAnlassraumCommunityOptionsMode;
  configuredOptionCount: number;
  onAddOption: () => void;
  onCommunityOptionsModeChange: (value: ManualAnlassraumCommunityOptionsMode) => void;
  onOptionChange: (index: number, value: string) => void;
  onRemoveOption: (index: number) => void;
  options: string[];
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function AnlassraumOptionEditor(props: AnlassraumOptionEditorProps) {
  return (
    <section className="public-flow-line p-0" data-manual-anlassraum-step="optionen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Schritt 2</p>
          <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">Antworten</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
            Lege mindestens zwei Antworten fest. Wenn du möchtest, können Teilnehmende später auch eigene Vorschläge ergänzen.
          </p>
        </div>
        <span className="vog-chip">{props.configuredOptionCount} vorbereitet</span>
      </div>

      <div className="public-proof-zone mt-4">
        {props.options.map((option, index) => (
          <div key={`manual-option-${index}`} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`manual-anlassraum-option-${index}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
                Antwort {index + 1}
              </label>
              <button type="button" onClick={() => props.onRemoveOption(index)} disabled={props.options.length <= 2} className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs font-semibold text-[rgb(var(--muted))] transition hover:text-[rgb(var(--fg))] disabled:cursor-not-allowed disabled:opacity-50">
                Entfernen
              </button>
            </div>
            <input id={`manual-anlassraum-option-${index}`} value={option} onChange={(event) => props.onOptionChange(index, event.target.value)} className="mt-2 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" placeholder={index === 0 ? "Zum Beispiel: Ja, jetzt starten" : "Weitere Antwort"} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={props.onAddOption} className="vog-btn-secondary">Weitere Antwort hinzufügen</button>
      </div>

      <details className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-[rgb(var(--fg))]">
          Dürfen andere eigene Antworten vorschlagen? <span className="ml-2 text-[rgb(var(--muted))]">▾</span>
        </summary>
        <div className="border-t border-[rgb(var(--border))] p-3">
          <p className="text-xs leading-5 text-[rgb(var(--muted))]">Du bestimmst, ob die Auswahl fest bleibt oder neue Vorschläge möglich sind.</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {MANUAL_ANLASSRAUM_COMMUNITY_OPTIONS_MODE_CHOICES.map((choice) => {
              const selected = props.communityOptionsMode === choice.value;
              return (
                <button key={choice.value} type="button" aria-pressed={selected} onClick={() => props.onCommunityOptionsModeChange(choice.value)} className={joinClasses("rounded-xl border px-3 py-3 text-left transition", selected ? "border-[rgb(var(--grad-from))]/45 bg-[rgb(var(--card))] text-[rgb(var(--fg))]" : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]")}>
                  <span className="block text-sm font-semibold">{choice.label}</span>
                  <span className="mt-1 block text-xs leading-5">{choice.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </details>
    </section>
  );
}
