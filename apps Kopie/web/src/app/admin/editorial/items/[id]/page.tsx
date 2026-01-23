"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const STATUS_OPTIONS = ["triage", "review", "fact_check", "ready", "rejected", "archived"] as const;

type EditorialItem = {
  id: string;
  orgId?: string | null;
  intake: {
    title?: string | null;
    summary?: string | null;
    rawText?: string | null;
    topicKey?: string | null;
    regionCode?: string | null;
    language?: string | null;
    receivedAt?: string | null;
  };
  status: string;
  assignment?: {
    ownerUserId?: string | null;
    dueAt?: string | null;
    slaHours?: number | null;
  };
};

type RevisionItem = {
  id: string;
  rev: number;
  changeNote: string;
  content: Record<string, unknown>;
  createdAt?: string | null;
  createdByUserId?: string | null;
};

type SourceItem = {
  id: string;
  url: string;
  title?: string | null;
  publisher?: string | null;
  reliability?: string;
  biasTag?: string | null;
  disabledAt?: string | null;
};

export default function AdminEditorialItemPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = String(params.id || "");
  const [item, setItem] = useState<EditorialItem | null>(null);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [assignOwner, setAssignOwner] = useState("");
  const [assignDueAt, setAssignDueAt] = useState("");
  const [assignSla, setAssignSla] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionHeadline, setRevisionHeadline] = useState("");
  const [revisionSummary, setRevisionSummary] = useState("");
  const [revisionBody, setRevisionBody] = useState("");
  const [publishNote, setPublishNote] = useState("");
  const [publishUrl, setPublishUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceReliability, setSourceReliability] = useState("unknown");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [itemRes, revRes, sourceRes] = await Promise.all([
          fetch(`/api/admin/editorial/items/${itemId}`, { cache: "no-store" }),
          fetch(`/api/admin/editorial/items/${itemId}/revisions`, { cache: "no-store" }),
          fetch(`/api/admin/editorial/items/${itemId}/sources`, { cache: "no-store" }),
        ]);
        if (itemRes.status === 401) {
          router.replace(`/login?next=/admin/editorial/items/${itemId}`);
          return;
        }
        const itemBody = await itemRes.json().catch(() => ({}));
        if (!itemRes.ok) throw new Error(itemBody?.error || itemRes.statusText);

        const revBody = await revRes.json().catch(() => ({}));
        const sourceBody = await sourceRes.json().catch(() => ({}));
        if (active) {
          setItem(itemBody.item ?? null);
          setRevisions(revBody.items ?? []);
          setSources(sourceBody.items ?? []);
          setStatus(itemBody.item?.status ?? "");
        }
      } catch (err: any) {
        if (active) setError(err?.message ?? "item_load_failed");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (itemId) load();
    return () => {
      active = false;
    };
  }, [itemId, router]);

  const auditLink = useMemo(() => `/admin/audit?q=${encodeURIComponent(itemId)}`, [itemId]);

  const handleStatusUpdate = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/editorial/items/${itemId}/status`, {
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

  const handleAssign = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/editorial/items/${itemId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerUserId: assignOwner || null,
          dueAt: assignDueAt || null,
          slaHours: assignSla ? Number(assignSla) : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "assign_failed");
    } catch (err: any) {
      setError(err?.message ?? "assign_failed");
    }
  };

  const handleRevision = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/editorial/items/${itemId}/revision`, {
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
      const res = await fetch(`/api/admin/editorial/items/${itemId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeNote: publishNote, publicUrl: publishUrl || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "publish_failed");
      setPublishNote("");
      setPublishUrl("");
    } catch (err: any) {
      setError(err?.message ?? "publish_failed");
    }
  };

  const handleSourceAdd = async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/editorial/items/${itemId}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sourceUrl,
          title: sourceTitle || undefined,
          reliability: sourceReliability,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "source_failed");
      setSourceUrl("");
      setSourceTitle("");
    } catch (err: any) {
      setError(err?.message ?? "source_failed");
    }
  };

  const handleSourceRemove = async (sourceId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/editorial/items/${itemId}/sources/${sourceId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "remove_failed");
    } catch (err: any) {
      setError(err?.message ?? "remove_failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Editorial Item</p>
        <h1 className="text-2xl font-bold text-slate-900">{item?.intake?.title ?? "Editorial Item"}</h1>
        <p className="text-sm text-slate-600">Status: {item?.status ?? "—"}</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Status & Assignment</h2>
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
            onClick={handleStatusUpdate}
          >
            Status setzen
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={assignOwner}
            onChange={(e) => setAssignOwner(e.target.value)}
            placeholder="Owner UserId"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={assignDueAt}
            onChange={(e) => setAssignDueAt(e.target.value)}
            placeholder="DueAt (ISO)"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={assignSla}
            onChange={(e) => setAssignSla(e.target.value)}
            placeholder="SLA hours"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          className="mt-3 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          onClick={handleAssign}
        >
          Assignment speichern
        </button>
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
          <input
            value={publishUrl}
            onChange={(e) => setPublishUrl(e.target.value)}
            placeholder="Public URL (optional)"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          className="mt-3 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={handlePublish}
        >
          Publish
        </button>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Sources</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="URL"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={sourceTitle}
            onChange={(e) => setSourceTitle(e.target.value)}
            placeholder="Titel"
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={sourceReliability}
            onChange={(e) => setSourceReliability(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          >
            {"unknown,low,medium,high".split(",").map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button
          className="mt-3 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={handleSourceAdd}
        >
          Quelle hinzufuegen
        </button>
        <div className="mt-4 space-y-2 text-sm">
          {sources.map((source) => (
            <div key={source.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-2">
              <div>
                <div className="font-semibold text-slate-900">{source.title || source.url}</div>
                <div className="text-xs text-slate-500">{source.reliability ?? "unknown"}</div>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                onClick={() => handleSourceRemove(source.id)}
              >
                Entfernen
              </button>
            </div>
          ))}
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
        <div className="mt-3 text-xs text-slate-500">
          Audit Trail: <Link href={auditLink} className="underline">Audit ansehen</Link>
        </div>
      </section>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Laedt Item...
        </div>
      )}
    </div>
  );
}
