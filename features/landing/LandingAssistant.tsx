"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import type { LandingScope, LandingTile } from "./landingSeeds";
import { scopeFromResponsibility } from "./useLandingFeed";
import { buildPrefillUrl, createDraft, createDraftAndNavigate } from "../common/utils/draftNavigation";
import { LANDING_COPY, type Lang } from "./landingCopy";

type AnalyzeResult = {
  claims?: Array<{ text: string; responsibility?: string | null }>;
  questions?: Array<{ text: string }>;
  participationCandidates?: Array<{ text: string }>;
};

type Preview = { claims: string[]; questions: string[]; options: string[] };
type LiveSnapshot = {
  score: number;
  scoreLabel: string;
  type: string;
  typeKey: "vote" | "question" | "topic";
  stance: "pro" | "contra" | "neutral";
  scope: string;
  scopeKey: "world" | "eu" | "country" | "region" | "unknown";
  hint: string;
  wordCount: number;
  proHits: number;
  contraHits: number;
};

const QUESTION_WORDS = ["wie", "warum", "wieso", "woran", "wer", "was", "wo", "how", "why", "when", "who", "what", "where"];
const VOTE_TOKENS = [
  "soll",
  "sollen",
  "darf",
  "dürfen",
  "duerfen",
  "muss",
  "müssen",
  "muessen",
  "abschaffen",
  "einführen",
  "einfuehren",
  "verbot",
  "verboten",
  "pflicht",
  "should",
  "must",
  "ban",
  "banned",
  "require",
  "mandatory",
  "allow",
  "permit",
  "legalize",
  "abolish",
  "introduce",
];
const PRO_TOKENS = [
  "für",
  "fuer",
  "dafür",
  "dafuer",
  "unterstütze",
  "unterstuetze",
  "einführen",
  "einfuehren",
  "mehr",
  "ausbauen",
  "erhöhen",
  "erhoehen",
  "senken",
  "zustimmen",
  "for",
  "support",
  "approve",
  "expand",
  "increase",
  "raise",
  "invest",
  "legalize",
  "allow",
];
const CONTRA_TOKENS = [
  "gegen",
  "ablehnen",
  "stoppen",
  "verhindern",
  "kein",
  "keine",
  "verbieten",
  "against",
  "oppose",
  "reject",
  "ban",
  "stop",
  "prevent",
  "abolish",
  "cut",
  "reduce",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLiveSnapshot(text: string, lang: Lang): LiveSnapshot {
  const t = LANDING_COPY[lang];
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      score: 0,
      scoreLabel: t.live.scoreLabels.unclear,
      type: "—",
      typeKey: "topic",
      stance: "neutral",
      scope: t.live.scopeLabels.unknown,
      scopeKey: "unknown",
      hint: t.live.hints.empty,
      wordCount: 0,
      proHits: 0,
      contraHits: 0,
    };
  }

  const lower = trimmed.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const questionRegex = new RegExp(`\\b(${QUESTION_WORDS.map(escapeRegExp).join("|")})\\b`);
  const voteRegex = new RegExp(`\\b(${VOTE_TOKENS.map(escapeRegExp).join("|")})\\b`);
  const hasQuestion = /\?/.test(lower) || questionRegex.test(lower);
  const looksVote = voteRegex.test(lower);

  const proHits = PRO_TOKENS.reduce((count, token) => {
    const matches = lower.match(new RegExp(`\\b${escapeRegExp(token)}\\b`, "g"));
    return count + (matches ? matches.length : 0);
  }, 0);

  const contraHits = CONTRA_TOKENS.reduce((count, token) => {
    const matches = lower.match(new RegExp(`\\b${escapeRegExp(token)}\\b`, "g"));
    return count + (matches ? matches.length : 0);
  }, 0);

  let scopeKey: LiveSnapshot["scopeKey"] = "unknown";
  if (/\b(eu|europa|europe|european|brussel|brüssel)\b/.test(lower)) scopeKey = "eu";
  else if (/\b(stadt|kommune|gemeinde|bezirk|kreis|city|municipality|county|district|local)\b/.test(lower)) scopeKey = "region";
  else if (/\b(bund|bundes|deutschland|landes|land|federal|national|country|state)\b/.test(lower)) scopeKey = "country";
  else if (/\b(global|welt|international|un|vereinte nationen|world|united nations)\b/.test(lower)) scopeKey = "world";

  let score = Math.min(100, Math.max(10, Math.round(trimmed.length / 2)));
  if (trimmed.length < 14) score = 20;
  if (trimmed.length > 200) score -= 15;
  if (hasQuestion || looksVote) score += 10;
  if (/\b(weil|damit|um|because|so that)\b/.test(lower)) score += 6;
  score = Math.min(100, Math.max(10, score));

  const scoreLabel =
    score >= 80 ? t.live.scoreLabels.veryClear : score >= 60 ? t.live.scoreLabels.clear : score >= 40 ? t.live.scoreLabels.ok : t.live.scoreLabels.unclear;

  const stance = contraHits > proHits ? "contra" : proHits > contraHits ? "pro" : "neutral";
  const typeKey: LiveSnapshot["typeKey"] = hasQuestion ? "question" : looksVote ? "vote" : "topic";

  return {
    score,
    scoreLabel,
    type: t.live.typeLabels[typeKey],
    typeKey,
    stance,
    scope: t.live.scopeLabels[scopeKey],
    scopeKey,
    hint: trimmed.length < 20 ? t.live.hints.short : t.live.hints.long,
    wordCount,
    proHits,
    contraHits,
  };
}

/**
 * Harmonized gradients using RGBA (so violet actually shows reliably).
 * All three accents share the same “family”, but each has its own emphasis.
 */
function AccentWord({
  scheme,
  children,
}: {
  scheme: "opinion" | "voice" | "weight";
  children: ReactNode;
}) {
  const textGrad =
    scheme === "opinion"
      ? "bg-[linear-gradient(90deg,rgba(26,140,255,1),rgba(24,207,200,1))]"
      : scheme === "voice"
        ? "bg-[linear-gradient(90deg,rgba(139,92,246,1),rgba(236,72,153,1),rgba(56,189,248,1))]"
        : "bg-[linear-gradient(90deg,rgba(20,184,166,1),rgba(24,207,200,1),rgba(26,140,255,1))]";

  const underline =
    scheme === "opinion"
      ? "bg-[linear-gradient(90deg,rgba(26,140,255,0.20),rgba(24,207,200,0.18))]"
      : scheme === "voice"
        ? "bg-[linear-gradient(90deg,rgba(139,92,246,0.20),rgba(236,72,153,0.16),rgba(56,189,248,0.16))]"
        : "bg-[linear-gradient(90deg,rgba(20,184,166,0.18),rgba(24,207,200,0.16),rgba(26,140,255,0.16))]";

  return (
    <span className={`relative font-extrabold ${textGrad} bg-clip-text text-transparent`}>
      {children}
      <span className={`absolute left-0 right-0 -bottom-1 h-[6px] rounded-full ${underline}`} />
    </span>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M8.2 5.6a1 1 0 0 1 1.5-.86l8 6a1 1 0 0 1 0 1.6l-8 6A1 1 0 0 1 8 17.54V6.46a1 1 0 0 1 .2-.86z" />
    </svg>
  );
}

export default function LandingAssistant({
  onIngest,
  prefillText,
  onAnalyzeRequest,
  lang,
}: {
  onIngest: (scope: LandingScope, tiles: LandingTile[]) => void;
  prefillText?: string;
  onAnalyzeRequest?: (actions: { submit: () => void; refine: () => void }) => void;
  lang: Lang;
}) {
  const t = LANDING_COPY[lang];
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftingLabel, setDraftingLabel] = useState<"messenger" | "option" | "dossier" | "questions" | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ fallback?: boolean; degraded?: boolean } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "error" | null>(null);
  const [botTrap, setBotTrap] = useState("");
  const inputId = useId();
  const liveHintId = useId();
  const errorId = useId();
  const saveStatusId = useId();

  useEffect(() => {
    if (prefillText && prefillText.trim()) {
      setText((prev) => (prev === prefillText ? prev : prefillText));
    }
  }, [prefillText]);

  useEffect(() => {
    setRole(null);
    setLevel(null);
  }, [lang]);

  const disabled = loading || !text.trim();
  const live = useMemo(() => buildLiveSnapshot(text, lang), [text, lang]);
  const contextLabel = useMemo(() => [role, level].filter(Boolean).join(" · "), [role, level]);

  const hasText = text.trim().length > 0;
  const showLive = hasText;
  const botBlocked = botTrap.trim().length > 0;

  const scoreDot = live.score >= 70 ? "bg-cyan-500" : live.score >= 45 ? "bg-sky-400" : "bg-rose-400";
  const describedBy = [showLive ? liveHintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const checkBot = () => {
    if (!botBlocked) return false;
    setError(t.errors.botBlocked);
    return true;
  };

  const startDrafting = (label: "messenger" | "option" | "dossier" | "questions") => {
    setDraftingLabel(label);
    window.setTimeout(() => setDraftingLabel(null), 4000);
  };

  async function quickCheck() {
    if (disabled) return;
    if (checkBot()) return;
    setLoading(true);
    setError(null);
    setPreviewMeta(null);

    try {
      const preparedText = contextLabel
        ? `${text.trim()}\n\n[${lang === "en" ? "Context" : "Kurz-Kontext"}: ${contextLabel}]`
        : text.trim();

      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: preparedText, locale: lang, maxClaims: 3 }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.result) {
        throw new Error(data?.message || "Check ist gerade nicht verfügbar.");
      }

      const result: AnalyzeResult = data.result;
      setPreviewMeta({ fallback: !!data?.fallback, degraded: !!data?.degraded });

      const claims = (result.claims || []).map((c) => c.text).filter(Boolean).slice(0, 2);
      const questions = (result.questions || []).map((q) => q.text).filter(Boolean).slice(0, 2);
      const options = (result.participationCandidates || result.claims || [])
        .map((x: any) => x.text)
        .filter(Boolean)
        .slice(0, 2);

      setPreview({
        claims: claims.length
          ? claims
          : [lang === "en" ? "We captured the issue — please be a bit more specific." : "Anliegen erfasst – bitte etwas konkreter formulieren."],
        questions: questions.length
          ? questions
          : [
              lang === "en" ? "Who is most affected?" : "Wer ist besonders betroffen?",
              lang === "en" ? "How do we measure impact and side effects?" : "Wie messen wir Wirkung und Nebenwirkungen?",
            ],
        options: options.length
          ? options
          : [lang === "en" ? "Option: Implement" : "Option: Umsetzen", lang === "en" ? "Option: Pilot / variant" : "Option: Pilot/Variante testen"],
      });

      const responsibility = result.claims?.[0]?.responsibility ?? null;
      const scope = scopeFromResponsibility(responsibility);

      const freshUntil = Date.now() + 5 * 60 * 1000;
      const injected: LandingTile[] = [
        ...claims.map((c, i): LandingTile => ({ id: `u-claim-${Date.now()}-${i}`, scope, text: c, tag: "Claim", kind: "topic", freshUntil })),
        ...options.map((o, i): LandingTile => ({ id: `u-opt-${Date.now()}-${i}`, scope, text: o, tag: "Option", kind: "option", freshUntil })),
      ].slice(0, 4);

      onIngest(scope, injected);
    } catch (e: any) {
      setError(e?.message || t.errors.checkUnavailable);
    } finally {
      setLoading(false);
    }
  }

  const submitDraft = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const isVote = live.typeKey === "vote";
    const isQuestion = live.typeKey === "question";
    const targetPath = isVote ? "/statements/new" : "/contribute";
    const draftKind = isVote ? "statement" : isQuestion ? "question" : "topic";
    setLoading(true);
    void createDraftAndNavigate({ kind: draftKind, text: trimmed, targetPath, fallbackPath: buildPrefillUrl(targetPath, trimmed) });
  };

  const handleStartClick = () => {
    if (disabled) return;
    if (checkBot()) return;
    if (onAnalyzeRequest) {
      onAnalyzeRequest({
        submit: submitDraft,
        refine: () => {
          if (!text.trim()) return;
          setShowContext(true);
          void quickCheck();
        },
      });
      return;
    }
    submitDraft();
  };

  const handleSave = async () => {
    if (disabled || saveStatus === "saving") return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (checkBot()) return;
    setSaveStatus("saving");
    const draftId = await createDraft({ kind: "contribution", text: trimmed });
    setSaveStatus(draftId ? "saved" : "error");
    window.setTimeout(() => setSaveStatus(null), 2500);
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-md">
        <p className="text-[12px] font-semibold tracking-[0.18em] text-slate-500">{t.brand}</p>

        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          <span className="block">
            {t.headline.line1Lead} <AccentWord scheme="opinion">{t.headline.line1Accent}</AccentWord>{" "}
            {t.headline.line1Tail}
          </span>
          <span className="block">
            {t.headline.line2Lead} <AccentWord scheme="voice">{t.headline.line2Accent}</AccentWord>{" "}
            {t.headline.line2Mid} <AccentWord scheme="weight">{t.headline.line2AccentB}</AccentWord>
            {t.headline.line2Tail}
          </span>
        </h1>

        <p className="mt-3 text-sm text-slate-600 sm:text-base">{t.subline}</p>

        <div className="mt-5 rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,0.5),rgba(139,92,246,0.45),rgba(34,211,238,0.5))] p-[1px] shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div className="rounded-2xl bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <label htmlFor={inputId} className="sr-only">
              {t.inputLabel}
            </label>

            <textarea
              id={inputId}
              className="w-full resize-none border-0 ring-0 bg-transparent px-4 py-3 text-base text-slate-900 outline-none shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-200"
              rows={4}
              placeholder={t.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
            />

            {/* Button row */}
            <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Left CTAs */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/howtoworks/edebatte"
                  className="inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold
                             bg-white/70 backdrop-blur border border-slate-200 text-slate-700
                             hover:bg-white hover:border-slate-300 transition"
                >
                  {t.buttons.howItWorks}
                </Link>

                <Link
                  href="/howtoworks/bewegung"
                  className="inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold
                             bg-white/70 backdrop-blur border border-slate-200 text-slate-700
                             hover:bg-white hover:border-slate-300 transition"
                >
                  {t.buttons.origin}
                </Link>

                <Link
                  href="/howtoworks/edebatte/dossier"
                  className="inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold
                             bg-white/70 backdrop-blur border border-slate-200 text-slate-700
                             hover:bg-white hover:border-slate-300 transition"
                >
                  {t.buttons.dossier}
                </Link>
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={handleStartClick}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,rgba(26,140,255,1),rgba(24,207,200,1))] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(24,165,255,0.25)] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-60"
                aria-label={loading ? t.buttons.starting : t.buttons.start}
              >
                <PlayIcon />
                <span>{loading ? t.buttons.starting : t.buttons.start}</span>
              </button>
            </div>

            <span id={saveStatusId} className="sr-only" role="status" aria-live="polite">
              {saveStatus === "saving"
                ? lang === "en"
                  ? "Saving"
                  : "Speichert"
                : saveStatus === "saved"
                  ? lang === "en"
                    ? "Saved"
                    : "Gespeichert"
                  : saveStatus === "error"
                    ? lang === "en"
                      ? "Save failed"
                      : "Speichern fehlgeschlagen"
                    : ""}
            </span>
          </div>
        </div>

        {showLive && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t.live.scoreTitle}</p>
              <span className="text-xs text-slate-500">{live.score}/100</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className={`h-2 w-2 rounded-full ${scoreDot}`} />
              <span>{live.scoreLabel}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white" role="progressbar" aria-label={t.live.scoreTitle} aria-valuemin={0} aria-valuemax={100} aria-valuenow={live.score}>
              <div className={`h-full rounded-full ${scoreDot}`} style={{ width: `${live.score}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{t.live.scoreHint}</p>
          </div>
        )}

        {showLive && (
          <p id={liveHintId} className="mt-2 text-[11px] text-slate-500">
            {live.hint} · {t.live.wordCount(live.wordCount)}
          </p>
        )}

        {error && (
          <p id={errorId} className="mt-3 text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}

        {preview && (
          <div className="mt-5 grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{t.preview.title}</p>
              {(previewMeta?.fallback || previewMeta?.degraded) && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">{t.preview.fallback}</span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <PreviewCard
                title={t.preview.cards.vote}
                text={preview.options[0]}
                href="/statements/new"
                disabled={!!draftingLabel}
                status={draftingLabel === "option" ? t.preview.draftStatus : undefined}
                emptyLabel={t.preview.empty}
                onClick={(e) => {
                  e.preventDefault();
                  startDrafting("option");
                  void createDraftAndNavigate({
                    kind: "statement",
                    text: preview.options[0] ?? "",
                    targetPath: "/statements/new",
                    fallbackPath: buildPrefillUrl("/statements/new", preview.options[0] ?? ""),
                  });
                }}
              />

              <PreviewCard
                title={t.preview.cards.dossier}
                text={preview.claims[0]}
                href="/contribute"
                disabled={!!draftingLabel}
                status={draftingLabel === "dossier" ? t.preview.draftStatus : undefined}
                emptyLabel={t.preview.empty}
                onClick={(e) => {
                  e.preventDefault();
                  startDrafting("dossier");
                  void createDraftAndNavigate({
                    kind: "topic",
                    text: preview.claims[0] ?? "",
                    targetPath: "/contribute",
                    fallbackPath: buildPrefillUrl("/contribute", preview.claims[0] ?? ""),
                  });
                }}
              />

              <PreviewCard
                title={t.preview.cards.questions}
                text={preview.questions[0]}
                href="/contribute"
                disabled={!!draftingLabel}
                status={draftingLabel === "questions" ? t.preview.draftStatus : undefined}
                emptyLabel={t.preview.empty}
                onClick={(e) => {
                  e.preventDefault();
                  startDrafting("questions");
                  void createDraftAndNavigate({
                    kind: "question",
                    text: preview.questions[0] ?? "",
                    targetPath: "/contribute",
                    fallbackPath: buildPrefillUrl("/contribute", preview.questions[0] ?? ""),
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewCard({
  title,
  text,
  href,
  onClick,
  status,
  emptyLabel,
  disabled = false,
}: {
  title: string;
  text?: string;
  href: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  status?: string;
  emptyLabel: string;
  disabled?: boolean;
}) {
  return (
    <a
      href={href}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick(event);
      }}
      aria-disabled={disabled}
      className={`group rounded-2xl border border-sky-100 bg-white/90 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white ${
        disabled ? "pointer-events-none opacity-70" : ""
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{title}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900 group-hover:underline">{text || emptyLabel}</p>
      {status && <p className="mt-2 text-[11px] font-semibold text-slate-500">{status}</p>}
    </a>
  );
}
