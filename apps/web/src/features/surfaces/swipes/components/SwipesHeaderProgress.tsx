type SwipesHeaderProgressProps = {
  swipeCount: number;
  sessionCount: number;
  deckProgressLabel: string;
  goal?: number;
  onOpenSearch: () => void;
  mode?: "idle" | "active";
};

export function SwipesHeaderProgress({
  swipeCount,
  sessionCount,
  deckProgressLabel,
  onOpenSearch,
  mode = "active",
}: SwipesHeaderProgressProps) {
  const isActive = mode === "active";

  return (
    <header className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 px-3 py-2 backdrop-blur md:bg-[rgb(var(--card))]/95 md:py-3 md:shadow-[0_16px_45px_rgba(2,6,23,0.18)]">
      <div className="pointer-events-none absolute -top-16 right-0 h-32 w-32 rounded-full bg-sky-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="flex items-start justify-between gap-3 text-xs">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Mitmachen</p>
          {isActive ? (
            <>
              <p className="mt-0.5 text-[15px] font-semibold text-[rgb(var(--fg))] md:mt-1 md:text-base">
                Deine nächste Frage
              </p>
              <p className="mt-1 hidden text-[rgb(var(--muted))] sm:block">
                {swipeCount > 0 ? `${swipeCount} beantwortet · ` : ""}{deckProgressLabel}
                {sessionCount > 0 ? ` · heute ${sessionCount}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-[15px] font-semibold text-[rgb(var(--fg))] md:mt-1 md:text-base">
                Schnell mitmachen
              </p>
              <p className="mt-1 hidden text-[rgb(var(--muted))] sm:block">
                Ja, Nein oder Offen – Hintergründe nur, wenn du sie brauchst.
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenSearch}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/60 bg-gradient-to-br from-sky-50 to-cyan-50 text-sky-700 shadow-[0_8px_20px_rgba(14,165,233,0.18)] transition hover:brightness-105 dark:border-sky-400/30 dark:from-sky-500/16 dark:to-cyan-500/10 dark:text-sky-200 md:h-10 md:w-10"
          aria-label="Thema und Bereich auswählen"
        >
          <SearchIcon />
        </button>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
      <path
        d="M11 4a7 7 0 1 0 4.42 12.42l4.08 4.08 1.4-1.4-4.08-4.08A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"
        fill="currentColor"
      />
    </svg>
  );
}
