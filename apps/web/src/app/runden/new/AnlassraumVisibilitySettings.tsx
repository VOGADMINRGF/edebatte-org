import {
  MANUAL_ANLASSRAUM_SCOPE_CHOICES,
  MANUAL_ANLASSRAUM_VISIBILITY_CHOICES,
  type ManualAnlassraumScope,
  type ManualAnlassraumVisibility,
} from "@/features/surfaces/runden/manualAnlassraumSetup";

type AnlassraumVisibilitySettingsProps = {
  conversionMode?: boolean;
  onScopeChange: (value: ManualAnlassraumScope) => void;
  onVisibilityChange: (value: ManualAnlassraumVisibility) => void;
  scope: ManualAnlassraumScope;
  visibility: ManualAnlassraumVisibility;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function AnlassraumVisibilitySettings(props: AnlassraumVisibilitySettingsProps) {
  return (
    <section className="public-flow-line p-0" data-manual-anlassraum-step="sichtbarkeit">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Schritt 3</p>
      <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">Wer soll mitmachen können?</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
        Dein Entwurf bleibt zunächst unter deiner Kontrolle. Hier legst du fest, für wen die Frage gedacht ist und wann sie sichtbar werden darf.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Für wen?</p>
          <div className="mt-3 space-y-2">
            {MANUAL_ANLASSRAUM_SCOPE_CHOICES.map((choice) => {
              const selected = props.scope === choice.value;
              const description = choice.value === "public"
                ? "Menschen können später über einen freigegebenen Link oder QR-Code teilnehmen."
                : choice.value === "organization_internal"
                  ? "Die Frage bleibt zunächst im Arbeitsbereich deiner Organisation."
                  : "Ein ausgewählter Kreis bereitet die Frage zuerst gemeinsam vor.";
              return (
                <button key={choice.value} type="button" aria-pressed={selected} onClick={() => props.onScopeChange(choice.value)} className={joinClasses("w-full rounded-xl border px-3 py-3 text-left transition", selected ? "border-[rgb(var(--grad-from))]/45 bg-[rgb(var(--card))] text-[rgb(var(--fg))]" : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]")}>
                  <span className="block text-sm font-semibold">{choice.label}</span>
                  <span className="mt-1 block text-xs leading-5">{description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Wann sichtbar?</p>
          <div className="mt-3 space-y-2">
            {MANUAL_ANLASSRAUM_VISIBILITY_CHOICES.map((choice) => {
              const selected = props.visibility === choice.value;
              return (
                <button key={choice.value} type="button" aria-pressed={selected} onClick={() => props.onVisibilityChange(choice.value)} className={joinClasses("w-full rounded-xl border px-3 py-3 text-left transition", selected ? "border-[rgb(var(--grad-from))]/45 bg-[rgb(var(--card))] text-[rgb(var(--fg))]" : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]")}>
                  <span className="block text-sm font-semibold">{choice.label}</span>
                  <span className="mt-1 block text-xs leading-5">{choice.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[rgb(var(--muted))]">Nichts wird durch diese Auswahl automatisch veröffentlicht.</p>
    </section>
  );
}
