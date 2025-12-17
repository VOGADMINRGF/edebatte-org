// apps/web/src/app/statements/new/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import AnalyzeProgress from "@/components/contributions/AnalyzeProgress";
import { ImpactSection, ResponsibilitySection } from "@/components/contributions/ImpactResponsibilitySection";
import { ConsequencesPreviewCard, ResponsibilityPreviewCard } from "@features/statement/components/StatementImpactPreview";
import {
  HighlightedTextarea,
} from "@/app/(components)/HighlightedTextarea";
import {
  normalizeClaim,
  type NormalizedClaim,
} from "@/app/(components)/normalizeClaim";
import type { AnalyzeResult, ImpactAndResponsibility, ResponsibilityPath } from "@features/analyze/schemas";

type VoteKind = "pro" | "neutral" | "contra" | null;

type SimpleStatement = NormalizedClaim & {
  vote: VoteKind;
  locallyEdited?: boolean; // lokal angepasst → redaktionelle Prüfung
  flagged?: boolean;       // vom User gemeldet
};

const STORAGE_KEY = "vog_statement_draft_v1";
const MAX_LEVEL1_STATEMENTS = 3;
const LEVEL_OPTIONS = [
  { id: 1 as 1 | 2 | 3 | 4, label: "Level 1 – Kurz" },
  { id: 2 as 1 | 2 | 3 | 4, label: "Level 2 – Statements" },
  { id: 3 as 1 | 2 | 3 | 4, label: "Level 3 – Impact & Zuständigkeiten" },
  { id: 4 as 1 | 2 | 3 | 4, label: "Level 4 – Deep" },
];

/** Nur 1:1-Übernahme aus der API – KEINE Heuristik */
function mapClaimToStatement(raw: any, idx: number): SimpleStatement | null {
  const normalized = normalizeClaim(raw, idx);
  if (!normalized) return null;

  return {
    ...normalized,
    vote: null,
    locallyEdited: false,
    flagged: false,
  };
}

export default function StatementsNewPage() {
  const [text, setText] = React.useState("");
  const [statements, setStatements] = React.useState<SimpleStatement[]>([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [saveInfo, setSaveInfo] = React.useState<string | null>(null);
  const [lastStatus, setLastStatus] = React.useState<
    "idle" | "success" | "error" | "empty"
  >("idle");
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeResult | null>(null);
  const [viewLevel, setViewLevel] = React.useState<1 | 2 | 3 | 4>(1);
  const [impactAndResponsibility, setImpactAndResponsibility] = React.useState<ImpactAndResponsibility>({
    impacts: [],
    responsibleActors: [],
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingDraft, setEditingDraft] = React.useState("");

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
      // egal
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const reportStatement = (id: string) => {
    setStatements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, flagged: true } : s))
    );
    setInfo(
      "Danke für deinen Hinweis. Das Statement wurde zur redaktionellen Prüfung markiert. Deine eigene Stimme bleibt davon unberührt."
    );
  };

  const removeStatement = (id: string) => {
    setStatements((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingDraft("");
    }
  };

  const handleStartEdit = (s: SimpleStatement) => {
    setEditingId(s.id);
    setEditingDraft(s.text);
    setInfo(null);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const trimmed = editingDraft.trim();
    if (!trimmed) {
      setInfo(
        "Ein Statement-Text darf nicht komplett leer sein. Bitte formuliere ihn kurz um oder brich die Änderung ab."
      );
      return;
    }
    updateStatementText(editingId, trimmed);
    setEditingId(null);
    setEditingDraft("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingDraft("");
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    setInfo(null);
    setSaveInfo(null);
    setStatements([]);
    setAnalysisResult(null);
    setImpactAndResponsibility({ impacts: [], responsibleActors: [] });
    setLastStatus("idle");
    setEditingId(null);
    setEditingDraft("");

    try {
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, locale: "de" }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.message || data?.error || `Analyse fehlgeschlagen (HTTP ${res.status}).`,
        );
      }

      const result = data.result ?? data;
      setAnalysisResult(result as AnalyzeResult);
      const impactBlock = (result as any)?.impactAndResponsibility;
      const impactAndResponsibilityLocal: ImpactAndResponsibility = {
        impacts: Array.isArray(impactBlock?.impacts) ? impactBlock.impacts : [],
        responsibleActors: Array.isArray(impactBlock?.responsibleActors)
          ? impactBlock.responsibleActors
          : [],
      };
      setImpactAndResponsibility(impactAndResponsibilityLocal);
      const rawClaims: any[] = Array.isArray(result?.claims)
        ? result.claims
        : [];

      const mapped = rawClaims
        .map(mapClaimToStatement)
        .filter((x): x is SimpleStatement => x !== null);

      if (mapped.length > 0) {
        setStatements(mapped);
        setLastStatus("success");
        setInfo(null);
      } else {
        setStatements([]);
        setLastStatus("empty");
        setInfo(
          "Die Analyse konnte aus deinem Text im Moment keine klaren Einzel-Statements ableiten. Deine Eingabe bleibt oben erhalten – du kannst sie leicht anpassen (z.B. kürzere Sätze) und die Analyse gleich erneut starten."
        );
      }
    } catch (e: any) {
      console.error("[Level1] analyze error", e);
      setStatements([]);
      setAnalysisResult(null);
      setImpactAndResponsibility({ impacts: [], responsibleActors: [] });
      setLastStatus("error");
      setError(
        "Die Analyse ist leider fehlgeschlagen. Vermutlich gab es ein Problem mit dem KI-Dienst oder der Antwort."
      );
      setInfo(
        "Dein Beitrag oben bleibt unverändert erhalten. Du kannst es in einem kurzen Moment mit „Erneut versuchen“ noch einmal probieren."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setText("");
    setStatements([]);
    setError(null);
    setInfo(null);
    setSaveInfo(null);
    setAnalysisResult(null);
    setImpactAndResponsibility({ impacts: [], responsibleActors: [] });
    setLastStatus("idle");
    setEditingId(null);
    setEditingDraft("");
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
        "Dein Beitrag wurde lokal im Browser gespeichert (nicht auf dem Server). Solange du diesen Browser nutzt, kannst du später daran weiterarbeiten."
      );
    } catch {
      setSaveInfo(
        "Speichern im Browser ist fehlgeschlagen. Kopiere deinen Text zur Sicherheit bitte kurz in ein Dokument."
      );
    }
  };

  const analyzeButtonLabel =
    isAnalyzing
      ? "Analyse läuft …"
      : lastStatus === "error" || lastStatus === "empty"
      ? "Erneut versuchen"
      : "Analyse starten";

  const totalStatements = statements.length;
  const visibleStatements = statements.slice(0, MAX_LEVEL1_STATEMENTS);
  const levelStatements = viewLevel === 1 ? visibleStatements : statements;
  const responsibilityPaths: ResponsibilityPath[] = Array.isArray(
    analysisResult?.responsibilityPaths,
  )
    ? analysisResult?.responsibilityPaths ?? []
    : [];
  const questions = Array.isArray(analysisResult?.questions) ? analysisResult?.questions ?? [] : [];
  const notes = Array.isArray(analysisResult?.notes) ? analysisResult?.notes ?? [] : [];
  const knots = Array.isArray(analysisResult?.knots) ? analysisResult?.knots ?? [] : [];
  const eventualities = Array.isArray(analysisResult?.eventualities)
    ? analysisResult?.eventualities ?? []
    : [];
  const decisionTrees = Array.isArray(analysisResult?.decisionTrees)
    ? analysisResult?.decisionTrees ?? []
    : [];
  const consequences = Array.isArray(analysisResult?.consequences?.consequences)
    ? analysisResult?.consequences?.consequences ?? []
    : [];
  const consequenceResponsibilities = Array.isArray(analysisResult?.consequences?.responsibilities)
    ? analysisResult?.consequences?.responsibilities ?? []
    : [];
  const report = analysisResult?.report ?? null;
  const progressSteps: { key: string; label: string; state: "empty" | "running" | "failed" | "done"; reason?: string }[] = [
    {
      key: "short",
      label: "Kurz",
      state: isAnalyzing
        ? "running"
        : report?.summary || totalStatements > 0
        ? "done"
        : lastStatus === "error"
        ? "failed"
        : "empty",
    },
    {
      key: "claims",
      label: "Statements",
      state: isAnalyzing
        ? "running"
        : totalStatements > 0
        ? "done"
        : lastStatus === "error"
        ? "failed"
        : "empty",
    },
    {
      key: "impact",
      label: "Impact & Zuständigkeiten",
      state: isAnalyzing
        ? "running"
        : impactAndResponsibility.impacts?.length ||
          impactAndResponsibility.responsibleActors?.length ||
          responsibilityPaths.length
        ? "done"
        : lastStatus === "error"
        ? "failed"
        : "empty",
    },
    {
      key: "deep",
      label: "Deep",
      state: isAnalyzing
        ? "running"
        : questions.length ||
          knots.length ||
          eventualities.length ||
          decisionTrees.length ||
          report
        ? "done"
        : lastStatus === "error"
        ? "failed"
        : "empty",
    },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50 to-emerald-100">
      <div className="container-vog py-10 space-y-8">
        {/* Kopf */}
        <header className="text-center space-y-2">
          <h1 className="vog-head text-2xl sm:text-3xl">
            Dein Statement – in klare Abstimmungsfragen übersetzt
          </h1>
          <p className="max-w-2xl mx-auto text-sm text-slate-600">
            Schreib frei heraus, was dich beschäftigt. Wir verwandeln deinen
            Text in bis zu drei präzise Statements, zu denen du (und andere)
            später einfach zustimmen, neutral bleiben oder ablehnen kannst.
            Für die vollständige Liste, Quellen und (bald) Datei-/Link-Upload
            kannst du jederzeit auf Level 2 wechseln.
          </p>
        </header>

        {/* Beitrag-Editor */}
        <section className="flex justify-center">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-sm border border-slate-100 p-4 sm:p-6">
            <header className="mb-3">
              <div className="text-xs font-semibold text-slate-700">
                DEIN BEITRAG
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Formuliere in deinen Worten, was dich stört oder was du ändern
                möchtest. Keine Fachsprache nötig. Uploads (PDF/Link) folgen
                bald – füge deinen Text vorerst direkt hier ein.
              </p>
            </header>

            <HighlightedTextarea
              value={text}
              onChange={setText}
              analyzing={isAnalyzing}
              rows={12}
              placeholder="Schreibe hier deinen Beitrag …"
              textareaClassName="rounded-2xl border-slate-200 bg-slate-50/70 focus:border-sky-400"
              overlayClassName="rounded-2xl"
            />

            <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500">
              <span>{text.length}/4000 Zeichen</span>
              <span>
                Hinweis: Speichern erfolgt derzeit lokal in deinem Browser, nicht
                auf dem Server. Upload- und Link-Auswertungen starten später in
                Level 2.
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !text.trim()}
                className="rounded-full bg-sky-600 px-6 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzeButtonLabel}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-slate-300 px-5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-full border border-emerald-300 px-5 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              >
                Speichern
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[11px] text-rose-700 space-y-1">
                <p>{error}</p>
                <p>
                  Wenn der Fehler wiederholt auftritt, melde dich bitte kurz
                  über unsere{" "}
                  <Link
                    href="/kontakt"
                    className="underline font-semibold text-rose-700"
                  >
                    Kontakt-Seite
                  </Link>{" "}
                  und nenne Zeitpunkt und ungefähre Textlänge.
                </p>
              </div>
            )}

            {saveInfo && (
              <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                {saveInfo}
              </p>
            )}
          </div>
        </section>

        {/* Analyse-Levels */}
        <section className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Analyse-Ansicht</h2>
              <p className="text-[11px] text-slate-500">
                Wähle den Detailgrad deiner Analyse (Level 1–4).
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-xs">
              {LEVEL_OPTIONS.map((lvl) => (
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
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <AnalyzeProgress steps={progressSteps} />

          {viewLevel <= 2 && (
            <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-4 max-w-2xl mx-auto">
              {viewLevel === 1 && (
                <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Kurzfassung
                  </p>
                  {report?.summary ? (
                    <p className="mt-1 text-sm text-slate-800">{report.summary}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      Noch keine Zusammenfassung vorhanden.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {viewLevel === 1 ? "Top-Statements" : "Alle Statements"}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {totalStatements > 0
                    ? viewLevel === 1
                      ? `${totalStatements} Statements gesamt (Top ${MAX_LEVEL1_STATEMENTS})`
                      : `${totalStatements} Statements zu diesem Beitrag`
                    : "Noch keine Statements – die Analyse muss zuerst erfolgreich durchlaufen."}
                </span>
              </div>

              {info && (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-[11px] text-slate-700">
                  {info}
                </div>
              )}

              {levelStatements.length > 0 ? (
                <div className="mt-3">
                  {levelStatements.map((s) => {
                    const isEditing = editingId === s.id;
                    const stanceLabel =
                      s.stance === "pro"
                        ? "pro"
                        : s.stance === "contra"
                        ? "contra"
                        : s.stance === "neutral"
                        ? "neutral"
                        : null;

                    return (
                      <div
                        key={s.id}
                        className="border-b last:border-b-0 border-slate-100 py-3"
                      >
                        {/* Header: Hauptkategorie + Zuständigkeit/Topic + Badges */}
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center rounded-full bg-sky-50 px-3 py-0.5 font-semibold text-sky-700">
                            Hauptkategorie:{" "}
                            <span className="ml-1 font-bold text-sky-800">
                              {s.title || `Statement #${s.index + 1}`}
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
                          {stanceLabel && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">
                              Haltung:{" "}
                              <span className="font-medium">{stanceLabel}</span>
                            </span>
                          )}
                          {typeof s.importance === "number" && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                              Wichtigkeit:{" "}
                              <span className="font-medium">{s.importance}/5</span>
                            </span>
                          )}
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

                        {/* Text / Edit-Modus */}
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                              rows={3}
                              value={editingDraft}
                              onChange={(e) => setEditingDraft(e.target.value)}
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                Änderung wird redaktionell geprüft, sobald du sie
                                speicherst.
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="text-slate-500 hover:text-slate-700 hover:underline"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveEdit}
                                  className="text-sky-600 font-semibold hover:text-sky-800 hover:underline"
                                >
                                  Speichern
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-900 leading-relaxed">
                            {s.text}
                          </p>
                        )}

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

                        {/* Footer: melden / ändern / entfernen */}
                        <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-slate-500">
                          <button
                            type="button"
                            onClick={() => reportStatement(s.id)}
                            className="hover:text-rose-700 hover:underline"
                          >
                            melden
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              isEditing ? handleCancelEdit() : handleStartEdit(s)
                            }
                            className="hover:text-sky-700 hover:underline"
                          >
                            {isEditing ? "Änderung schließen" : "ändern"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStatement(s.id)}
                            className="hover:text-rose-700 hover:underline"
                          >
                            entfernen
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {viewLevel === 1 && totalStatements > MAX_LEVEL1_STATEMENTS && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        Es werden nur die ersten {MAX_LEVEL1_STATEMENTS} Statements
                        angezeigt.
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewLevel(2)}
                        className="font-semibold text-sky-700 underline"
                      >
                        Alle Statements ansehen
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                !info && (
                  <p className="mt-3 text-sm text-slate-500">
                    Noch keine Statements vorhanden. Sie erscheinen nur, wenn
                    die Analyse erfolgreich war und der KI-Dienst klare
                    Einzel-Statements liefern konnte.
                  </p>
                )
              )}
            </div>
          )}

          {viewLevel === 3 && (
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Mögliche Folgen</h3>
                    {impactAndResponsibility.impacts?.length ? (
                      <span className="text-[11px] text-slate-500">
                        {impactAndResponsibility.impacts.length} Vorschläge
                      </span>
                    ) : null}
                  </div>
                  <ImpactSection
                    impacts={impactAndResponsibility.impacts ?? []}
                    onChange={(next) =>
                      setImpactAndResponsibility((prev) => ({ ...prev, impacts: next }))
                    }
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Wer wäre zuständig?</h3>
                    {impactAndResponsibility.responsibleActors?.length ? (
                      <span className="text-[11px] text-slate-500">
                        {impactAndResponsibility.responsibleActors.length} Vorschläge
                      </span>
                    ) : null}
                  </div>
                  <ResponsibilitySection
                    actors={impactAndResponsibility.responsibleActors ?? []}
                    onChange={(next) =>
                      setImpactAndResponsibility((prev) => ({
                        ...prev,
                        responsibleActors: next,
                      }))
                    }
                  />
                </div>
              </div>

              <ResponsibilityPreviewCard
                responsibilities={consequenceResponsibilities}
                paths={responsibilityPaths}
                showPathOverlay
              />
            </div>
          )}

          {viewLevel === 4 && (
            <div className="space-y-3">
              <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Kontext (Notizen)
                </summary>
                {notes.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Noch keine Notizen vorhanden.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {notes.map((note: any, idx: number) => (
                      <li key={note.id ?? `note-${idx}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {note.kind ?? `Notiz ${idx + 1}`}
                        </p>
                        <p className="text-sm text-slate-800">{note.text ?? String(note)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Fragen zum Weiterdenken
                </summary>
                {questions.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Noch keine Fragen vorhanden.
                  </p>
                ) : (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                    {questions.map((q: any, idx: number) => (
                      <li key={q.id ?? `q-${idx}`}>{q.text ?? q.body ?? String(q)}</li>
                    ))}
                  </ul>
                )}
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Knoten (Themenschwerpunkte)
                </summary>
                {knots.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Noch keine Knoten vorhanden.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {knots.map((k: any, idx: number) => (
                      <li key={k.id ?? `k-${idx}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {k.label ?? `Knoten ${idx + 1}`}
                        </p>
                        <p className="text-sm text-slate-800">{k.description ?? k.text ?? String(k)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Eventualitäten &amp; Entscheidungsbäume
                </summary>
                {eventualities.length === 0 && decisionTrees.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    Noch keine Eventualitäten oder Decision Trees vorhanden.
                  </p>
                ) : (
                  <div className="mt-2 space-y-3 text-sm text-slate-700">
                    {eventualities.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Eventualitäten</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {eventualities.map((e: any, idx: number) => (
                            <li key={e.id ?? `ev-${idx}`}>{e.text ?? e.label ?? String(e)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {decisionTrees.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Decision Trees</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {decisionTrees.map((d: any, idx: number) => (
                            <li key={d.id ?? `dt-${idx}`}>{d.title ?? d.label ?? d.text ?? String(d)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Folgen &amp; Zuständigkeiten
                </summary>
                <div className="mt-3 space-y-3">
                  <ConsequencesPreviewCard
                    consequences={consequences}
                    responsibilities={consequenceResponsibilities}
                  />
                  <ResponsibilityPreviewCard
                    responsibilities={consequenceResponsibilities}
                    paths={responsibilityPaths}
                    showPathOverlay
                  />
                </div>
              </details>

              <details className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  Bericht
                </summary>
                {report ? (
                  <div className="mt-3 space-y-3 text-sm text-slate-800">
                    {report.summary && <p>{report.summary}</p>}
                    {Array.isArray(report.keyConflicts) && report.keyConflicts.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Konfliktlinien</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {report.keyConflicts.map((c: string, idx: number) => (
                            <li key={`${c}-${idx}`}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {report.facts && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Fakten (lokal)</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {(report.facts.local ?? []).map((f: string, idx: number) => (
                              <li key={`f-l-${idx}`}>{f}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500">Fakten (international)</p>
                          <ul className="mt-1 list-disc space-y-1 pl-4">
                            {(report.facts.international ?? []).map((f: string, idx: number) => (
                              <li key={`f-i-${idx}`}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    {Array.isArray(report.takeaways) && report.takeaways.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">Takeaways</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4">
                          {report.takeaways.map((c: string, idx: number) => (
                            <li key={`t-${idx}`}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Noch kein Bericht vorhanden.
                  </p>
                )}
              </details>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
