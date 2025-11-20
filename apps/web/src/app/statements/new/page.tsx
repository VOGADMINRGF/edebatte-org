// apps/web/src/app/statements/new/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  HighlightedTextarea,
} from "@/app/(components)/HighlightedTextarea";
import {
  normalizeClaim,
  type NormalizedClaim,
} from "@/app/(components)/normalizeClaim";

type VoteKind = "pro" | "neutral" | "contra" | null;

type SimpleStatement = NormalizedClaim & {
  vote: VoteKind;
  locallyEdited?: boolean; // lokal angepasst → redaktionelle Prüfung
  flagged?: boolean;       // vom User gemeldet
};

const STORAGE_KEY = "vog_statement_draft_v1";
const MAX_LEVEL1_STATEMENTS = 3;

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
    setLastStatus("idle");
    setEditingId(null);
    setEditingDraft("");

    try {
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, locale: "de" }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const result = data.result ?? data;
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
            Text in bis zu drei klare Statements, zu denen du (und andere)
            später einfach zustimmen, neutral bleiben oder ablehnen kannst.
            Für eine ausführlichere Analyse kannst du jederzeit auf Level 2
            wechseln.
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
                möchtest. Keine Fachsprache nötig.
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
                auf dem Server.
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

        {/* Statements / Bürgeransicht */}
        <section className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Abgeleitete Statements (Bürgeransicht)
            </h2>
            <span className="text-[11px] text-slate-400">
              {totalStatements > 0
                ? `${totalStatements} Statements zu diesem Beitrag (hier werden max. ${MAX_LEVEL1_STATEMENTS} angezeigt)`
                : "Noch keine Statements – die Analyse muss zuerst erfolgreich durchlaufen."}
            </span>
          </div>

          {info && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-[11px] text-slate-700">
              {info}
            </div>
          )}

          {visibleStatements.length > 0 && (
            <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-4 max-w-2xl mx-auto">
              {visibleStatements.map((s) => {
                const isEditing = editingId === s.id;

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

              {totalStatements > MAX_LEVEL1_STATEMENTS && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Es werden nur die ersten {MAX_LEVEL1_STATEMENTS} Statements
                  angezeigt. Die vollständige Analyse findest du in der{" "}
                  <Link
                    href="/contributions/new"
                    className="font-semibold text-sky-700 underline"
                  >
                    Mehr-Fakten-Ansicht (Level 2)
                  </Link>
                  .
                </p>
              )}

              <div className="mt-4 text-right text-[11px]">
                <Link
                  href="/contributions/new"
                  className="underline text-sky-700 font-semibold"
                >
                  Mehr Details &amp; Evidenz anzeigen (Level 2)
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
