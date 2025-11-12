"use client";
import * as React from "react";
import { LeftSide, type Note } from "./LeftSide";
import { RightSide, type Chip } from "./RightSide";
import { MainEditor, type Outline, type AnalyzeResult } from "./MainEditor";

/** Hilfen zum Robust-Mapping (API liefert je nach Stage unterschiedliche Keys) */
function pickArray<T = any>(obj: any, keys: string[]): T[] {
  for (const k of keys) {
    const v = obj?.[k];
    if (Array.isArray(v) && v.length) return v as T[];
  }
  return [];
}
const textOf = (x: any) =>
  (x?.summary ?? x?.label ?? x?.title ?? x?.text ?? (typeof x === "string" ? x : "")) as string;

function deriveNotes(result: AnalyzeResult): Note[] {
  const raw =
    pickArray(result, ["outline", "sections", "excerpts", "notes", "contexts", "hints"]) ||
    [];
  if (raw.length) {
    return raw.map((o: any, i) => ({
      id: o?.id ?? `n${i}`,
      text: textOf(o),
      start: typeof o?.start === "number" ? o.start : undefined,
    }));
  }
  // Fallback aus Text (erste 2–3 Absätze kurz zusammenziehen)
  const src = result.sourceText ?? "";
  const paras = src.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return paras.map((p, i) => ({ id: `nf${i}`, text: p.slice(0, 180) }));
}

function deriveChips(result: AnalyzeResult, keyList: string[], defaults: string[]): Chip[] {
  const arr = pickArray(result, keyList);
  if (arr.length) return arr.map((q: any, i) => ({ id: q?.id ?? `${keyList[0]}${i}`, text: textOf(q) }));
  return defaults.map((t, i) => ({ id: `${keyList[0]}D${i}`, text: t }));
}

export default function ContributionAnalyzePage() {
  const [outline, setOutline] = React.useState<Outline[]>([]);
  const [claims, setClaims] = React.useState<any[]>([]);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [questions, setQuestions] = React.useState<Chip[]>([]);
  const [knots, setKnots] = React.useState<Chip[]>([]);
  const [editorHeight, setEditorHeight] = React.useState(0);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const hasData =
    outline.length + notes.length + questions.length + knots.length + claims.length > 0;

  function handleResult(res: AnalyzeResult) {
    // Outline & Claims direkt setzen (wenn vorhanden)
    setOutline(res.outline ?? []);
    setClaims(res.claims ?? []);

    // Notizen/Fragen/Knoten robust ableiten (+ Fallbacks)
    setNotes(deriveNotes(res));
    setQuestions(
      deriveChips(
        res,
        ["questions", "clarifications", "asks"],
        [
          "Welche Zuständigkeit ist betroffen? (EU/Bund/Land/Kommune)",
          "Welche Standards gelten aktuell in Nachbarländern?",
          "Welche empirischen Quellen liegen vor (Zeitreihen, Benchmarks)?",
          "Welche Kosten/Nutzen-Folgen ergeben sich (Personal, Qualität)?",
        ]
      )
    );
    setKnots(
      deriveChips(
        res,
        ["knots", "nodes", "links"],
        [
          "Knoten: Tierhaltung – Stufen & Mindeststandard",
          "Knoten: Internationale Abkommen – Diskussionsstand",
          "Knoten: Berufsgruppen & Finanzierung – Respekt & Ressourcen",
        ]
      )
    );
  }

  function onJump(offset: number) {
    (window as any).__edbtt_jumpTo?.(offset);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <h1 className="mb-2 text-4xl font-extrabold tracking-tight">
        <span className="bg-gradient-to-r from-[#06b6d4] to-[#2196F3] bg-clip-text text-transparent">eDebatte</span>{" "}
        – Deine Anliegen, sauber analysiert.
      </h1>
      <p className="mb-8 max-w-3xl text-[15px] text-neutral-700">
        Schreibe frei – wir extrahieren Kernaussagen, ordnen Themen zu und zeigen die Schritte transparent.
      </p>

      {/* Start: 1 Spalte; nach Analyse weich auf 3 Spalten 15/55/30 */}
      <div
        className={[
          "grid gap-8 transition-all duration-700 ease-in-out",
          hasData ? "md:grid-cols-3" : "grid-cols-1",
        ].join(" ")}
        style={{
          gridTemplateColumns: hasData ? "15% 55% 30%" : "100%",
          alignItems: "start",
        }}
      >
        {hasData && (
          <div className="animate-swipe-in-left">
            <LeftSide
              notes={notes}
              editorHeight={editorHeight}
              activeId={activeId}
              onJump={onJump}
            />
          </div>
        )}

        <div className={hasData ? "animate-fade-in-up" : "animate-fade-in-up-delayed relative"}>
          <MainEditor
            onResult={handleResult}
            outline={outline}
            claims={claims}
            onHeight={setEditorHeight}
            onActiveOutline={setActiveId}
            hasData={hasData}
          />
        </div>

        {hasData && (
          <div className="animate-swipe-in-right">
            <RightSide
              questions={questions}
              knots={knots}
              editorHeight={editorHeight}
              onJump={onJump}
            />
          </div>
        )}
      </div>

      {hasData && claims.length > 0 && (
        <section className="mt-12 rounded-2xl border bg-white/80 p-5 backdrop-blur">
          <div className="mb-4 text-sm font-semibold tracking-tight text-neutral-700">
            Statements aus deinem Beitrag
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {claims.slice(0, 12).map((c: any, i) => (
              <article
                key={i}
                className="card-soft group flex h-full flex-col rounded-2xl border bg-white/90 p-4 transition hover:-translate-y-[2px] hover:shadow-xl"
              >
                <h3 className="mb-1 text-[13px] font-semibold">
                  {(c.title ?? c.text ?? "Statement").slice(0, 140)}
                </h3>
                <p className="mb-4 grow text-[13px] text-neutral-800">
                  {c.summary ?? c.text ?? ""}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {["pos:Zustimmen", "neu:Neutral", "neg:Ablehnen"].map((t) => {
                    const [v, lbl] = t.split(":");
                    return (
                      <label key={v} className={`toggle-chip variant-${v}`}>
                        <input name={`v${i}`} type="radio" />
                        <span>{lbl}</span>
                      </label>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
