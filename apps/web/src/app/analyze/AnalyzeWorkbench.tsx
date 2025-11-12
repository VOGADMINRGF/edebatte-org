"use client";
import * as React from "react";

type Item = { id: string; text: string };
type Statement = {
  id: string;
  rep: { text: string; sachverhalt?: string; zeitraum?: string; ort?: string };
};

type Props = {
  context?: Item[];
  notes?: Item[];
  questions?: Item[];
  nodes?: Item[];
  defaultText?: string;
  apiUrl?: string;         // default: /api/contributions/analyze
  locale?: "de" | "en";
  maxClaims?: number;
};

export default function AnalyzeWorkbench({
  context = [],
  notes = [],
  questions = [],
  nodes = [],
  defaultText = "",
  apiUrl = "/api/contributions/analyze",
  locale = "de",
  maxClaims = 6,
}: Props) {
  const [text, setText] = React.useState(defaultText);
  const [busy, setBusy] = React.useState(false);
  const [statements, setStatements] = React.useState<Statement[]>([]);
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow Textarea
  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 640) + "px";
  }, [text]);

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, locale, maxClaims }),
      });
      const data = await res.json().catch(() => ({}));
      // bevorzugt route-V2: { statements: [...] }, fallback: { claims: [...] }
      const stmts: Statement[] =
        Array.isArray(data?.statements)
          ? data.statements.map((s: any, i: number) => ({ id: s.id ?? String(i), rep: s.rep ?? s }))
          : Array.isArray(data?.claims)
            ? data.claims.map((c: any, i: number) => ({ id: String(i), rep: c }))
            : [];
      setStatements(stmts);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      analyze();
    }
  }

  return (
    <section className="container-vog py-6">
      <h1 className="vog-head mb-4">eDebatte – Deine Anliegen, sauber analysiert.</h1>

      {/* DESKTOP-GRID */}
      <div className="hidden md:grid grid-cols-12 gap-6">
        {/* Oben: Kontext */}
        <div className="col-span-12 md:col-span-6 md:col-start-4">
          <ChipBar title="KONTEXT" items={context} />
        </div>

        {/* Links: Notizen */}
        <aside className="md:col-span-3 md:col-start-1 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <Section title="Notizen" items={notes} />
        </aside>

        {/* Mitte: Editor + Aktionen */}
        <div className="md:col-span-6 md:col-start-4">
          <Editor
            ref={taRef}
            value={text}
            onChange={setText}
            onKeyDown={onKeyDown}
            busy={busy}
          />
          <ActionBar onAnalyze={analyze} busy={busy} />
          {/* Statements unter dem Editor */}
          <StatementList statements={statements} className="mt-4" />
        </div>

        {/* Rechts: Fragen */}
        <aside className="md:col-span-3 md:col-start-10 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <Section title="Fragen" items={questions} />
        </aside>

        {/* Unten: Knoten/Aspekte */}
        <div className="col-span-12 md:col-span-6 md:col-start-4">
          <ChipBar title="Knoten / Aspekte" items={nodes} variant="soft" />
        </div>
      </div>

      {/* MOBILE: nur Editor + Statements */}
      <div className="md:hidden">
        <Editor
          ref={taRef}
          value={text}
          onChange={setText}
          onKeyDown={onKeyDown}
          busy={busy}
        />
        <ActionBar onAnalyze={analyze} busy={busy} />
        <StatementList statements={statements} className="mt-4" />
      </div>
    </section>
  );
}

/* ---------------- UI-Bausteine ---------------- */

const Editor = React.forwardRef<HTMLTextAreaElement, {
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  busy?: boolean;
}>(({ value, onChange, onKeyDown, busy }, ref) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm p-3 md:p-4">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Schreibe frei – wir extrahieren Kernaussagen… (Cmd/Ctrl+Enter = Analysieren)"
        rows={10}
        className="w-full resize-none rounded-xl border border-slate-200/80 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-300"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{value.trim().length} Zeichen</span>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="accent-sky-500" defaultChecked />
          Live-Modus
        </label>
      </div>
    </div>
  );
});
Editor.displayName = "Editor";

function ActionBar({ onAnalyze, busy }: { onAnalyze: () => void; busy?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button onClick={onAnalyze} disabled={busy} className="btn-primary disabled:opacity-60">
        {busy ? "Analysiere…" : "Erneut analysieren"}
      </button>
      <button className="btn-secondary">Nochmal abspielen</button>
      <button className="btn-ghost">Speichern</button>
      <button className="btn-ghost">Melden</button>
    </div>
  );
}

function Section({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm p-3">
      <div className="text-xs font-semibold text-slate-600 mb-2">{title}</div>
      <ul className="space-y-2">
        {items.map(it => (
          <li key={it.id} className="text-sm p-2 rounded-lg border border-slate-200/70 bg-white/60">
            {it.text}
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-slate-500">Noch nichts vorhanden.</li>}
      </ul>
    </div>
  );
}

function ChipBar({ title, items, variant = "solid" }: { title?: string; items: Item[]; variant?: "solid" | "soft" }) {
  return (
    <div className={`rounded-2xl border ${variant === "solid" ? "bg-sky-50/60" : "bg-slate-50/60"} border-slate-200/80 p-3 shadow-sm`}>
      {title && <div className="text-xs font-semibold text-slate-600 mb-2">{title}</div>}
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map(it => (
          <span key={it.id} className="pill">{it.text}</span>
        )) : <span className="text-xs text-slate-500">Noch keine Einträge.</span>}
      </div>
    </div>
  );
}

function StatementList({ statements, className }: { statements: Statement[]; className?: string }) {
  return (
    <div className={className}>
      {statements.map((s) => (
        <article key={s.id} className="rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm p-3 md:p-4 mb-3">
          <h3 className="font-semibold text-slate-900 text-sm leading-5">{s.rep?.text}</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
            {s.rep?.sachverhalt && (<><dt className="font-medium">Sachverhalt</dt><dd>{s.rep.sachverhalt}</dd></>)}
            {s.rep?.zeitraum && (<><dt className="font-medium">Zeitraum</dt><dd>{s.rep.zeitraum}</dd></>)}
            {s.rep?.ort && (<><dt className="font-medium">Ort</dt><dd>{s.rep.ort}</dd></>)}
          </dl>
        </article>
      ))}
      {!statements.length && (
        <div className="text-xs text-slate-500">Noch keine Statements – schreibe Text und klicke „Erneut analysieren“.</div>
      )}
    </div>
  );
}
