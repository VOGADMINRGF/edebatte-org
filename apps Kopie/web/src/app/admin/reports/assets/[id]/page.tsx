"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STATUS_OPTIONS = ["draft", "review", "published", "archived"] as const;

type AssetDetail = {
  id: string;
  kind: string;
  status: string;
  key: { topicKey?: string | null; regionCode?: string | null; slug?: string | null };
  currentRev: number;
  publishedAt?: string | null;
};

type RevisionItem = {
  id: string;
  rev: number;
  changeNote: string;
  content: Record<string, unknown>;
  createdAt?: string | null;
};

export default function AdminReportAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = String(params.id || "");
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [status, setStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionHeadline, setRevisionHeadline] = useState("");
  const [revisionSummary, setRevisionSummary] = useState("");
  const [revisionBody, setRevisionBody] = useState("");
  const [publishNote, setPublishNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setError(null);
      try {
        const res = await fetch(`/api/admin/reports/assets/${assetId}`, { cache: "no-store" });
        if (res.status === 401) {
          router.replace(`/login?next=/admin/reports/assets/${assetId}`);
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.ok) throw new Error(body?.error || "load_failed");
        if (active) {
          setAsset(body.asset ?? null);
          setRevisions(body.revisions ?? []);
          setStatus(body.asset?.status ?? "");
        }
      } catch (err: any) {
        if (active) setError(err?.message ?? "load_failed");
      }
    }
    if (assetId) load();
    return () => {
      active = false;
    };
  }, [assetId, router]);

  const handleStatus = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/assets/${assetId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: statusReason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "status_failed");
      setStatusReason("");
    } catch (err: any) {
      setError(err?.message ?? "status_failed");
    }
  };

  const handleRevision = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/assets/${assetId}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeNote: revisionNote,
          content: {
            headline: revisionHeadline || null,
            summary: revisionSummary || null,
            bodyMarkdown: revisionBody || null,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "revision_failed");
      setRevisionNote("");
    } catch (err: any) {
      setError(err?.message ?? "revision_failed");
    }
  };

  const handlePublish = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/assets/${assetId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeNote: publishNote }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "publish_failed");
      setPublishNote("");
    } catch (err: any) {
      setError(err?.message ?? "publish_failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Report Asset</p>
        <h1 className="text-2xl font-bold text-slate-900">
          {asset?.key?.topicKey || asset?.key?.regionCode || asset?.key?.slug || "Asset"}
        </h1>
        <p className="text-sm text-slate-600">Status: {asset?.status ?? "—"}</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Status</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <input
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            placeholder="Reason"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={handleStatus}
          >
            Status setzen
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Revision erstellen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="Change note"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={revisionHeadline}
            onChange={(e) => setRevisionHeadline(e.target.value)}
            placeholder="Headline"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={revisionSummary}
            onChange={(e) => setRevisionSummary(e.target.value)}
            placeholder="Summary"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={revisionBody}
            onChange={(e) => setRevisionBody(e.target.value)}
            placeholder="Body Markdown"
            className="h-28 rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          className="mt-3 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={handleRevision}
        >
          Revision speichern
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Publish</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={publishNote}
            onChange={(e) => setPublishNote(e.target.value)}
            placeholder="Change note"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={handlePublish}
          >
            Publish
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Revisionen</h2>
        <div className="mt-3 space-y-2 text-sm">
          {revisions.map((rev) => (
            <div key={rev.id} className="rounded-2xl border border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Rev {rev.rev}</span>
                <span className="text-xs text-slate-500">{rev.createdAt?.slice(0, 10)}</span>
              </div>
              <div className="text-xs text-slate-500">{rev.changeNote}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
