"use client";
import * as React from "react";

export type Outline = { id: string; label: string; summary: string; start: number; end: number };
export type AnalyzeResult = {
  outline?: Outline[];
  claims?: any[];
  questions?: any[];
  knots?: any[];
  sourceText?: string;
};

export function MainEditor({
  onResult, outline, claims, onHeight, onActiveOutline, hasData,
}: {
  onResult: (r: AnalyzeResult) => void;
  outline: Outline[];
  claims: any[];
  onHeight: (h: number) => void;
  onActiveOutline: (id: string | null) => void;
  hasData?: boolean;
}) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [processedIds, setProcessedIds] = React.useState<string[]>([]);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // Jump-Helfer
  React.useEffect(() => {
    (window as any).__edbtt_jumpTo = (offset: number) => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(offset, offset);
      const ratio = offset / Math.max(1, el.value.length);
      el.scrollTop = Math.max(0, el.scrollHeight * ratio - el.clientHeight / 3);
    };
  }, []);

  // Auto-Resize
  const autoSize = React.useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
    onHeight(el.getBoundingClientRect().height);
  }, [onHeight]);
  React.useEffect(() => { autoSize(); }, [text, autoSize]);

  // Wenn Text geändert wird → alte Markierungen zurücksetzen
  React.useEffect(() => { setProcessedIds([]); }, [text]);

  const showHighlights = (outline?.length ?? 0) > 0;

  function renderHighlights() {
    if (!showHighlights) return null;
    const value = text;
    const segs = [...(outline || [])].sort((a, b) => a.start - b.start);
    const nodes: React.ReactNode[] = [];
    let i = 0;
    for (const seg of segs) {
      const s = Math.max(0, Math.min(value.length, seg.start));
      const e = Math.max(s, Math.min(value.length, seg.end));
      if (s > i) nodes.push(<span key={`p-${i}`}>{value.slice(i, s)}</span>);
      const done = processedIds.includes(seg.id);
      nodes.push(
        <mark
          key={seg.id}
          title={seg.summary}
          className={done ? "done" : "pending"}
          onMouseEnter={() => onActiveOutline(seg.id)}
          onMouseLeave={() => onActiveOutline(null)}
        >
          {value.slice(s, e)}
        </mark>
      );
      i = e;
    }
    if (i < value.length) nodes.push(<span key={`tail-${i}`}>{value.slice(i)}</span>);
    return <div className="leading-relaxed text-black/90">{nodes}</div>;
  }

  function playOutline(ids: string[]) {
    setProcessedIds([]);
    ids.forEach((id, idx) => {
      setTimeout(() => setProcessedIds((p) => Array.from(new Set([...p, id]))), 200 + idx * 200);
    });
  }

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true);
    setProcessedIds([]);
    try {
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 8000), locale: "de", maxClaims: 20 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(String(data?.reason ?? "ANALYZE_FAILED"));
      onResult({ ...data, sourceText: text });   // ← Text mitgeben für Fallbacks
      playOutline((data.outline ?? []).map((o: Outline) => o.id));
    } catch (e) {
      console.error(e);
      alert("Analyse fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white/75 p-4 shadow-[0_24px_64px_-40px_rgba(0,0,0,.35)] backdrop-blur">
      {!hasData && !text && (
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-6 opacity-90 animate-fade-in-up text-cyan-700 text-[15px] z-10">
          <svg className="mx-auto mb-1 h-6 w-6 animate-bounce" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v14m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Beschreibe dein Anliegen und klicke auf <strong>Analyse starten</strong>.
        </div>
      )}

      <div className="hl-wrap">
        {/* Nur EIN Overlay – und nur anzeigen, wenn es wirklich Segmente gibt */}
        {showHighlights && <div className="hl-bg">{renderHighlights()}</div>}

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onInput={autoSize}
          className="hl-ta"
          style={{
            color: showHighlights ? "transparent" : "#111",
            caretColor: "#111",
            overflow: "hidden",
          }}
          placeholder="Beschreibe dein Anliegen …"
          aria-busy={busy}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={analyze}
          disabled={busy || !text.trim()}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white transition active:scale-[.99] disabled:opacity-50"
        >
          {(outline?.length ?? 0) > 0 ? "Erneut analysieren" : "Analyse starten"}
        </button>
        <button className="rounded-xl border px-4 py-2 text-sm">Speichern</button>
        <button className="rounded-xl border px-4 py-2 text-sm">Melden</button>
      </div>
    </section>
  );
}
