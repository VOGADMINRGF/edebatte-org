import Link from "next/link";

type DecisionStats = { agree: number; neutral: number; disagree: number };

type DecisionHistoryItem = {
  id: string;
  title: string;
  category: string;
  decision: "agree" | "neutral" | "disagree";
  detailHref: string;
};

type SwipesOutcomeSummaryProps = {
  stats: DecisionStats;
  history: DecisionHistoryItem[];
  votesHref?: string;
};

function pickTopCategories(history: DecisionHistoryItem[]) {
  const counts = new Map<string, number>();
  for (const item of history) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([category, count]) => ({ category, count }));
}

function pickQuestionsToRevisit(history: DecisionHistoryItem[]) {
  const open = history.filter((item) => item.decision === "neutral").slice(-2).reverse();
  if (open.length > 0) return open;
  return history.slice(-2).reverse();
}

function buildReflectionHeadline(total: number, topCategories: Array<{ category: string; count: number }>) {
  const dominant = topCategories[0];
  if (dominant && dominant.count >= 3 && dominant.count / total >= 0.5) {
    return `${dominant.category} ist bisher dein stärkster Schwerpunkt.`;
  }
  return `Du hast ${total} Fragen eingeordnet.`;
}

export function SwipesOutcomeSummary({ stats, history, votesHref = "/abstimmungen" }: SwipesOutcomeSummaryProps) {
  const total = stats.agree + stats.neutral + stats.disagree;
  if (total < 5) return null;

  const topCategories = pickTopCategories(history);
  const revisit = pickQuestionsToRevisit(history);
  const headline = buildReflectionHeadline(total, topCategories);

  return (
    <section
      id="swipes-outcome-summary"
      className="scroll-mt-4 rounded-3xl border border-cyan-300/40 bg-[rgb(var(--card))] p-4 shadow-sm md:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">Dein Zwischenstand</p>
      <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--fg))]">{headline}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
        Dein eigenes Bild bleibt im Mittelpunkt. Das Meinungsbild anderer siehst du erst nach deiner Entscheidung.
      </p>

      {topCategories.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {topCategories.map((item) => <span key={item.category} className="vog-chip">{item.category} · {item.count}</span>)}
        </div>
      ) : null}

      {revisit.length > 0 ? (
        <details className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
          <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">Entscheidungen noch einmal ansehen</summary>
          <ul className="mt-3 space-y-2 text-sm">
            {revisit.map((item) => (
              <li key={`${item.id}-${item.decision}`} className="flex items-start justify-between gap-3">
                <span className="line-clamp-2 text-[rgb(var(--fg))]">{item.title}</span>
                <Link href={item.detailHref} className="vog-chip shrink-0 text-[10px]">Details</Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-4">
        <Link href={votesHref} className="vog-chip vog-chip--active">Meinungsbild ansehen</Link>
      </div>
    </section>
  );
}

export type { DecisionHistoryItem };
