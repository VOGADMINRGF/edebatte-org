import type { Dossier } from "@features/dossier";
import { getParliamentaryContextTopics } from "./parliamentaryContext";

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "2-digit" });
}

export function ParliamentaryContextPanel({ sources }: { sources: Dossier["sourceSet"] }) {
  const topics = getParliamentaryContextTopics(sources);
  if (!topics.length) return null;

  return (
    <section id="parlamentarischer-kontext" className="space-y-4 border-t border-[rgb(var(--border))] pt-5">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
          Parlamentarischer Kontext · Pilot
        </div>
        <p className="text-xs text-[rgb(var(--muted))]">
          Offizieller Verfahrensstand, dokumentiertes Abstimmungsverhalten und öffentliche Aussagen werden getrennt
          dargestellt. Offene Abstimmungsdaten von abgeordnetenwatch werden als eigener Datenbaustein ausgewiesen;
          Eigenaussagen von Abgeordneten sind keine Faktenbewertung.
        </p>
      </div>

      {topics.map((topic) => (
        <article
          key={topic.id}
          className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">{topic.title}</h3>
              <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">{topic.jurisdiction}</p>
            </div>
            <span className="rounded-full border border-[rgb(var(--border))] px-2 py-1 text-[10px] font-semibold text-[rgb(var(--muted))]">
              Stand {formatDate(topic.updatedAt)}
            </span>
          </div>

          <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Offizieller Verfahrensstand
            </p>
            <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">{topic.procedureStatus}</p>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">{topic.procedureSummary}</p>
          </div>

          {topic.polls.length ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                Dokumentierte Abstimmungen · abgeordnetenwatch Open Data
              </p>
              <div className="grid gap-2">
                {topic.polls.map((poll) => (
                  <div
                    key={poll.id}
                    className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[rgb(var(--fg))]">{poll.title}</p>
                        <p className="mt-0.5 text-[10px] text-[rgb(var(--muted))]">
                          {formatDate(poll.date)} · {poll.outcome}
                        </p>
                      </div>
                      <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[9px] uppercase tracking-wide text-[rgb(var(--muted))]">
                        CC0 1.0
                      </span>
                    </div>
                    <p className="text-xs text-[rgb(var(--fg))]">{poll.overallResult}</p>
                    {poll.germanDelegationResult ? (
                      <p className="text-xs text-[rgb(var(--muted))]">{poll.germanDelegationResult}</p>
                    ) : null}
                    <p className="text-[10px] leading-4 text-[rgb(var(--muted))]">{poll.scopeNote}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold">
                      <a href={poll.url} target="_blank" rel="noreferrer" className="text-[rgb(var(--grad-from))] underline">
                        Abstimmung öffnen ↗
                      </a>
                      <a href={poll.apiUrl} target="_blank" rel="noreferrer" className="text-[rgb(var(--grad-from))] underline">
                        Poll API ↗
                      </a>
                      <a href={poll.votesApiUrl} target="_blank" rel="noreferrer" className="text-[rgb(var(--grad-from))] underline">
                        Einzelstimmen API ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Öffentliche Antworten auf abgeordnetenwatch
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {topic.statements.map((statement) => (
                <a
                  key={`${topic.id}-${statement.actor}-${statement.date}`}
                  href={statement.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 transition hover:shadow-soft"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[rgb(var(--fg))]">{statement.actor}</span>
                    <span className="text-[10px] text-[rgb(var(--muted))]">{formatDate(statement.date)}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[rgb(var(--muted))]">{statement.affiliation}</p>
                  <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">{statement.summary}</p>
                  <span className="mt-2 inline-block text-[10px] font-semibold text-[rgb(var(--grad-from))]">
                    Originalantwort öffnen ↗
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Primär- und Referenzquellen
            </p>
            <ul className="space-y-1.5 text-xs">
              {topic.links.map((link) => (
                <li key={link.url} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-[9px] uppercase tracking-wide text-[rgb(var(--muted))]">
                    {link.kind === "official"
                      ? "amtlich"
                      : link.kind === "position"
                        ? "Organisationsposition"
                        : "abgeordnetenwatch"}
                  </span>
                  <a href={link.url} target="_blank" rel="noreferrer" className="underline text-[rgb(var(--fg))]">
                    {link.label}
                  </a>
                  <span className="text-[10px] text-[rgb(var(--muted))]">
                    {link.publisher} · {formatDate(link.date)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-lg border border-[rgb(var(--border))] px-3 py-2 text-[10px] leading-4 text-[rgb(var(--muted))]">
            {topic.caveat}
          </p>
        </article>
      ))}
    </section>
  );
}

export default ParliamentaryContextPanel;
