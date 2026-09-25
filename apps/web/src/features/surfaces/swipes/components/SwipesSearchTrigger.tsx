type ScopeLevel = "ALL" | "Bund" | "Land" | "Kommune" | "EU";
type DiscoverySegment = "mine" | "saved" | "region" | "all";

type SwipesSearchTriggerProps = {
  open: boolean;
  topicQuery: string;
  activeLevel: ScopeLevel;
  activeSegment: DiscoverySegment;
  segmentOptions: Array<{ id: DiscoverySegment; label: string }>;
  onClose: () => void;
  onTopicChange: (value: string) => void;
  onLevelChange: (value: ScopeLevel) => void;
  onSegmentChange: (value: DiscoverySegment) => void;
};

const SCOPE_OPTIONS: Array<{ label: string; value: ScopeLevel }> = [
  { label: "📍 Vor Ort", value: "Kommune" },
  { label: "🇩🇪 Deutschland", value: "Bund" },
  { label: "🇪🇺 Europa", value: "EU" },
  { label: "🌐 Alles", value: "ALL" },
];

const INTERESTS = ["Gesellschaft", "Gesundheit", "Wirtschaft", "Bildung", "Wohnen", "Mobilität", "Klima"];

export function SwipesSearchTrigger({ open, topicQuery, activeLevel, activeSegment, segmentOptions, onClose, onTopicChange, onLevelChange, onSegmentChange }: SwipesSearchTriggerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" onClick={onClose} aria-label="Auswahl schließen" className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" />
      <section className="absolute inset-x-0 top-0 rounded-b-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_24px_60px_rgba(2,6,23,0.35)] md:left-1/2 md:top-8 md:w-[760px] md:-translate-x-1/2 md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">Dein Feed</p>
            <h2 className="mt-1 text-2xl font-bold text-[rgb(var(--fg))]">Wozu möchtest du deine Meinung abgeben?</h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">Wähle etwas aus – oder lass dir einfach Fragen zeigen.</p>
          </div>
          <button type="button" onClick={onClose} className="vog-chip">Fertig</button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => { onSegmentChange("mine"); onTopicChange(""); }} className={activeSegment === "mine" ? "vog-chip vog-chip--active min-h-12" : "vog-chip min-h-12"}>✨ Für mich auswählen</button>
          <button type="button" onClick={() => { onSegmentChange("all"); onTopicChange(""); onLevelChange("ALL"); }} className={activeSegment === "all" && !topicQuery && activeLevel === "ALL" ? "vog-chip vog-chip--active min-h-12" : "vog-chip min-h-12"}>🎲 Überrasch mich</button>
          <button type="button" onClick={() => { onSegmentChange("region"); onTopicChange(""); }} className={activeSegment === "region" ? "vog-chip vog-chip--active min-h-12" : "vog-chip min-h-12"}>📍 In meiner Nähe</button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-[rgb(var(--muted))]">Themen</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTERESTS.map((interest) => <button key={interest} type="button" onClick={() => { onSegmentChange("all"); onTopicChange(interest); }} className={topicQuery === interest ? "vog-chip vog-chip--active" : "vog-chip"}>{interest}</button>)}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-[rgb(var(--muted))]">Wo?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((option) => <button key={option.value} type="button" onClick={() => onLevelChange(option.value)} className={activeLevel === option.value ? "vog-chip vog-chip--active" : "vog-chip"}>{option.label}</button>)}
          </div>
        </div>

        <label className="mt-5 block text-xs font-medium text-[rgb(var(--muted))]">Oder nach einem Thema suchen</label>
        <input type="text" value={topicQuery} onChange={(e) => { onSegmentChange("all"); onTopicChange(e.target.value); }} placeholder="z. B. Pflege, Schule, Miete, Bahn …" className="mt-1 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-3 text-sm text-[rgb(var(--fg))] focus:outline-none focus:ring-2 focus:ring-sky-200" />

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--border))] pt-4">
          <span className="text-xs text-[rgb(var(--muted))]">Weitere Ansichten:</span>
          {segmentOptions.filter((option) => option.id === "saved").map((option) => <button key={option.id} type="button" onClick={() => onSegmentChange(option.id)} className={activeSegment === option.id ? "vog-chip vog-chip--active" : "vog-chip"}>{option.label}</button>)}
          <button type="button" onClick={() => { onTopicChange(""); onLevelChange("ALL"); onSegmentChange("all"); }} className="vog-chip">Auswahl zurücksetzen</button>
        </div>
      </section>
    </div>
  );
}
