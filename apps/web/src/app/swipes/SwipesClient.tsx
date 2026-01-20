"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EDebattePackage, SwipeItem, Eventuality, SwipeDecision, SwipeFeedFilter } from "@/features/swipes/types";
import StatementCard, { type StatementVote } from "@/components/statements/StatementCard";

/** Fetch-Helper */

async function fetchSwipeFeed(
  filter: SwipeFeedFilter,
  cursor?: string | null,
): Promise<{ items: SwipeItem[]; nextCursor?: string | null }> {
  const res = await fetch("/api/swipes/feed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter, cursor }),
  });
  if (!res.ok) {
    console.error("[swipes] feed failed", res.status);
    return { items: [], nextCursor: null };
  }
  return res.json();
}

async function fetchEventualities(statementId: string): Promise<Eventuality[]> {
  const res = await fetch("/api/swipes/eventualities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statementId }),
  });
  if (!res.ok) {
    console.error("[swipes] eventualities failed", res.status);
    return [];
  }
  const data = (await res.json()) as { statementId: string; eventualities: Eventuality[] };
  return data.eventualities;
}

const mapDecisionToVote = (decision: SwipeDecision): StatementVote => {
  if (decision === "agree") return "approve";
  if (decision === "disagree") return "reject";
  return "neutral";
};

const mapVoteToDecision = (vote: StatementVote): SwipeDecision => {
  if (vote === "approve") return "agree";
  if (vote === "reject") return "disagree";
  return "neutral";
};

async function postSwipeVote(payload: { statementId: string; eventualityId?: string; decision: SwipeDecision }) {
  const res = await fetch("/api/swipes/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("[swipes] vote failed", res.status);
  }
}

/** ------------------------
 * Buttons im eDebatte-CI
 * ----------------------- */

const primaryChipClass =
  "inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_22px_rgba(14,116,144,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200";

const secondaryChipClass =
  "inline-flex items-center rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200";

const subtleTextLinkClass =
  "text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline";

/** ------------------------
 * Haupt-Component
 * ----------------------- */

type SwipesClientProps = {
  edebattePackage: EDebattePackage;
  initialTopic?: string;
  focusStatementId?: string;
  variant?: "full" | "solo";
};

export function SwipesClient({ edebattePackage, initialTopic = "", focusStatementId, variant = "full" }: SwipesClientProps) {
  const [topicQuery, setTopicQuery] = useState(variant === "solo" ? "" : initialTopic);
  const [activeLevel, setActiveLevel] = useState<"ALL" | "Bund" | "Land" | "Kommune" | "EU">("ALL");
  const [selectedSwipe, setSelectedSwipe] = useState<SwipeItem | null>(null);
  const [eventualities, setEventualities] = useState<Eventuality[] | null>(null);
  const [items, setItems] = useState<SwipeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flashDecision, setFlashDecision] = useState<{ id: string; decision: SwipeDecision } | null>(null);
  const [screenFlash, setScreenFlash] = useState<SwipeDecision | null>(null);
  const [lastAction, setLastAction] = useState<{ item: SwipeItem; decision: SwipeDecision; index: number; removed: boolean } | null>(null);

  const isBasic = edebattePackage === "basis" || edebattePackage === "none";
  const isStartOrPro = edebattePackage === "start" || edebattePackage === "pro";
  const isSolo = variant === "solo";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const resp = await fetchSwipeFeed(
        {
          topicQuery: variant === "solo" ? undefined : topicQuery,
          level: activeLevel,
          statementId: focusStatementId,
        },
        null,
      );
      if (!cancelled) {
        setItems(resp.items);
        setActiveIndex(0);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [topicQuery, activeLevel, focusStatementId, variant]);

  const filteredSwipes = useMemo(() => items, [items]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!filteredSwipes.length) return;
      const current = filteredSwipes[activeIndex] ?? filteredSwipes[0];
      if (!current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleDecision(current, "disagree");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleDecision(current, "agree");
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        handleDecision(current, "neutral");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [filteredSwipes, activeIndex]);

  const handleOpenEventualities = async (item: SwipeItem) => {
    setSelectedSwipe(item);
    const evts = await fetchEventualities(item.id);
    // leichte Durchmischung, damit Varianten nicht immer in gleicher Reihenfolge kommen
    const shuffled = [...evts].sort(() => Math.random() - 0.5);
    setEventualities(shuffled);
  };

  const handleCloseEventualities = () => {
    setSelectedSwipe(null);
    setEventualities(null);
  };

  const handleDecision = (item: SwipeItem, decision: SwipeDecision) => {
    setFlashDecision({ id: item.id, decision });
    setScreenFlash(decision);
    postSwipeVote({ statementId: item.id, decision }).catch(() => {});
    const shouldRemove = isBasic;
    const idx = filteredSwipes.findIndex((s) => s.id === item.id);
    setLastAction({ item, decision, index: idx >= 0 ? idx : 0, removed: shouldRemove });
    if (shouldRemove) {
      setTimeout(() => {
        setItems((prev) => prev.filter((s) => s.id !== item.id));
        setFlashDecision(null);
        if (idx >= 0) {
          const next = Math.min(idx, Math.max(filteredSwipes.length - 2, 0));
          setActiveIndex(next);
        }
      }, 250);
    } else {
      setTimeout(() => setFlashDecision(null), 250);
    }
    setTimeout(() => setScreenFlash(null), 320);
  };

  const handleUndo = () => {
    if (!lastAction) return;
    if (lastAction.removed) {
      setItems((prev) => {
        const next = [...prev];
        const insertIndex = Math.min(lastAction.index, next.length);
        next.splice(insertIndex, 0, lastAction.item);
        return next;
      });
      setActiveIndex(Math.min(lastAction.index, Math.max(items.length, 0)));
    }
    setFlashDecision(null);
    setScreenFlash(null);
    setLastAction(null);
  };

  return (
    <div className={`mx-auto flex flex-col gap-6 px-4 pt-10 ${isSolo ? "max-w-3xl" : "max-w-6xl"}`}>
      {screenFlash && (
        <div
          className={`pointer-events-none fixed inset-0 z-40 transition-opacity duration-200 ${
            screenFlash === "agree"
              ? "bg-emerald-200/40"
              : screenFlash === "disagree"
              ? "bg-rose-200/40"
              : "bg-sky-200/35"
          }`}
        />
      )}

      {isSolo ? (
        <SoloHeader statementId={focusStatementId} />
      ) : (
        <>
          <SwipesHeader edebattePackage={edebattePackage} isBasic={isBasic} isStartOrPro={isStartOrPro} />
          <SwipesToolbar topicQuery={topicQuery} onTopicChange={setTopicQuery} activeLevel={activeLevel} onLevelChange={setActiveLevel} isBasic={isBasic} />
        </>
      )}

      {isSolo ? (
        <div className="relative space-y-3">
          {lastAction && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                ↩︎ Swipe rückgängig
              </button>
            </div>
          )}
          {loading ? (
            <div className="rounded-3xl bg-slate-50/80 p-4 text-sm text-slate-500 ring-1 ring-dashed ring-slate-200">Lade Swipes …</div>
          ) : filteredSwipes.length === 0 ? (
            <EmptyState
              message="Diese Swipe-Karte wurde nicht gefunden oder ist nicht freigeschaltet."
              ctaHref="/swipes"
              ctaLabel="Alle Swipes öffnen"
            />
          ) : (
            filteredSwipes.map((item, idx) => (
              <StatementCard
                key={item.id}
                variant="swipe"
                statementId={item.id}
                title={item.title}
                text={
                  item.title ??
                  (item as any).summary ??
                  (item as any).text ??
                  (item as any).statement?.text ??
                  (item as any).claim?.text ??
                  (item as any).eventuality?.text ??
                  ""
                }
                mainCategory={item.category}
                jurisdiction={item.level}
                topic={item.domainLabel}
                tags={item.topicTags}
                currentVote={flashDecision?.id === item.id ? mapDecisionToVote(flashDecision.decision) : null}
                flashDecision={flashDecision?.id === item.id ? mapDecisionToVote(flashDecision.decision) : null}
                onVoteChange={(vote) => handleDecision(item, mapVoteToDecision(vote))}
                className={idx === activeIndex ? "ring-2 ring-sky-200" : ""}
                isActive={idx === activeIndex}
                onOpenEventualities={
                  item.hasEventualities && !isBasic ? () => handleOpenEventualities(item) : undefined
                }
                badgeRight={item.evidenceCount ? `${item.evidenceCount} Belege` : undefined}
              />
            ))
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.5fr)]">
          <div className="space-y-3 relative">
            {lastAction && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUndo}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)] hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  ↩︎ Swipe rückgängig
                </button>
              </div>
            )}
            {loading ? (
              <div className="rounded-3xl bg-slate-50/80 p-4 text-sm text-slate-500 ring-1 ring-dashed ring-slate-200">Lade Swipes …</div>
            ) : filteredSwipes.length === 0 ? (
              <EmptyState />
            ) : (
              filteredSwipes.map((item, idx) => (
                <StatementCard
                  key={item.id}
                  variant="swipe"
                  statementId={item.id}
                  title={item.title}
                  text={
                    item.title ??
                    (item as any).summary ??
                    (item as any).text ??
                    (item as any).statement?.text ??
                    (item as any).claim?.text ??
                    (item as any).eventuality?.text ??
                    ""
                  }
                  mainCategory={item.category}
                  jurisdiction={item.level}
                  topic={item.domainLabel}
                  tags={item.topicTags}
                  currentVote={flashDecision?.id === item.id ? mapDecisionToVote(flashDecision.decision) : null}
                  flashDecision={flashDecision?.id === item.id ? mapDecisionToVote(flashDecision.decision) : null}
                  onVoteChange={(vote) => handleDecision(item, mapVoteToDecision(vote))}
                  className={idx === activeIndex ? "ring-2 ring-sky-200" : ""}
                  isActive={idx === activeIndex}
                  onOpenEventualities={
                    item.hasEventualities && !isBasic ? () => handleOpenEventualities(item) : undefined
                  }
                  badgeRight={item.evidenceCount ? `${item.evidenceCount} Belege` : undefined}
                />
              ))
            )}
          </div>

          <div className="mt-3 hidden md:block">
            <EventualitiesPanel selectedSwipe={selectedSwipe} eventualities={eventualities} isBasic={isBasic} />
          </div>
        </div>
      )}

      {selectedSwipe && eventualities && (
        <MobileEventualitiesOverlay selectedSwipe={selectedSwipe} eventualities={eventualities} isBasic={isBasic} onClose={handleCloseEventualities} />
      )}
    </div>
  );
}

/** Header / Hero */

function SoloHeader({ statementId }: { statementId?: string }) {
  return (
    <header className="flex items-center justify-between gap-3 rounded-3xl bg-white/95 px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <Link href="/swipes" className={secondaryChipClass}>
        Alle Swipes anzeigen
      </Link>
      {statementId && <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Karte #{statementId}</span>}
    </header>
  );
}

type SwipesHeaderProps = {
  edebattePackage: EDebattePackage;
  isBasic: boolean;
  isStartOrPro: boolean;
};

function SwipesHeader({ edebattePackage, isBasic, isStartOrPro }: SwipesHeaderProps) {
  const pkgLabel =
    edebattePackage === "basis"
      ? "eDebatte Basis"
      : edebattePackage === "start"
      ? "eDebatte Start"
      : edebattePackage === "pro"
      ? "eDebatte Pro"
      : "ohne eDebatte-Paket";

  return (
    <header className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">Swipes</p>
      <h1 className="text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">
        <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">Swipes</span> – schnelle, faire Entscheidungen.
      </h1>
      <p className="max-w-2xl text-sm text-slate-600">Links/rechts entscheiden, Quellen prüfen, später vertiefen – die Karten können aus deinen Analysen oder aktuellen Themen gespeist werden.</p>
      <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
        <span>
          Aktiver Modus: <span className="font-semibold text-slate-800">{pkgLabel}</span>
        </span>
        {isBasic && <span>· Du siehst einen offenen Stream. In eDebatte Start kannst du gezielt nach Themen suchen und Varianten vergleichen.</span>}
        {isStartOrPro && <span>· Nutze Suche &amp; Filter, um Themen wie <em>„Badeverbot Hunde“</em> oder <em>„Pflegepersonal“</em> zu vertiefen.</span>}
      </p>
      <p className="text-[11px] text-slate-500">
        Eventualitäten stehen dir in eDebatte Start und Pro vollständig zur Verfügung.
      </p>
      <p className="text-[11px] text-slate-500">
        Hinweis: Links = Ablehnen, Rechts = Zustimmen, Pfeil hoch oder Tippen = Neutral. Nach jedem Swipe kannst du kurz rückgängig machen.
      </p>
    </header>
  );
}

/** Toolbar */

type SwipesToolbarProps = {
  topicQuery: string;
  onTopicChange: (value: string) => void;
  activeLevel: "ALL" | "Bund" | "Land" | "Kommune" | "EU";
  onLevelChange: (value: "ALL" | "Bund" | "Land" | "Kommune" | "EU") => void;
  isBasic: boolean;
};

function SwipesToolbar({ topicQuery, onTopicChange, activeLevel, onLevelChange, isBasic }: SwipesToolbarProps) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:flex-row md:items-center md:justify-between md:p-4">
      <div className="flex-1">
        <label className="block text-[11px] font-medium text-slate-700">Thema oder Stichwort</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="text"
            value={topicQuery}
            onChange={(e) => onTopicChange(e.target.value)}
            placeholder={isBasic ? "Themensuche in eDebatte Start freischalten …" : "z.B. Badeverbot Hunde, Pflegepersonal, Klimaschutz"}
            disabled={isBasic}
            className={`w-full rounded-full border px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 ${
              isBasic ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : "border-slate-200 bg-slate-50 hover:bg-white"
            }`}
          />
          {isBasic ? (
            <Link href="/mitglied-werden" className={primaryChipClass}>
              Themensuche in eDebatte Start freischalten
            </Link>
          ) : (
            <Link href="/swipes/saved" className={secondaryChipClass}>
              Gespeicherte Suchen
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
        <span className="text-[11px] font-medium text-slate-700">Ebene:</span>
        {["ALL", "Kommune", "Land", "Bund", "EU"].map((level) => {
          const isActive = activeLevel === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onLevelChange(level as SwipesToolbarProps["activeLevel"])}
              className={
                isActive
                  ? "inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm"
                  : "inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-200"
              }
            >
              {level === "ALL" ? "Alle" : level}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Eventualitäten-Panel (Desktop) */

type EventualitiesPanelProps = {
  selectedSwipe: SwipeItem | null;
  eventualities: Eventuality[] | null;
  isBasic: boolean;
};

function EventualitiesPanel({ selectedSwipe, eventualities, isBasic }: EventualitiesPanelProps) {
  if (!selectedSwipe) {
    return (
      <aside className="rounded-3xl bg-slate-900 text-slate-50 p-4 shadow-[0_22px_65px_rgba(15,23,42,0.65)] ring-1 ring-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Eventualitäten</p>
        <h3 className="mt-2 text-sm font-semibold text-white">Varianten zu deinen Swipes</h3>
        <p className="mt-2 text-[11px] text-slate-300">Wähle links eine Karte mit Eventualitäten aus, um alternative Vorschläge und Varianten zu sehen.</p>
        {isBasic && <p className="mt-3 text-[11px] text-slate-400">In eDebatte Start kannst du verschiedene Varianten direkt gegeneinander abwägen und bewerten.</p>}
      </aside>
    );
  }

  if (!eventualities || eventualities.length === 0) {
    return (
      <aside className="rounded-3xl bg-slate-900 text-slate-50 p-4 shadow-[0_22px_65px_rgba(15,23,42,0.65)] ring-1 ring-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Eventualitäten</p>
        <h3 className="mt-2 text-sm font-semibold text-white">{selectedSwipe.title}</h3>
        <p className="mt-2 text-[11px] text-slate-300">Für dieses Statement sind noch keine Eventualitäten erfasst.</p>
      </aside>
    );
  }

  return (
    <aside className="rounded-3xl bg-slate-900 text-slate-50 p-4 shadow-[0_22px_65px_rgba(15,23,42,0.65)] ring-1 ring-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Eventualitäten</p>
      <h3 className="mt-2 text-sm font-semibold text-white">Varianten zu:</h3>
      <p className="mt-1 text-[11px] text-slate-200">{selectedSwipe.title}</p>

      <div className="mt-3 space-y-2">
        {eventualities.map((evt) => (
          <EventualityRow key={evt.id} eventuality={evt} statementId={selectedSwipe.id} />
        ))}
      </div>

      <p className="mt-3 text-[10px] text-slate-400">Du kannst jede Eventualität separat bewerten. Später können daraus konkrete Szenarien und Beschlussvarianten gebaut werden.</p>
      {isBasic && (
        <p className="mt-2 text-[10px] text-slate-400">
          In eDebatte Start fließen deine Bewertungen direkt in Entscheidungsvarianten ein. <Link href="/mitglied-werden" className="underline">
            Mehr zu eDebatte Start
          </Link>
        </p>
      )}
    </aside>
  );
}

type EventualityRowProps = {
  eventuality: Eventuality;
  statementId: string;
};

function EventualityRow({ eventuality, statementId }: EventualityRowProps) {
  const handleDecision = (decision: SwipeDecision) => {
    postSwipeVote({ statementId, eventualityId: eventuality.id, decision }).catch(() => {});
  };

  return (
    <div className="rounded-2xl bg-slate-800/70 p-2 text-[11px]">
      <p className="font-medium text-slate-50">{eventuality.shortLabel ?? eventuality.title}</p>
      {eventuality.shortLabel && <p className="mt-0.5 text-[10px] text-slate-300">{eventuality.title}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => handleDecision("agree")}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
        >
          Variante gut
        </button>
        <button
          type="button"
          onClick={() => handleDecision("neutral")}
          className="inline-flex flex-[0.9] items-center justify-center rounded-full bg-slate-700 px-2 py-1 text-[10px] font-semibold text-slate-50 hover:bg-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          Unentschieden
        </button>
        <button
          type="button"
          onClick={() => handleDecision("disagree")}
          className="inline-flex flex-1 items-center justify-center rounded-full bg-rose-500/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
        >
          Variante ablehnen
        </button>
      </div>
    </div>
  );
}

/** Mobile-Overlay */

type MobileEventualitiesOverlayProps = {
  selectedSwipe: SwipeItem;
  eventualities: Eventuality[];
  isBasic: boolean;
  onClose: () => void;
};

function MobileEventualitiesOverlay({ selectedSwipe, eventualities, isBasic, onClose }: MobileEventualitiesOverlayProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-900/40 px-2 pb-4 backdrop-blur-sm md:hidden">
      <div className="w-full max-h-[75vh] rounded-3xl bg-slate-900 p-4 text-slate-50 shadow-[0_32px_90px_rgba(15,23,42,0.6)] ring-1 ring-slate-700">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Eventualitäten</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            ✕
          </button>
        </div>
        <p className="text-[11px] text-slate-200">{selectedSwipe.title}</p>
        {isBasic && <p className="mt-2 text-[11px] text-slate-400">In eDebatte Start kannst du verschiedene Varianten direkt gegeneinander abwägen. Aktuell siehst du nur eine Vorschau.</p>}
        <div className="mt-3 space-y-2 overflow-y-auto pr-1">
          {eventualities.map((evt) => (
            <EventualityRow key={evt.id} eventuality={evt} statementId={selectedSwipe.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Empty State */

function EmptyState({ message, ctaHref, ctaLabel }: { message?: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="rounded-3xl bg-slate-50/80 p-4 text-sm text-slate-500 ring-1 ring-dashed ring-slate-200">
      {message ?? "Aktuell gibt es zu deiner Auswahl keine Swipes. Probiere einen anderen Suchbegriff, eine andere Ebene – oder entdecke neue Themen auf der Startseite."}
      {ctaHref && ctaLabel && (
        <div className="mt-2">
          <Link href={ctaHref} className="text-[11px] font-semibold text-sky-700 underline-offset-2 hover:underline">
            {ctaLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
