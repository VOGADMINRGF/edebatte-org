import React, { useMemo } from "react";

export type StatementVote = "approve" | "neutral" | "reject";

export type StatementCardProps = {
  statementId: string;
  text: string;
  title?: string;
  mainCategory?: string;
  jurisdiction?: string;
  topic?: string;
  tags?: string[];
  currentVote?: StatementVote | null;
  onVoteChange?: (vote: StatementVote) => void;
  showQualityMetrics?: boolean;
  showVoteButtons?: boolean;
  quality?: {
    precision?: number;
    testability?: number;
    readability?: number;
    balance?: number;
  } | null;
  source?: "ai" | "user" | "editor";
  variant?: "swipe" | "analyze";
  className?: string;
  isActive?: boolean;
  flashDecision?: StatementVote | null;
  onOpenDetails?: () => void;
  onOpenEventualities?: () => void;
  showOpenLink?: boolean;
  badgeRight?: string;
  metaRight?: string;
  children?: React.ReactNode;
};

const badgeBase = "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]";

export function StatementCard({
  statementId,
  text,
  title,
  mainCategory,
  jurisdiction,
  topic,
  tags = [],
  currentVote = null,
  onVoteChange,
  showQualityMetrics,
  quality,
  source,
  variant = "analyze",
  className = "",
  isActive,
  flashDecision = null,
  onOpenDetails,
  onOpenEventualities,
  showOpenLink,
  badgeRight,
  metaRight,
  children,
  showVoteButtons = true,
}: StatementCardProps) {
  const voteButtons = useMemo(
    () => [
      { id: "reject" as StatementVote, label: "Ablehnen", icon: "👎", activeClass: "border-rose-500/60 bg-rose-50 text-rose-800" },
      { id: "neutral" as StatementVote, label: "Neutral", icon: "😐", activeClass: "border-sky-400/70 bg-sky-50 text-sky-800" },
      { id: "approve" as StatementVote, label: "Zustimmen", icon: "👍", activeClass: "border-emerald-500/60 bg-emerald-50 text-emerald-800" },
    ],
    [],
  );

  const cardTone =
    variant === "swipe"
      ? isActive
        ? "ring-sky-200 shadow-[0_20px_60px_rgba(14,116,144,0.25)]"
        : "ring-slate-100 shadow-[0_18px_55px_rgba(15,23,42,0.08)]"
      : "ring-slate-100 shadow-sm";

  return (
    <article
      className={`relative flex flex-col gap-3 rounded-3xl bg-white/95 p-4 ring-1 transition ${cardTone} ${className}`}
      aria-label={`Statement ${statementId}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            {mainCategory ?? "Statement"}
          </p>
          <h2 className="text-sm font-semibold text-slate-900">{title || text.slice(0, 80) || "Statement"}</h2>
          <div className="h-0.5 w-10 rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 opacity-70" />
          {topic && <p className="text-[11px] text-slate-500">{topic}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {jurisdiction && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
              {jurisdiction}
            </span>
          )}
          {metaRight && <p className="text-[10px] text-slate-400">{metaRight}</p>}
          {showOpenLink && onOpenDetails && (
            <button
              type="button"
              onClick={onOpenDetails}
              className="text-[10px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-800"
            >
              Karte öffnen
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {source === "ai" && (
          <span className={`${badgeBase} bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100`}>Vorschlag von KI</span>
        )}
        {badgeRight && <span className={`${badgeBase} bg-slate-50 text-slate-700 ring-1 ring-slate-100`}>{badgeRight}</span>}
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-slate-700 ring-1 ring-slate-100">
            {tag}
          </span>
        ))}
      </div>

      {variant === "analyze" && (
        <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">{text}</div>
      )}

      {children}

      {(showVoteButtons || onOpenEventualities) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showVoteButtons && (
            <div className="flex flex-wrap gap-2">
              {voteButtons.map((opt) => {
                const active = currentVote === opt.id || flashDecision === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onVoteChange?.(opt.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold shadow-sm transition ${
                      active ? opt.activeClass : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {onOpenEventualities && (
            <button
              type="button"
              onClick={onOpenEventualities}
              className="text-[11px] font-semibold text-sky-700 underline-offset-2 hover:underline"
            >
              Varianten ansehen
            </button>
          )}
        </div>
      )}

      {showQualityMetrics && quality && (
        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500">
          <span>
            Präzision: <span className="font-semibold">{quality.precision?.toFixed?.(2) ?? "–"}</span>
          </span>
          <span>
            Prüfbar: <span className="font-semibold">{quality.testability?.toFixed?.(2) ?? "–"}</span>
          </span>
          <span>
            Lesbar: <span className="font-semibold">{quality.readability?.toFixed?.(2) ?? "–"}</span>
          </span>
          <span>
            Balance: <span className="font-semibold">{quality.balance?.toFixed?.(2) ?? "–"}</span>
          </span>
        </div>
      )}
    </article>
  );
}

export default StatementCard;
