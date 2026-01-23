"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ReviewStatus = "pending" | "approved" | "rejected";

type FactcheckAction = {
  type: "manual_factcheck_submit" | "manual_factcheck_update";
  claim: string;
  verdict: "LIKELY_TRUE" | "LIKELY_FALSE" | "MIXED" | "UNDETERMINED";
  confidence?: number;
  note?: string;
  sources?: string[];
  origin?: string;
  entryId?: string;
};

type FactcheckItem = {
  id: string;
  ts: string;
  createdAt: string;
  context?: { url?: string };
  reviewStatus: ReviewStatus;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  action: FactcheckAction;
};

type ResponsePayload = { ok: true; items: FactcheckItem[] } | { ok: false; error: string };

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "offen",
  approved: "freigegeben",
  rejected: "abgelehnt",
};

const VERDICT_LABELS: Record<FactcheckAction["verdict"], string> = {
  LIKELY_TRUE: "wahrscheinlich richtig",
  LIKELY_FALSE: "wahrscheinlich falsch",
  MIXED: "gemischt",
  UNDETERMINED: "unklar",
};

export default function FactcheckReviewPage() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [items, setItems] = useState<FactcheckItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<string>("");

  const summary = useMemo(() => {
    const pending = items.filter((it) => it.reviewStatus === "pending").length;
    const approved = items.filter((it) => it.reviewStatus === "approved").length;
    const rejected = items.filter((it) => it.reviewStatus === "rejected").length;
    return { pending, approved, rejected, total: items.length };
  }, [items]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setActionStatus(null);
    try {
      const res = await fetch(`/api/admin/editorial/factchecks?status=${status}&limit=80`);
      const data = (await res.json()) as ResponsePayload;
      if (!res.ok || !data.ok) {
        throw new Error("load_failed");
      }
      setItems(data.items);
    } catch {
      setActionStatus("Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  async function updateStatus(id: string, nextStatus: ReviewStatus) {
    setActionStatus(null);
    try {
      const res = await fetch("/api/admin/editorial/factchecks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          reviewStatus: nextStatus,
          reviewNote: reviewNote.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data?.error ?? "update_failed");
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, reviewStatus: nextStatus } : it,
        ),
      );
    } catch {
      setActionStatus("Update fehlgeschlagen.");
    }
  }

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Redaktion - Factcheck Review
        </p>
        <h1 className="text-2xl font-semibold text-slate-900">Manuelle Factchecks</h1>
        <p className="text-sm text-slate-600">
          Alle manuellen Einsendungen (Community, Redaktion, KI) warten auf redaktionelle Freigabe.
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Offen: {summary.pending}</span>
          <span>Freigegeben: {summary.approved}</span>
          <span>Abgelehnt: {summary.rejected}</span>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                status === key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {key === "all" ? "Alle" : STATUS_LABELS[key as ReviewStatus]}
            </button>
          ))}
          <button
            onClick={loadItems}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600"
          >
            Neu laden
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-slate-500">Review-Notiz (optional)</label>
          <input
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Kommentar fuer Freigabe/Reject"
          />
        </div>
        {actionStatus && <p className="text-xs text-slate-500">{actionStatus}</p>}
      </section>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
          Lade...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
          Keine Eintraege fuer diesen Filter.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                  {STATUS_LABELS[item.reviewStatus]}
                </span>
                <span>{new Date(item.createdAt).toLocaleDateString("de-DE")}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.action.claim}</p>
                <p className="text-xs text-slate-600">
                  Verdict: {VERDICT_LABELS[item.action.verdict]} (
                  {Math.round((item.action.confidence ?? 0) * 100)}%)
                </p>
              </div>
              {item.action.note && (
                <p className="text-xs text-slate-600">Notiz: {item.action.note}</p>
              )}
              {item.action.sources && item.action.sources.length > 0 && (
                <div className="text-xs text-slate-500">
                  Quellen: {item.action.sources.join(", ")}
                </div>
              )}
              <div className="text-xs text-slate-500">
                Ursprung: {item.action.origin ?? "community"}
                {item.context?.url ? ` - ${item.context.url}` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => updateStatus(item.id, "approved")}
                  className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Freigeben
                </button>
                <button
                  onClick={() => updateStatus(item.id, "rejected")}
                  className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Ablehnen
                </button>
                <button
                  onClick={() => updateStatus(item.id, "pending")}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Offen setzen
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
