import { PUBLIC_TERMINOLOGY, publicTerminologyText } from "@/features/public/publicTerminology";
import {
  MANUAL_ANLASSRAUM_AI_SUPPORT_MODE_CHOICES,
  type ManualAnlassraumAiSupportMode,
} from "@/features/surfaces/runden/manualAnlassraumSetup";

type AnlassraumSupportSettingsProps = {
  aiSupportMode: ManualAnlassraumAiSupportMode;
  onAiSupportModeChange: (value: ManualAnlassraumAiSupportMode) => void;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function AnlassraumSupportSettings(props: AnlassraumSupportSettingsProps) {
  return (
    <section className="public-flow-line p-0" data-manual-anlassraum-step="unterstuetzung">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Schritt 4</p>
      <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">Möchtest du Unterstützung?</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
        Du kannst alles selbst festlegen oder Voxy um Vorschläge bitten. In beiden Fällen entscheidest du selbst, was übernommen und später geteilt wird.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">{PUBLIC_TERMINOLOGY.withoutVoxy}</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">Selbst festlegen</p>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">Frage und Antworten bleiben genau so, wie du sie eingibst.</p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">{PUBLIC_TERMINOLOGY.withVoxy}</p>
          <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">Vorschläge bekommen</p>
          <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">Voxy kann beim Formulieren helfen oder auf offene Punkte hinweisen. Du entscheidest, was davon passt.</p>
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
        <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-[rgb(var(--fg))]">Unterstützung genauer festlegen <span className="ml-2 text-[rgb(var(--muted))]">▾</span></summary>
        <div className="grid gap-2 border-t border-[rgb(var(--border))] p-3 md:grid-cols-2 xl:grid-cols-4">
          {MANUAL_ANLASSRAUM_AI_SUPPORT_MODE_CHOICES.map((choice) => {
            const selected = props.aiSupportMode === choice.value;
            return (
              <button key={choice.value} type="button" aria-pressed={selected} onClick={() => props.onAiSupportModeChange(choice.value)} className={joinClasses("rounded-xl border px-3 py-3 text-left transition", selected ? "border-[rgb(var(--grad-from))]/45 bg-[rgb(var(--bg))] text-[rgb(var(--fg))]" : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]")}>
                <span className="block text-sm font-semibold">{publicTerminologyText(choice.label)}</span>
                <span className="mt-1 block text-xs leading-5">{publicTerminologyText(choice.description)}</span>
              </button>
            );
          })}
        </div>
      </details>
      <p className="mt-3 text-xs leading-5 text-[rgb(var(--muted))]">Voxy startet nichts automatisch und veröffentlicht nichts selbst.</p>
    </section>
  );
}
