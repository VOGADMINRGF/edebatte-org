"use client";
import * as React from "react";

type Claim = {
  text: string;
  sachverhalt: string;
  zeitraum: string;
  ort: string;
  zustaendigkeit: "EU" | "Bund" | "Land" | "Kommune" | "-";
  betroffene: string[];
  messgroesse: string;
  unsicherheiten: string;
  sources: string[];
};

type AnalyzeOut = {
  ok: boolean;
  claims?: Claim[];
  degraded?: boolean;
  reason?: string;
  budgetMs?: number;
  error?: string;
};

type RefineOut = {
  ok: boolean;
  degraded: boolean;
  primaryIndex: number;
  claims: Claim[];
  draftIndexes: number[];
  reason?: string;
};

export default function AnalyzePanel() {
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [primary, setPrimary] = React.useState<Claim | null>(null);
  const [drafts, setDrafts] = React.useState<Claim[]>([]);
  const [notes, setNotes] = React.useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(undefined);
    setPrimary(null);
    setDrafts([]);
    setNotes(null);

    try {
      // --- Phase A: Analyze ---
      const aRes = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, maxClaims: 5, locale: "de" }),
      });
      const aJson: AnalyzeOut = await aRes.json().catch(() => ({ ok: false, error: "NO_JSON" } as any));

      if (!aRes.ok || !aJson.ok || !Array.isArray(aJson.claims)) {
        throw new Error(aJson?.error || `Analyze HTTP ${aRes.status}`);
      }

      // Hinweis für UI, falls Fallback/Timeout o.ä.
      if (aJson.degraded) {
        setNotes(`Analyze lief degradiert (${aJson.reason ?? "unbekannt"}). Versuche zu verfeinern…`);
      }

      // --- Phase B: Refine ---
      const rRes = await fetch("/api/contributions/refine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "de", claims: aJson.claims }),
      });
      const rJson: RefineOut = await rRes.json().catch(() => ({
        ok: false,
        degraded: true,
        primaryIndex: 0,
        claims: aJson.claims!,
        draftIndexes: aJson.claims!.map((_, i) => i).slice(1),
        reason: "NO_JSON",
      }));

      // Wenn refine scheitert: nutze Analyze-Ergebnis, Primary=0
      const usePrimaryIdx =
        rRes.ok && rJson.ok && Array.isArray(rJson.claims) && typeof rJson.primaryIndex === "number"
          ? Math.min(Math.max(0, rJson.primaryIndex), Math.max(0, rJson.claims.length - 1))
          : 0;

      const finalClaims = rRes.ok && rJson.ok && Array.isArray(rJson.claims) ? rJson.claims : aJson.claims!;
      const draftsIdx =
        rRes.ok && rJson.ok && Array.isArray(rJson.draftIndexes) ? rJson.draftIndexes : finalClaims.map((_, i) => i).slice(1);

      setPrimary(finalClaims[usePrimaryIdx] ?? null);
      setDrafts(draftsIdx.filter((i) => i !== usePrimaryIdx).map((i) => finalClaims[i]).filter(Boolean));

      if (rJson.degraded) {
        setNotes(`Refine lief degradiert (${rJson.reason ?? "unbekannt"}).`);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        className="w-full min-h-[160px] border rounded p-3"
        placeholder="Dein Text oder deine Aussage…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          disabled={!text.trim() || loading}
          onClick={run}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Analysiere…" : "Analysieren"}
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
        {notes && !error && <span className="text-amber-600 text-sm">{notes}</span>}
      </div>

      {primary && (
        <div className="border rounded p-3">
          <div className="font-semibold mb-1">Primärer Claim</div>
          <ClaimCard c={primary} />
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-600">Entwürfe</div>
          {drafts.map((c, i) => (
            <div key={i} className="border rounded p-3">
              <ClaimCard c={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({ c }: { c: Claim }) {
  return (
    <div className="text-sm">
      <div className="mb-1">{c.text}</div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <Field label="Sachverhalt" value={c.sachverhalt} />
        <Field label="Ort" value={c.ort} />
        <Field label="Zeitraum" value={c.zeitraum} />
        <Field label="Zuständigkeit" value={c.zustaendigkeit} />
        <Field label="Messgröße" value={c.messgroesse} />
        <Field label="Betroffene" value={c.betroffene.join(", ")} />
        <Field label="Unsicherheiten" value={c.unsicherheiten} />
        <Field label="Quellen" value={c.sources.join(", ")} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  const v = value ?? "—";
  const missing = v === "-" || v === "—" || v === "";
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className={missing ? "text-red-600" : ""}>{String(v || "—")}</div>
    </div>
  );
}
