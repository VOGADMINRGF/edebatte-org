// apps/web/src/app/contributions/new/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { AnalyzeResult } from "@features/analyze/schemas";
import {
  HighlightedTextarea,
} from "@/app/(components)/HighlightedTextarea";
import {
  normalizeClaim,
  type NormalizedClaim,
} from "@/app/(components)/normalizeClaim";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";
import type { VerificationLevel } from "@core/auth/verificationTypes";
import { VERIFICATION_REQUIREMENTS, meetsVerificationLevel } from "@features/auth/verificationRules";

/* ---------- Types ---------- */

type NoteSection = { id: string; title: string; body: string };
type QuestionCard = {
  id: string;
  label: string;
  category: string;
  body: string;
};
type KnotCard = { id: string; title: string; category: string; body: string };

type VoteKind = "pro" | "neutral" | "contra" | null;

type StatementCard = NormalizedClaim & {
  quality?: {
    precision: number;
    testability: number;
    readability: number;
    balance: number;
  };
  vote?: VoteKind;
  locallyEdited?: boolean; // lokal angepasst → redaktionelle Prüfung
  flagged?: boolean;       // vom User gemeldet
};

const STORAGE_KEY = "vog_contribution_draft_v1";

const pageCopy = {
  title_de: "Beitrag analysieren",
  title_en: "Analyze your contribution",
  info_de: "Für die schlanke Bürger-Ansicht nutze /statements/new. Hier siehst du die ausführliche Analyse-Ansicht (E150).",
  info_en: "Use /statements/new for the lightweight citizen view. This is the full E150 analysis mode.",
};

const levelOptions = [
  { id: 1 as 1 | 2, label_de: "Level 1 – Basis", label_en: "Level 1 – basic" },
  { id: 2 as 1 | 2, label_de: "Level 2 – Mehr Fakten", label_en: "Level 2 – more facts" },
];

const analyzeButtonTexts = {
  running_de: "Analyse läuft …",
  running_en: "Analysis running…",
  retry_de: "Erneut versuchen",
  retry_en: "Try again",
  start_de: "Analyse starten",
  start_en: "Start analysis",
};

/* ---------- AI → UI Mapping (nur 1:1, keine Heuristik) ---------- */

function mapAiNoteToSection(raw: any, idx: number): NoteSection | null {
  if (!raw || typeof raw.text !== "string") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `note-${idx + 1}`;
  const kind = typeof raw.kind === "string" ? raw.kind : null;

  return {
    id,
    title: kind ? kind.toUpperCase() : `Abschnitt ${idx + 1}`,
    body: raw.text,
  };
}

function mapAiQuestionToCard(raw: any, idx: number): QuestionCard | null {
  if (!raw || typeof raw.text !== "string") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `q-${idx + 1}`;
  const dimension =
    typeof raw.dimension === "string" && raw.dimension ? raw.dimension : null;

  return {
    id,
    label: dimension ? dimension.toUpperCase() : "FRAGE",
    category: dimension ?? "",
    body: raw.text,
  };
}

function mapAiKnotToCard(raw: any, idx: number): KnotCard | null {
  if (!raw || typeof raw.description !== "string") return null;
  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : `k-${idx + 1}`;
  const label =
    typeof raw.label === "string" && raw.label.trim()
      ? raw.label
      : `Knoten ${idx + 1}`;

  return {
    id,
    title: label,
    category: "Themenschwerpunkt",
    body: raw.description,
  };
}

function mapAiClaimToStatement(raw: any, idx: number): StatementCard | null {
  const normalized = normalizeClaim(raw, idx);
  if (!normalized) return null;

  const meta =
    raw && typeof raw.meta === "object" && raw.meta !== null ? raw.meta : {};

  const quality =
    meta && typeof meta === "object" && meta.quality
      ? (meta.quality as StatementCard["quality"])
      : undefined;

  return {
    ...normalized,
    quality,
    vote: null,
    locallyEdited: false,
    flagged: false,
  };
}

/* ---------- Inline-Editor ---------- */

type InlineEditableTextProps = {
  value: string;
  onChange: (val: string) => void;
  label?: string;
};

function InlineEditableText({ value, onChange, label }: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => setDraft(value), [value]);

  const save = () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) onChange(trimmed);
  };

  if (!isEditing) {
    return (
      <div className="group relative">
        {label && (
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </div>
        )}
        <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">
          {value}
        </p>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="absolute -top-1 -right-1 hidden items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[11px] text-sky-600 shadow-sm group-hover:inline-flex"
          aria-label="Text bearbeiten"
        >
          ✏️
        </button>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>
      )}
      <textarea
        className="w-full rounded-md border border-sky-200 bg-white px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
      />
    </div>
  );
}

/* ---------- Hauptseite ---------- */

export default function ContributionNewPage() {
  const { locale } = useLocale();
  const [verificationLevel, setVerificationLevel] = React.useState<VerificationLevel>("none");
  const [levelStatus, setLevelStatus] = React.useState<"loading" | "ok" | "login_required" | "error">("loading");
  const textContent = React.useCallback(
    (entry: Record<string, any>, key: string) => resolveLocalizedField(entry, key, locale),
    [locale],
  );
  const [viewLevel, setViewLevel] = React.useState<1 | 2>(2);
  const [text, setText] = React.useState("");

  const [notes, setNotes] = React.useState<NoteSection[]>([]);
  const [questions, setQuestions] = React.useState<QuestionCard[]>([]);
  const [knots, setKnots] = React.useState<KnotCard[]>([]);
  const [statements, setStatements] = React.useState<StatementCard[]>([]);

  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [saveInfo, setSaveInfo] = React.useState<string | null>(null);
  const [lastStatus, setLastStatus] = React.useState<
    "idle" | "success" | "error" | "empty"
  >("idle");

  // welches Statement ist gerade im Meta-Edit-Modus?
  const [metaEditingId, setMetaEditingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;
    async function loadLevel() {
      try {
        const res = await fetch("/api/account/overview", { cache: "no-store" });
        if (!res.ok) {
          if (!ignore) {
            setLevelStatus(res.status === 401 ? "login_required" : "error");
          }
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (!ignore && body?.overview) {
          setVerificationLevel(body.overview.verificationLevel ?? "none");
          setLevelStatus("ok");
        }
      } catch {
        if (!ignore) setLevelStatus("error");
      }
    }
    loadLevel();
    return () => {
      ignore = true;
    };
  }, []);

  // Draft aus localStorage holen
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.text === "string" && !text) {
        setText(parsed.text);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateNote = (id: string, body: string) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body } : n)));

  const updateQuestion = (id: string, body: string) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, body } : q)));

  const updateKnot = (id: string, body: string) =>
    setKnots((prev) => prev.map((k) => (k.id === id ? { ...k, body } : k)));

  const setVote = (id: string, vote: VoteKind) =>
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, vote: s.vote === vote ? null : vote } : s
      )
    );

  const updateStatementText = (id: string, newText: string) =>
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, text: newText, locallyEdited: true } : s
      )
    );

  const updateStatementMeta = (
    id: string,
    patch: Partial<Pick<StatementCard, "title" | "responsibility" | "topic">>
  ) =>
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, ...patch, locallyEdited: true } : s
      )
    );

  const reportStatement = (id: string) => {
    setStatements((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, flagged: true } : s
      )
    );
    setInfo(
      "Danke für deinen Hinweis. Das Statement wurde zur redaktionellen Prüfung markiert. Deine eigene Stimme bleibt davon unberührt."
    );
  };

  const removeStatement = (id: string) => {
    setStatements((prev) => prev.filter((s) => s.id !== id));
    if (metaEditingId === id) setMetaEditingId(null);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setInfo(null);
    setSaveInfo(null);
    setLastStatus("idle");
    setMetaEditingId(null);

    try {
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, locale }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const result: AnalyzeResult = (data.result ?? data) as AnalyzeResult;

      const rawNotes: any[] = Array.isArray((result as any).notes)
        ? (result as any).notes
        : [];
      const rawQuestions: any[] = Array.isArray((result as any).questions)
        ? (result as any).questions
        : [];
      const rawKnots: any[] = Array.isArray((result as any).knots)
        ? (result as any).knots
        : [];
      const rawClaims: any[] = Array.isArray((result as any).claims)
        ? (result as any).claims
        : [];

      const mappedNotes = rawNotes
        .map(mapAiNoteToSection)
        .filter((x): x is NoteSection => x !== null);
      const mappedQuestions = rawQuestions
        .map(mapAiQuestionToCard)
        .filter((x): x is QuestionCard => x !== null);
      const mappedKnots = rawKnots
        .map(mapAiKnotToCard)
        .filter((x): x is KnotCard => x !== null);
      const mappedStatements = rawClaims
        .map(mapAiClaimToStatement)
        .filter((x): x is StatementCard => x !== null);

      setNotes(mappedNotes);
      setQuestions(mappedQuestions);
      setKnots(mappedKnots);
      setStatements(mappedStatements);

      if (mappedStatements.length === 0) {
        setLastStatus("empty");
        setInfo(
          "Die Analyse konnte aus deinem Beitrag im Moment keine klaren Einzel-Statements ableiten. Du kannst deinen Text leicht anpassen (z.B. kürzere Sätze) und die Analyse erneut starten."
        );
      } else {
        setLastStatus("success");
        setInfo(null);
      }
    } catch (e: any) {
      setError(
        e?.message ??
          "Analyse fehlgeschlagen. Vermutlich gab es ein Problem mit dem KI-Dienst."
      );
      setInfo(
        "Dein Beitrag bleibt oben erhalten. Du kannst es nach einem kurzen Moment mit „Erneut versuchen“ noch einmal probieren."
      );
      setNotes([]);
      setQuestions([]);
      setKnots([]);
      setStatements([]);
      setLastStatus("error");
      setMetaEditingId(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setText("");
    setNotes([]);
    setQuestions([]);
    setKnots([]);
    setStatements([]);
    setError(null);
    setInfo(null);
    setSaveInfo(null);
    setLastStatus("idle");
    setMetaEditingId(null);
  };

  const handleSave = () => {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          text,
          savedAt: new Date().toISOString(),
        })
      );
      setSaveInfo(
        "Dein Beitrag wurde lokal im Browser gespeichert (nicht auf dem Server). Du kannst ihn später in diesem Browser wieder aufrufen."
      );
    } catch {
      setSaveInfo(
        "Speichern im Browser ist fehlgeschlagen. Kopiere deinen Text bitte vorsichtshalber in ein Dokument."
      );
    }
  };

  const layoutClass =
    viewLevel >= 2
      ? "grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,1.1fr)]"
      : "grid gap-4 lg:grid-cols-[minmax(0,1.8fr)] max-w-4xl mx-auto";

  const analyzeButtonLabel =
    isAnalyzing
      ? textContent(analyzeButtonTexts, "running")
      : lastStatus === "error" || lastStatus === "empty"
      ? textContent(analyzeButtonTexts, "retry")
      : textContent(analyzeButtonTexts, "start");

  const requiredLevel =
    viewLevel >= 2
      ? VERIFICATION_REQUIREMENTS.contribution_level2
      : VERIFICATION_REQUIREMENTS.contribution_level1;
  const meetsLevel = meetsVerificationLevel(verificationLevel, requiredLevel);
  const analyzeDisabled =
    isAnalyzing || !text.trim() || levelStatus === "loading" || !meetsLevel;
  const gatingMessage =
    levelStatus === "login_required"
      ? "Bitte melde dich an, um Beiträge zu analysieren."
      : levelStatus === "error"
      ? "Level konnte nicht geladen werden – bitte später erneut versuchen."
      : !meetsLevel
      ? `Für diese Ansicht benötigst du mindestens Verifizierungs-Level "${requiredLevel}".`
      : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[linear-gradient(180deg,#e9f6ff_0%,#c0f8ff_45%,#a4fcec_100%)]">
      <div className="container-vog space-y-4 pb-10 pt-6">
        {/* Hinweis oben */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-2 text-xs text-sky-800">
          {textContent(pageCopy, "info")}{" "}
          <Link href="/statements/new" className="font-semibold underline">
            /statements/new
          </Link>
          .
        </div>

        {/* Level-Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="vog-head">{textContent(pageCopy, "title")}</h1>
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
            {levelOptions.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => setViewLevel(lvl.id)}
                className={[
                  "rounded-full px-3 py-1 transition",
                  viewLevel === lvl.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900",
                ].join(" ")}
              >
                {textContent(lvl, "label")}
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div className={layoutClass}>
          {/* Links: Notizen (nur Level 2, Desktop) */}
          <div
            className={
              viewLevel >= 2 ? "hidden lg:flex lg:flex-col gap-3" : "hidden"
            }
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Kontext (Notizen)
            </h2>
            {notes.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                Noch keine Notizen. Wenn die Analyse relevante Kontextstellen
                erkennt, erscheinen sie hier.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm"
                >
                  <InlineEditableText
                    value={note.body}
                    onChange={(val) => updateNote(note.id, val)}
                    label={note.title}
                  />
                </div>
              ))
            )}
          </div>

          {/* Mitte: Editor + Statements */}
          <div className="flex flex-col gap-4">
            {/* Editor */}
            <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Diesen Beitrag (Editor-Ansicht)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Du kannst deinen Beitrag später jederzeit überarbeiten.
                    Speicherung erfolgt derzeit lokal in deinem Browser.
                  </p>
                </div>
                <div className="text-[11px] text-slate-500">
                  Sprache: <span className="font-medium uppercase">{locale}</span>
                </div>
              </div>

              <HighlightedTextarea
                value={text}
                onChange={setText}
                analyzing={isAnalyzing}
                rows={14}
              />

              {/* Buttons */}
              <div className="mt-3 flex flex-col items-center gap-1 text-[11px] text-slate-500">
                <span>{text.length} Zeichen</span>
                <div className="inline-flex gap-2 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={analyzeDisabled}
                    className="rounded-full bg-sky-500 px-5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analyzeButtonLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-full border border-slate-300 px-4 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Zurücksetzen
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-full border border-emerald-300 px-4 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  >
                    Speichern
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700 space-y-1">
                  <p>{error}</p>
                  <p>
                    Wenn das häufiger passiert, gib uns bitte kurz Bescheid über
                    unsere{" "}
                    <Link
                      href="/kontakt"
                      className="underline font-semibold text-rose-700"
                    >
                      Kontakt-Seite
                    </Link>
                    .
                  </p>
                </div>
              )}

              {saveInfo && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                  {saveInfo}
                </p>
              )}

              {info && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                  {info}
                </p>
              )}
            </div>

            {/* Statements + Voting */}
            <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  Abgeleitete Statements (Claims)
                </h2>
                <div className="text-[11px] text-slate-500">
                  {statements.length} Statements zu diesem Beitrag
                </div>
              </div>

              <div className="space-y-3 max-w-2xl mx-auto">
                {statements.map((s) => {
                  const inMetaEdit = metaEditingId === s.id;

                  return (
                    <div
                      key={s.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm"
                    >
                      {/* Header: Titel + Meta + Badges */}
                      <div className="mb-2 flex flex-col gap-1 text-[11px] text-slate-500">
                        {inMetaEdit ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              className="min-w-[120px] flex-1 rounded-full border border-sky-200 bg-white px-3 py-0.5 text-[11px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-300"
                              placeholder={`Titel (z.B. „Tierwohl-Standard Stufe 4“)`}
                              value={s.title ?? ""}
                              onChange={(e) =>
                                updateStatementMeta(s.id, {
                                  title: e.target.value,
                                })
                              }
                            />
                            <input
                              type="text"
                              className="min-w-[120px] rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-300"
                              placeholder="Zuständigkeit (z.B. Bund, EU, Kommune …)"
                              value={s.responsibility ?? ""}
                              onChange={(e) =>
                                updateStatementMeta(s.id, {
                                  responsibility: e.target.value,
                                })
                              }
                            />
                            <input
                              type="text"
                              className="min-w-[120px] rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-300"
                              placeholder="Topic (z.B. Tierwohl, Sicherheit …)"
                              value={s.topic ?? ""}
                              onChange={(e) =>
                                updateStatementMeta(s.id, {
                                  topic: e.target.value,
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sky-50 px-3 py-0.5 text-[11px] font-semibold text-sky-700">
                              Hauptkategorie:{" "}
                              <span className="font-bold text-sky-800">
                                {s.title && s.title.trim().length > 0
                                  ? s.title
                                  : `Statement #${s.index + 1}`}
                              </span>
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">
                              Zuständigkeit:{" "}
                              <span className="font-medium">
                                {s.responsibility || "–"}
                              </span>
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">
                              Topic:{" "}
                              <span className="font-medium">
                                {s.topic || "–"}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {s.locallyEdited && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                              Änderung wird redaktionell geprüft
                            </span>
                          )}
                          {s.flagged && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                              Zur Prüfung gemeldet
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Statement-Text mit ✏️-Editor */}
                      <InlineEditableText
                        value={s.text}
                        onChange={(val) => updateStatementText(s.id, val)}
                      />

                      {/* Voting */}
                      <div className="mt-3 space-y-2 text-[11px] text-slate-600 text-center">
                        <div className="font-semibold text-slate-700">
                          Deine aktuelle Stimme (manuell auswählbar)
                        </div>
                        <div className="inline-flex flex-wrap justify-center gap-2">
                          {[
                            {
                              id: "pro" as const,
                              label: "Zustimmen",
                              icon: "👍",
                              activeClass:
                                "border-emerald-400 bg-emerald-50 text-emerald-700",
                            },
                            {
                              id: "neutral" as const,
                              label: "Neutral",
                              icon: "😐",
                              activeClass:
                                "border-sky-400 bg-sky-50 text-sky-700",
                            },
                            {
                              id: "contra" as const,
                              label: "Ablehnen",
                              icon: "👎",
                              activeClass:
                                "border-rose-400 bg-rose-50 text-rose-700",
                            },
                          ].map((opt) => {
                            const active = s.vote === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setVote(s.id, opt.id)}
                                className={[
                                  "flex items-center gap-2 rounded-full border-2 px-4 py-1.5 font-semibold shadow-sm transition",
                                  active
                                    ? opt.activeClass
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                                ].join(" ")}
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs">
                                  {opt.icon}
                                </span>
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer: Qualität + Aktionen (melden/ändern/entfernen) */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                        {s.quality ? (
                          <div className="grid grid-cols-2 gap-1">
                            <span>
                              Präzision:{" "}
                              <span className="font-semibold">
                                {s.quality.precision.toFixed(2)}
                              </span>
                            </span>
                            <span>
                              Prüfbar:{" "}
                              <span className="font-semibold">
                                {s.quality.testability.toFixed(2)}
                              </span>
                            </span>
                            <span>
                              Lesbarkeit:{" "}
                              <span className="font-semibold">
                                {s.quality.readability.toFixed(2)}
                              </span>
                            </span>
                            <span>
                              Balance:{" "}
                              <span className="font-semibold">
                                {s.quality.balance.toFixed(2)}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            (Keine Qualitätsmetriken für dieses Statement
                            übermittelt.)
                          </span>
                        )}

                        <div className="ml-auto flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => reportStatement(s.id)}
                            className="text-[10px] text-slate-500 hover:text-rose-700 hover:underline"
                          >
                            melden
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMetaEditingId(
                                metaEditingId === s.id ? null : s.id
                              )
                            }
                            className="text-[10px] text-slate-500 hover:text-sky-700 hover:underline"
                          >
                            {metaEditingId === s.id ? "Änderung schließen" : "ändern"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStatement(s.id)}
                            className="text-[10px] text-slate-500 hover:text-rose-700 hover:underline"
                          >
                            entfernen
                          </button>
                </div>
                {gatingMessage && (
                  <p className="text-xs font-semibold text-rose-600">{gatingMessage}</p>
                )}
              </div>
            </div>
                  );
                })}

                {!statements.length && !info && (
                  <p className="text-sm text-slate-500">
                    Noch keine Statements vorhanden. Sie erscheinen nur, wenn
                    die Analyse erfolgreich war und der KI-Dienst klare
                    Einzel-Statements liefern konnte.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rechts: Fragen & Knoten (nur Level 2) */}
          <div
            className={
              viewLevel >= 2 ? "hidden lg:flex lg:flex-col gap-3" : "hidden"
            }
          >
            <div className="space-y-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fragen zum Weiterdenken
                </h2>
                {questions.length === 0 ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Noch keine Fragen. Wenn die Analyse vertiefende Fragen
                    ableitet, erscheinen sie hier.
                  </p>
                ) : (
                  <div className="mt-1 space-y-2">
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm"
                      >
                        <InlineEditableText
                          value={q.body}
                          onChange={(val) => updateQuestion(q.id, val)}
                          label={
                            q.category ? `${q.label} · ${q.category}` : q.label
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Knoten (Themenschwerpunkte)
                </h2>
                {knots.length === 0 ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Noch keine Knoten. Sobald die Analyse zentrale
                    Themenschwerpunkte erkennt, erscheinen sie hier.
                  </p>
                ) : (
                  <div className="mt-1 space-y-2">
                    {knots.map((k) => (
                      <div
                        key={k.id}
                        className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm"
                      >
                        <InlineEditableText
                          value={k.body}
                          onChange={(val) => updateKnot(k.id, val)}
                          label={`${k.title}${
                            k.category ? ` · ${k.category}` : ""
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
