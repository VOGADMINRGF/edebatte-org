"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePrivacyGate } from "@/components/privacy/PrivacyGateProvider";
import { buildSwipeDossierHref, buildSwipeEvidenceHref, buildSwipeVotingHref } from "@/features/surfaces/swipes/detailRoutes";
import {
  buildSwipesFeedFilter,
  countFromDraftFocusItems,
  resolveFromDraftArrivalStatus,
  resolveInitialSwipesArrivalMode,
  resolveSwipesArrivalToggle,
  resolveSwipesEmptyStateMessage,
  resolveThematicContextHref,
  shouldShowArrivalContextReminder,
  type SwipesArrivalMode,
} from "@/features/surfaces/swipes/arrival";
import {
  derivePreferredSwipeTopics,
  filterSwipeItemsByDiscoverySegment,
  prioritizeSwipeItemsForCreateSeed,
  SWIPE_DISCOVERY_SEGMENTS,
  type SwipeDiscoverySegment,
} from "@/features/surfaces/swipes/discoveryContract";
import {
  SwipeAuthGate,
  SwipeDetailSheet,
  SwipeEventualitiesStep,
  SwipesHeaderProgress,
  SwipesSearchTrigger,
  SwipeTopicStep,
  SwipesOutcomeSummary,
  type DecisionHistoryItem,
} from "@/features/surfaces/swipes/components";
import { FREE_VOTE_LIMIT, useFreeVoteLimit } from "@/features/surfaces/swipes/useFreeVoteLimit";
import { resolveSwipesProgressState } from "@/features/surfaces/swipes/progressContract";
import type {
  Eventuality,
  SwipeDecision,
  SwipeFeedFilter,
  SwipeItem,
  SwipeNeutralReason,
} from "@/features/swipes/types";
import type { SurfaceAudience, SurfaceMode } from "@/features/surface";
import { buildFreeBallotStartHref } from "@features/pricing/goToMarketPackaging";

const SWIPES_SESSION_COUNT_KEY = "edb_swipes_session_count";
const SWIPES_SAVED_IDS_KEY = "edb_swipes_saved_ids";
const SWIPES_TOPIC_HINTS_KEY = "edb_swipes_topic_hints";

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

type SwipeVotePersistPayload = {
  statementId: string;
  eventualityId?: string;
  decision: SwipeDecision;
  neutralReason?: SwipeNeutralReason;
  variantWeight?: 1 | 3 | 5;
  variantReason?: string;
  variantRankedIds?: string[];
  excludedEventualityIds?: string[];
};

async function postSwipeVote(payload: SwipeVotePersistPayload) {
  const res = await fetch("/api/swipes/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("[swipes] vote failed", res.status);
  }
}

async function deleteSwipeVote(statementId: string) {
  const res = await fetch("/api/swipes/vote", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statementId }),
  });
  if (!res.ok) {
    console.error("[swipes] vote undo failed", res.status);
  }
}

type SwipesClientProps = {
  initialTopic?: string;
  initialClaim?: string;
  initialStance?: string;
  fromCreate?: boolean;
  fromDraftId?: string | null;
  focusStatementId?: string;
  variant?: "full" | "solo";
  mode?: SurfaceMode;
  audience?: SurfaceAudience;
  requireAuthAfterFreeVotes?: boolean;
  showWelcomeHint?: boolean;
};

type LastVoteSnapshot = {
  item: SwipeItem;
  decision: SwipeDecision;
  historyEntry: DecisionHistoryItem;
  prevHint: string | null;
};

export function SwipesClient({
  initialTopic = "",
  initialClaim = "",
  initialStance = "",
  fromCreate = false,
  fromDraftId = null,
  focusStatementId,
  variant = "full",
  mode = "live",
  audience = "none",
  requireAuthAfterFreeVotes = false,
  showWelcomeHint = false,
}: SwipesClientProps) {
  const privacyGate = usePrivacyGate();
  const [topicQuery, setTopicQuery] = useState(variant === "solo" ? "" : initialTopic);
  const [activeLevel, setActiveLevel] = useState<"ALL" | "Bund" | "Land" | "Kommune" | "EU">("ALL");
  const [activeSegment, setActiveSegment] = useState<SwipeDiscoverySegment>("all");
  const [arrivalMode, setArrivalMode] = useState<SwipesArrivalMode>(() => resolveInitialSwipesArrivalMode(fromDraftId));
  const [searchOpen, setSearchOpen] = useState(false);
  const [items, setItems] = useState<SwipeItem[]>([]);
  const [deckSize, setDeckSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [decisionStats, setDecisionStats] = useState({ agree: 0, neutral: 0, disagree: 0 });
  const [decisionHistory, setDecisionHistory] = useState<DecisionHistoryItem[]>([]);
  const [transitionHint, setTransitionHint] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [sessionVoteCount, setSessionVoteCount] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedTopicHints, setSavedTopicHints] = useState<string[]>([]);
  const [lastVote, setLastVote] = useState<LastVoteSnapshot | null>(null);
  const [seededClaimMatchCount, setSeededClaimMatchCount] = useState(0);
  const [seededTopicMatchCount, setSeededTopicMatchCount] = useState(0);

  const [liveMessage, setLiveMessage] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<SwipeItem | null>(null);
  const [detailEventualities, setDetailEventualities] = useState<Eventuality[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [eventualityStepOpen, setEventualityStepOpen] = useState(false);
  const [eventualityStepDecision, setEventualityStepDecision] = useState<SwipeDecision | null>(null);
  const [eventualityStepItem, setEventualityStepItem] = useState<SwipeItem | null>(null);
  const [eventualityStepItems, setEventualityStepItems] = useState<Eventuality[]>([]);
  const [eventualityStepLoading, setEventualityStepLoading] = useState(false);
  const [openGateAfterStep, setOpenGateAfterStep] = useState(false);

  const liveTimerRef = useRef<number | null>(null);
  const pendingVoteTimerRef = useRef<number | null>(null);
  const pendingVotePayloadRef = useRef<SwipeVotePersistPayload | null>(null);

  const isSolo = variant === "solo";
  const isSwipeFocusMode = !isSolo;
  const fromDraftArrivalEnabled = !isSolo && Boolean(fromDraftId);
  const showingFromDraftOnly = fromDraftArrivalEnabled && arrivalMode === "from_draft";
  const seededClaim = initialClaim.trim();
  const seededTopic = initialTopic.trim();
  const hasCreateSeed = fromCreate && (seededClaim.length > 0 || seededTopic.length > 0);
  const [useCreateSeed, setUseCreateSeed] = useState(hasCreateSeed);

  const freeVote = useFreeVoteLimit({
    enabled: requireAuthAfterFreeVotes && mode === "live" && !isSolo,
    limit: FREE_VOTE_LIMIT,
  });
  const isVoteLocked = freeVote.enabled && !freeVote.canVote;
  const swipeProgressCount = Math.max(sessionVoteCount, freeVote.count);
  const progressState = resolveSwipesProgressState({
    swipeCount: swipeProgressCount,
    decisionCount: decisionHistory.length,
    fromDraftMode: showingFromDraftOnly,
  });
  const deckProgressLabel = `${Math.min(completedCount, deckSize)}/${deckSize || 0} im aktuellen Deck`;
  const savedIdsKey = useMemo(() => [...savedIds].sort().join(","), [savedIds]);
  const preferredTopics = useMemo(() => {
    return derivePreferredSwipeTopics({
      savedTopicHints,
      decisionTopicHints: [],
    });
  }, [savedTopicHints]);
  const preferredTopicsKey = useMemo(() => preferredTopics.join("|"), [preferredTopics]);

  const openDossierRoute = useCallback(
    (statementId: string) => buildSwipeDossierHref(statementId, { mode, audience }),
    [audience, mode],
  );

  const openEvidenceRoute = useCallback(
    (statementId: string) => buildSwipeEvidenceHref(statementId, { mode, audience }),
    [audience, mode],
  );

  const openVotesRoute = useCallback(
    (statementId: string, title?: string | null) =>
      buildSwipeVotingHref(statementId, { mode, audience }, { title }),
    [audience, mode],
  );

  const announce = useCallback((message: string) => {
    setLiveMessage(message);
    if (liveTimerRef.current) window.clearTimeout(liveTimerRef.current);
    liveTimerRef.current = window.setTimeout(() => setLiveMessage(""), 1400);
  }, []);

  const flushPendingVote = useCallback(() => {
    const pending = pendingVotePayloadRef.current;
    if (!pending) return;
    if (pendingVoteTimerRef.current) {
      window.clearTimeout(pendingVoteTimerRef.current);
      pendingVoteTimerRef.current = null;
    }
    pendingVotePayloadRef.current = null;
    postSwipeVote(pending).catch(() => {});
  }, []);

  const cancelPendingVote = useCallback(() => {
    if (pendingVoteTimerRef.current) {
      window.clearTimeout(pendingVoteTimerRef.current);
      pendingVoteTimerRef.current = null;
    }
    pendingVotePayloadRef.current = null;
  }, []);

  const queueVotePayload = useCallback(
    (payload: SwipeVotePersistPayload) => {
      if (pendingVotePayloadRef.current) {
        flushPendingVote();
      }
      pendingVotePayloadRef.current = payload;
      pendingVoteTimerRef.current = window.setTimeout(() => {
        flushPendingVote();
      }, 900);
    },
    [flushPendingVote],
  );

  useEffect(
    () => () => {
      flushPendingVote();
    },
    [flushPendingVote],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sessionRaw = window.sessionStorage.getItem(SWIPES_SESSION_COUNT_KEY);
    const parsedSession = Number(sessionRaw ?? "0");
    if (Number.isFinite(parsedSession) && parsedSession > 0) {
      setSessionVoteCount(Math.trunc(parsedSession));
    }

    const savedRaw = window.localStorage.getItem(SWIPES_SAVED_IDS_KEY);
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed)) {
          setSavedIds(new Set(parsed.map((entry) => String(entry))));
        }
      } catch {
        // ignore malformed local state
      }
    }

    const topicHintsRaw = window.localStorage.getItem(SWIPES_TOPIC_HINTS_KEY);
    if (topicHintsRaw) {
      try {
        const parsed = JSON.parse(topicHintsRaw);
        if (Array.isArray(parsed)) {
          setSavedTopicHints(parsed.map((entry) => String(entry)).filter(Boolean));
        }
      } catch {
        // ignore malformed local state
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SWIPES_SAVED_IDS_KEY, JSON.stringify([...savedIds]));
  }, [savedIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SWIPES_TOPIC_HINTS_KEY, JSON.stringify(savedTopicHints));
  }, [savedTopicHints]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(SWIPES_SESSION_COUNT_KEY, String(Math.max(0, sessionVoteCount)));
  }, [sessionVoteCount]);

  useEffect(() => {
    if (typeof document === "undefined" || !isSwipeFocusMode) return;
    document.body.classList.add("vog-mobile-swipe-focus");
    return () => {
      document.body.classList.remove("vog-mobile-swipe-focus");
    };
  }, [isSwipeFocusMode]);

  useEffect(() => {
    setArrivalMode(resolveInitialSwipesArrivalMode(fromDraftId));
  }, [fromDraftId]);

  useEffect(() => {
    setUseCreateSeed(hasCreateSeed);
  }, [hasCreateSeed]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const resp = await fetchSwipeFeed(
        buildSwipesFeedFilter({
          topicQuery: variant === "solo" ? undefined : topicQuery,
          level: activeLevel,
          statementId: focusStatementId,
          fromDraftId: showingFromDraftOnly ? fromDraftId : null,
          arrivalMode,
        }),
        null,
      );
      if (!cancelled) {
        let nextItems = filterSwipeItemsByDiscoverySegment({
          items: resp.items,
          segment: activeSegment,
          savedIds,
          preferredTopics,
        });
        if (useCreateSeed && hasCreateSeed) {
          const seeded = prioritizeSwipeItemsForCreateSeed({
            items: nextItems,
            topic: seededTopic,
            claim: seededClaim,
          });
          nextItems = seeded.items;
          setSeededClaimMatchCount(seeded.claimMatchCount);
          setSeededTopicMatchCount(seeded.topicMatchCount);
        } else {
          setSeededClaimMatchCount(0);
          setSeededTopicMatchCount(0);
        }
        setItems(nextItems);
        setDeckSize(nextItems.length);
        setCompletedCount(0);
        setLoading(false);
        setLastVote(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [
    activeLevel,
    activeSegment,
    arrivalMode,
    focusStatementId,
    fromDraftId,
    preferredTopics,
    preferredTopicsKey,
    savedIds,
    savedIdsKey,
    showingFromDraftOnly,
    hasCreateSeed,
    useCreateSeed,
    seededClaim,
    seededTopic,
    topicQuery,
    variant,
  ]);

  const activeItem = useMemo(() => items[0] ?? null, [items]);
  const seededMatchFound = seededClaimMatchCount > 0 || seededTopicMatchCount > 0;
  const fromDraftFocusCount = useMemo(() => countFromDraftFocusItems(items), [items]);
  const thematicContextHref = useMemo(() => resolveThematicContextHref(activeItem), [activeItem]);
  const showArrivalContextReminder = useMemo(
    () => shouldShowArrivalContextReminder(thematicContextHref),
    [thematicContextHref],
  );

  const openDetail = useCallback(async (item: SwipeItem) => {
    setDetailItem(item);
    setDetailOpen(true);
    setDetailLoading(true);
    const evts = await fetchEventualities(item.id);
    setDetailEventualities(evts);
    setDetailLoading(false);
  }, []);

  const moveToNextTopic = useCallback(() => {
    setItems((prev) => prev.slice(1));
    setCompletedCount((prev) => prev + 1);
  }, []);

  const adjustSessionVoteCount = useCallback((delta: number) => {
    setSessionVoteCount((prev) => Math.max(0, prev + delta));
  }, []);

  const saveItemForLater = useCallback((item: SwipeItem) => {
    setSavedIds((prev) => {
      if (prev.has(item.id)) return prev;
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    setSavedTopicHints((prev) => {
      const next = [...prev, ...item.topicTags].map((entry) => entry.trim()).filter(Boolean);
      return Array.from(new Set(next)).slice(0, 10);
    });
  }, []);

  const beginEventualityStep = useCallback(
    async (item: SwipeItem, decision: SwipeDecision, openGateAfterTopic: boolean) => {
      if (!item.hasEventualities) {
        moveToNextTopic();
        if (openGateAfterTopic) {
          freeVote.setGateOpen(true);
        }
        return;
      }
      setOpenGateAfterStep(openGateAfterTopic);
      setEventualityStepOpen(true);
      setEventualityStepDecision(decision);
      setEventualityStepItem(item);
      setEventualityStepLoading(true);
      const evts = await fetchEventualities(item.id);
      setEventualityStepItems(evts.slice(0, 4));
      setEventualityStepLoading(false);
      if (evts.length === 0) {
        setTransitionHint((prev) =>
          prev
            ? `${prev} Keine Varianten vorhanden, nächstes Thema wird geladen.`
            : "Keine Varianten vorhanden, nächstes Thema wird geladen.",
        );
        window.setTimeout(() => {
          setEventualityStepOpen(false);
          setEventualityStepDecision(null);
          setEventualityStepItem(null);
          setEventualityStepItems([]);
          moveToNextTopic();
          if (openGateAfterTopic) {
            freeVote.setGateOpen(true);
          }
        }, 500);
      }
    },
    [freeVote, moveToNextTopic],
  );

  const handlePrimaryVote = useCallback(
    async (item: SwipeItem, decision: SwipeDecision) => {
      if (!privacyGate.ensureActiveProcessingAllowed("swipes-vote")) return;
      if (isVoteLocked) {
        freeVote.setGateOpen(true);
        return;
      }
      const nextCount = freeVote.registerVote();
      if (nextCount === null) {
        freeVote.setGateOpen(true);
        return;
      }
      const openGateBeforeNextVote = freeVote.enabled && nextCount >= freeVote.limit;
      const historyEntry: DecisionHistoryItem = {
        id: item.id,
        title: item.title,
        category: item.category || item.domainLabel || "Thema",
        decision,
        detailHref: openDossierRoute(item.id),
      };

      setDecisionStats((prev) => ({
        ...prev,
        [decision]: prev[decision] + 1,
      }));
      adjustSessionVoteCount(1);
      setLastVote({
        item,
        decision,
        historyEntry,
        prevHint: transitionHint,
      });
      setDecisionHistory((prev) => {
        const next: DecisionHistoryItem[] = [...prev, historyEntry];
        return next.slice(-20);
      });

      setTransitionHint(null);
      announce(
        decision === "agree"
          ? "Zustimmung gespeichert."
          : decision === "disagree"
            ? "Ablehnung gespeichert."
            : "Offene Bewertung gespeichert.",
      );
      queueVotePayload({ statementId: item.id, decision });
      moveToNextTopic();
      if (openGateBeforeNextVote) {
        freeVote.setGateOpen(true);
      }
    },
    [
      adjustSessionVoteCount,
      announce,
      freeVote,
      isVoteLocked,
      moveToNextTopic,
      openDossierRoute,
      privacyGate,
      queueVotePayload,
      transitionHint,
    ],
  );

  const handleUndoLastVote = useCallback(() => {
    if (!lastVote) return;

    const { item, decision, historyEntry, prevHint } = lastVote;
    const shouldReinsert = !activeItem || activeItem.id !== item.id;

    setDecisionStats((prev) => ({
      ...prev,
      [decision]: Math.max(prev[decision] - 1, 0),
    }));
    adjustSessionVoteCount(-1);
    setDecisionHistory((prev) => {
      const idx = [...prev].reverse().findIndex((entry) => entry.id === historyEntry.id && entry.decision === historyEntry.decision);
      if (idx === -1) return prev;
      const absoluteIndex = prev.length - 1 - idx;
      return prev.filter((_, entryIndex) => entryIndex !== absoluteIndex);
    });
    if (shouldReinsert) {
      setItems((prev) => [item, ...prev.filter((entry) => entry.id !== item.id)]);
      setCompletedCount((prev) => Math.max(prev - 1, 0));
    }

    if (eventualityStepOpen) {
      setEventualityStepOpen(false);
      setEventualityStepDecision(null);
      setEventualityStepItem(null);
      setEventualityStepItems([]);
      setEventualityStepLoading(false);
    }

    setOpenGateAfterStep(false);
    setTransitionHint(prevHint ?? "Letzte Entscheidung zurückgenommen.");
    const pendingVote = pendingVotePayloadRef.current;
    if (pendingVote && pendingVote.statementId === item.id) {
      cancelPendingVote();
    } else {
      void deleteSwipeVote(item.id);
    }
    if (freeVote.enabled) {
      freeVote.unregisterVote();
    }
    freeVote.setGateOpen(false);
    announce("Letzte Bewertung wurde zurückgenommen.");
    setLastVote(null);
  }, [activeItem, adjustSessionVoteCount, announce, cancelPendingVote, eventualityStepOpen, freeVote, lastVote]);

  const finishEventualityStep = useCallback(() => {
    setEventualityStepOpen(false);
    setEventualityStepDecision(null);
    setEventualityStepItem(null);
    setEventualityStepItems([]);
    moveToNextTopic();
    if (openGateAfterStep) {
      setOpenGateAfterStep(false);
      freeVote.setGateOpen(true);
    }
  }, [freeVote, moveToNextTopic, openGateAfterStep]);

  const handleEventualitySelect = useCallback(
    (selection: {
      eventualityId: string;
      variantWeight: 1 | 3 | 5;
      variantReason?: string;
      variantRankedIds?: string[];
      excludedEventualityIds?: string[];
    }) => {
      if (!eventualityStepItem || !eventualityStepDecision) {
        finishEventualityStep();
        return;
      }
      queueVotePayload({
        statementId: eventualityStepItem.id,
        eventualityId: selection.eventualityId,
        decision: eventualityStepDecision,
        variantWeight: selection.variantWeight,
        variantReason: selection.variantReason,
        variantRankedIds: selection.variantRankedIds,
        excludedEventualityIds: selection.excludedEventualityIds,
      });
      setTransitionHint("Variante mit Gewichtung gespeichert. Nächstes Thema folgt.");
      finishEventualityStep();
    },
    [eventualityStepDecision, eventualityStepItem, finishEventualityStep, queueVotePayload],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!activeItem || eventualityStepOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.isContentEditable) return;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        void handlePrimaryVote(activeItem, "disagree");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        void handlePrimaryVote(activeItem, "agree");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        void openDetail(activeItem);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        void handlePrimaryVote(activeItem, "neutral");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeItem, eventualityStepOpen, handlePrimaryVote, openDetail]);

  return (
    <div className={`mx-auto flex flex-col gap-2.5 px-3 pt-1.5 md:gap-4 md:px-4 md:pt-6 ${isSolo ? "max-w-3xl" : "max-w-6xl"} pb-28 md:pb-24`}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>

      {isSolo ? <SoloHeader statementId={focusStatementId} /> : null}

      {!isSolo ? (
        <SwipesHeaderProgress
          swipeCount={swipeProgressCount}
          sessionCount={sessionVoteCount}
          deckProgressLabel={deckProgressLabel}
          mode={progressState.mode}
          onOpenSearch={() => setSearchOpen(true)}
        />
      ) : null}

      {!isSolo && showWelcomeHint ? (
        <section className="rounded-2xl border border-sky-200/80 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100">
          Willkommen. Starte mit bestehenden Themen oder bringe ein eigenes Anliegen ein.
        </section>
      ) : null}

      {!isSolo && hasCreateSeed ? (
        <section className="rounded-2xl border border-cyan-200 bg-cyan-50/80 px-3 py-3 text-sm text-cyan-950 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-200">Aus deinem Beitrag</p>
          {seededClaim ? <p className="mt-1 font-semibold">{seededClaim}</p> : null}
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            {seededTopic ? <span className="vog-chip">{seededTopic}</span> : null}
            {initialStance ? <span className="vog-chip">Vermutete Haltung: {initialStance}</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
              onClick={() => setTransitionHint("Du entscheidest aktiv. Es wird keine Stimme automatisch abgegeben.")}
            >
              Dazu abstimmen
            </button>
            <button
              type="button"
              className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
              onClick={() => {
                setUseCreateSeed(false);
                setSearchOpen(false);
                setTransitionHint("Ähnliche Claims aus demselben Themenfeld werden angezeigt.");
              }}
            >
              Ähnliche Claims ansehen
            </button>
            {!useCreateSeed ? (
              <button
                type="button"
                className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
                onClick={() => setUseCreateSeed(true)}
              >
                Zurück zum Beitrags-Seed
              </button>
            ) : null}
          </div>
          {useCreateSeed && !seededMatchFound && !loading ? (
            <p className="mt-2 text-xs text-cyan-900 dark:text-cyan-100">
              Wir haben noch keine passende Abstimmung gefunden. Du kannst das Thema als neue Abstimmung vorschlagen.
            </p>
          ) : null}
          <p className="mt-1 text-xs text-cyan-900 dark:text-cyan-100">Keine automatische Stimme.</p>
        </section>
      ) : null}

      {fromDraftArrivalEnabled && fromDraftId ? (
        <FinalizeArrivalBanner
          draftId={fromDraftId}
          arrivalMode={arrivalMode}
          focusedCount={fromDraftFocusCount}
          showContextReminder={showArrivalContextReminder}
          onSwitchMode={setArrivalMode}
        />
      ) : null}

      {!isSolo ? (
        <SwipesSearchTrigger
          open={searchOpen}
          topicQuery={topicQuery}
          activeLevel={activeLevel}
          activeSegment={activeSegment}
          segmentOptions={[...SWIPE_DISCOVERY_SEGMENTS]}
          onClose={() => setSearchOpen(false)}
          onTopicChange={setTopicQuery}
          onLevelChange={setActiveLevel}
          onSegmentChange={setActiveSegment}
        />
      ) : null}

      {!isSolo ? (
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
          {SWIPE_DISCOVERY_SEGMENTS.map((segment) => {
            const active = activeSegment === segment.id;
            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => setActiveSegment(segment.id)}
                className={active ? "vog-chip vog-chip--active" : "vog-chip"}
              >
                {segment.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={isSolo ? "space-y-3" : "grid gap-4 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)]"}>
        <div className="space-y-3">
          {loading ? (
            <div className="public-flow-line rounded-3xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
              Lade Thema …
            </div>
          ) : activeItem ? (
            <SwipeTopicStep
              item={activeItem}
              nextItem={items[1] ?? null}
              step={completedCount + 1}
              onVote={(decision) => {
                void handlePrimaryVote(activeItem, decision);
              }}
              onQuickFollowup={(action) => {
                if (action === "more_context") {
                  void openDetail(activeItem);
                  return;
                }
                if (action === "variants") {
                  void beginEventualityStep(activeItem, "neutral", false);
                  return;
                }
                saveItemForLater(activeItem);
                setTransitionHint("Für später vertiefen gespeichert. Du findest das Thema unter „Gespeichert“.");
                moveToNextTopic();
              }}
            />
          ) : (
            <EmptyState
              message={resolveSwipesEmptyStateMessage({ showingFromDraftOnly })}
              onResetFilters={() => {
                setTopicQuery("");
                setActiveLevel("ALL");
                setActiveSegment("all");
                if (fromDraftArrivalEnabled) {
                  setArrivalMode("all");
                }
              }}
            />
          )}
          {!isSolo && transitionHint ? <p className="text-xs text-[rgb(var(--muted))]">{transitionHint}</p> : null}
          {!isSolo && thematicContextHref ? (
            <Link
              href={thematicContextHref}
              className="inline-flex items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))]"
            >
              Zum Themenkontext in /create
            </Link>
          ) : null}
          {!isSolo && lastVote ? (
            <button
              type="button"
              onClick={handleUndoLastVote}
              className="btn-secondary hidden w-fit items-center px-3 py-1.5 text-xs md:inline-flex"
            >
              Letzte Bewertung rückgängig
            </button>
          ) : null}
        </div>

        {!isSolo ? (
          <aside className="hidden md:block">
            <DesktopDetailHint
              item={activeItem}
              onOpenDetail={() => {
                if (!activeItem) return;
                void openDetail(activeItem);
              }}
            />
          </aside>
        ) : null}
      </div>

      {!isSolo ? (
        <SwipesOutcomeSummary
          stats={decisionStats}
          history={decisionHistory}
          votesHref={activeItem ? openVotesRoute(activeItem.id, activeItem.title) : "/abstimmungen"}
        />
      ) : null}

      {!isSolo && decisionHistory.length > 0 ? (
        <section className="rounded-3xl border border-cyan-300 bg-cyan-50 p-4 text-cyan-950 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-50 md:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-200">
            Deine Frage, eure Positionen
          </p>
          <h2 className="mt-2 text-lg font-bold">Jetzt eine eigene Abstimmung kostenlos starten</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed">
            Beginne mit einem Entwurf, prüfe ihn selbst und teile ihn erst nach der Freigabe mit deiner Gruppe.
          </p>
          <Link
            href={buildFreeBallotStartHref(undefined, "swipes-outcome")}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          >
            Eigene Abstimmung starten
          </Link>
        </section>
      ) : null}

      {!isSolo && activeItem && !eventualityStepOpen && !detailOpen && !freeVote.gateOpen ? (
        <nav
          aria-label="Swipe-Entscheidungen"
          data-swipe-controls="touch-fallback"
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 border-t border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 px-3 py-2 backdrop-blur md:hidden"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sky-500/10 to-transparent" />
          <div className="relative mx-auto max-w-md">
            <div className="grid grid-cols-4 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void handlePrimaryVote(activeItem, "disagree");
                }}
                aria-label="Nein – Karte ablehnen"
                aria-keyshortcuts="ArrowLeft"
                className="btn-vote btn-vote-disagree min-h-[54px] rounded-2xl px-2 py-2 text-sm font-bold"
              >
                ← Nein
              </button>
              <button
                type="button"
                onClick={() => {
                  void openDetail(activeItem);
                }}
                aria-label="Details und Quellen öffnen"
                aria-keyshortcuts="ArrowUp"
                className="btn-secondary min-h-[54px] rounded-2xl px-2 py-2 text-xs font-semibold"
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => {
                  void handlePrimaryVote(activeItem, "neutral");
                }}
                aria-label="Neutral"
                aria-keyshortcuts="ArrowDown"
                className="btn-vote btn-vote-neutral min-h-[54px] rounded-2xl px-2 py-2 text-xs font-semibold"
              >
                Neutral
              </button>
              <button
                type="button"
                onClick={() => {
                  void handlePrimaryVote(activeItem, "agree");
                }}
                aria-label="Ja – Karte zustimmen"
                aria-keyshortcuts="ArrowRight"
                className="btn-vote btn-vote-agree min-h-[54px] rounded-2xl px-2 py-2 text-sm font-bold"
              >
                Ja →
              </button>
            </div>
            {lastVote ? (
              <button
                type="button"
                onClick={handleUndoLastVote}
                className="absolute -top-9 right-0 min-h-8 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 px-3 text-[11px] font-semibold text-[rgb(var(--muted))] shadow-sm"
              >
                Rückgängig
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}

      <SwipeEventualitiesStep
        open={eventualityStepOpen}
        item={eventualityStepItem}
        decision={eventualityStepDecision}
        eventualities={eventualityStepItems}
        loading={eventualityStepLoading}
        voteFeedback={transitionHint}
        onSelect={handleEventualitySelect}
        onUndoLastVote={lastVote ? handleUndoLastVote : undefined}
        onOpenDetail={() => {
          if (!eventualityStepItem) return;
          const item = eventualityStepItem;
          setEventualityStepOpen(false);
          setEventualityStepDecision(null);
          setEventualityStepItem(null);
          setEventualityStepItems([]);
          setEventualityStepLoading(false);
          setOpenGateAfterStep(false);
          void openDetail(item);
        }}
        onSkip={() => {
          if (eventualityStepItem && eventualityStepDecision) {
            queueVotePayload({ statementId: eventualityStepItem.id, decision: eventualityStepDecision });
          }
          setTransitionHint("Variante übersprungen. Nächstes Thema folgt.");
          finishEventualityStep();
        }}
      />

      <SwipeAuthGate
        open={freeVote.gateOpen}
        count={freeVote.count}
        limit={freeVote.limit}
        onClose={() => freeVote.setGateOpen(false)}
      />

      <SwipeDetailSheet
        open={detailOpen}
        item={detailItem}
        eventualities={detailEventualities}
        loadingEventualities={detailLoading}
        dossierHref={detailItem ? detailItem.dossierHref ?? openDossierRoute(detailItem.id) : null}
        evidenceHref={detailItem ? openEvidenceRoute(detailItem.id) : null}
        votesHref={detailItem ? openVotesRoute(detailItem.id, detailItem.title) : null}
        onClose={() => {
          setDetailOpen(false);
          setDetailItem(null);
          setDetailEventualities(null);
        }}
      />

    </div>
  );
}

function FinalizeArrivalBanner({
  draftId,
  arrivalMode,
  focusedCount,
  showContextReminder,
  onSwitchMode,
}: {
  draftId: string;
  arrivalMode: SwipesArrivalMode;
  focusedCount: number;
  showContextReminder: boolean;
  onSwitchMode: (mode: SwipesArrivalMode) => void;
}) {
  const showingFromDraftOnly = arrivalMode === "from_draft";
  const shortDraftId = draftId.slice(-8);
  const toggle = resolveSwipesArrivalToggle(arrivalMode);
  const statusText = resolveFromDraftArrivalStatus({
    showingFromDraftOnly,
    focusedCount,
  });
  return (
    <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Beitrag eingereicht (Entwurf <span className="font-semibold">…{shortDraftId}</span>). {statusText}
        </p>
        <button
          type="button"
          onClick={() => onSwitchMode(toggle.nextMode)}
          aria-pressed={showingFromDraftOnly}
          className="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-500/[0.08] px-3 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-500/[0.12] dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100"
        >
          {toggle.label}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-emerald-700/90 dark:text-emerald-100/90">
        Hier kannst du zustimmen, anders sehen oder vertiefen. Es werden nur passende Vorschläge gezeigt, keine künstlichen Treffer.
      </p>
      {showContextReminder ? (
        <p className="mt-1 text-[11px] text-emerald-700/90 dark:text-emerald-100/90">
          Der Themenkontext bleibt im Anlassraum über /runden; Swipes ist der Beteiligungsmodus.
        </p>
      ) : null}
    </section>
  );
}

function SoloHeader({ statementId }: { statementId?: string }) {
  return (
    <header className="public-flow-line flex items-center justify-between gap-3 rounded-3xl bg-[rgb(var(--card))] px-4 py-3">
      <Link
        href="/swipes"
        className="inline-flex items-center rounded-full border border-[rgb(var(--border))] bg-transparent px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--fg))] transition hover:bg-[color-mix(in_oklab,rgb(var(--card))_72%,transparent)] focus:outline-none focus:ring-2 focus:ring-sky-200"
      >
        Alle Swipes anzeigen
      </Link>
      {statementId ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
          Karte #{statementId}
        </span>
      ) : null}
    </header>
  );
}

function DesktopDetailHint({ item, onOpenDetail }: { item: SwipeItem | null; onOpenDetail: () => void }) {
  return (
    <article className="public-proof-zone relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_100%_0%,rgba(56,189,248,0.14),rgba(15,23,42,0)_45%)]" />
      <div className="pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full bg-cyan-500/12 blur-2xl" />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Vertiefung</p>
      {item ? (
        <>
          <h3 className="mt-2 text-base font-semibold text-[rgb(var(--fg))]">Aktives Thema vertiefen</h3>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">Dossier, Quellenlage und Varianten im Detail prüfen.</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="vog-chip">Dossier</span>
            <span className="vog-chip">Quellenlage</span>
            <span className="vog-chip">Mögliche Folgen</span>
          </div>
          <button
            type="button"
            onClick={onOpenDetail}
            className="mt-3 rounded-full border border-sky-300/70 bg-gradient-to-r from-sky-50 to-cyan-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:brightness-105 dark:border-sky-400/30 dark:from-sky-500/14 dark:to-cyan-500/10 dark:text-sky-200"
          >
            Thema vertiefen
          </button>
        </>
      ) : (
        <p className="mt-2 text-sm text-[rgb(var(--muted))]">Wähle ein Thema, um die Vertiefung zu öffnen.</p>
      )}
    </article>
  );
}

type EmptyStateProps = {
  message?: string;
  ctaHref?: string;
  ctaLabel?: string;
  onResetFilters?: () => void;
};

function EmptyState({
  message = "Keine Themen im aktuellen Filter. Setze Filter zurück oder starte mit Trendthemen.",
  ctaHref,
  ctaLabel,
  onResetFilters,
}: EmptyStateProps) {
  return (
    <section className="public-proof-zone rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 text-sm text-[rgb(var(--muted))]">
      <p>{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onResetFilters ? (
          <button type="button" onClick={onResetFilters} className="vog-chip vog-chip--active">
            Filter zurücksetzen
          </button>
        ) : null}
        <Link href="/swipes?topic=Wohnen" className="vog-chip">
          Wohnen
        </Link>
        <Link href="/swipes?topic=Bildung" className="vog-chip">
          Bildung
        </Link>
        <Link href="/swipes?topic=Mobilität" className="vog-chip">
          Mobilität
        </Link>
      </div>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="mt-3 inline-flex items-center text-sky-600 hover:text-sky-500">
          {ctaLabel}
        </Link>
      ) : null}
    </section>
  );
}
