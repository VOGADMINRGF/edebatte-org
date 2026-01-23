"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { DecisionTree, EventualityNode } from "@features/analyze/schemas";

type SnapshotDetail = {
  contributionId: string;
  locale?: string | null;
  userIdMasked: string | null;
  nodesCount: number;
  treesCount: number;
  reviewed: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type DetailResponse = {
  snapshot: SnapshotDetail;
  eventualities: EventualityNode[];
  decisionTrees: DecisionTree[];
};

type ScenarioKey = "pro" | "neutral" | "contra";
type ScenarioBuckets = Record<ScenarioKey | "other", EventualityNode[]>;

export default function AdminEventualityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/eventualities/item?id=${encodeURIComponent(params.id)}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
        if (!ignore) {
          setDetail({
            snapshot: body.snapshot,
            eventualities: Array.isArray(body.eventualities) ? body.eventualities : [],
            decisionTrees: Array.isArray(body.decisionTrees) ? body.decisionTrees : [],
          });
        }
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Konnte Snapshot nicht laden.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [params.id]);

  const fallbackBuckets = useMemo(
    () => groupEventualitiesByStatement(detail?.eventualities ?? []),
    [detail],
  );

  const handleToggleReview = async (reviewed: boolean) => {
    if (!detail) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eventualities/markReviewed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: detail.snapshot.contributionId, reviewed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              snapshot: { ...prev.snapshot, ...body.snapshot },
            }
          : prev,
      );
    } catch (err: any) {
      setError(err?.message ?? "Review-Aktualisierung fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-20 text-center text-slate-500">
        Lädt Eventualitäten …
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
          {error}
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { snapshot, decisionTrees, eventualities } = detail;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Eventualitäten</p>
          <h1 className="text-2xl font-bold text-slate-900">Snapshot {snapshot.contributionId}</h1>
          <p className="text-sm text-slate-600">
            Locale {snapshot.locale ?? "–"} · User #{snapshot.userIdMasked ?? "—"} · Erstellt{" "}
            {formatDate(snapshot.createdAt)}
          </p>
        </div>
        <Link href="/admin/eventualities" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
          ← Zurück zur Übersicht
        </Link>
      </div>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm sm:grid-cols-3">
        <SnapshotBadge label="Nodes" value={snapshot.nodesCount} />
        <SnapshotBadge label="DecisionTrees" value={snapshot.treesCount} />
        <div className="rounded-2xl border border-slate-100 bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review-Status</p>
          <p className={`text-lg font-bold ${snapshot.reviewed ? "text-emerald-600" : "text-amber-600"}`}>
            {snapshot.reviewed ? "Review OK" : "Offen"}
          </p>
          {snapshot.reviewedBy && (
            <p className="text-xs text-slate-500">
              von {snapshot.reviewedBy} – {formatDate(snapshot.reviewedAt)}
            </p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => handleToggleReview(!snapshot.reviewed)}
            className={`mt-3 rounded-full px-4 py-1 text-xs font-semibold transition ${
              snapshot.reviewed
                ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            } ${pending ? "opacity-50" : ""}`}
          >
            {snapshot.reviewed ? "Review zurücksetzen" : "Review erledigt"}
          </button>
        </div>
      </section>

      {decisionTrees.length > 0 && (
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Decision Trees</h2>
            <p className="text-xs uppercase tracking-wide text-slate-500">Pro / Neutral / Contra</p>
          </div>
          <div className="space-y-4">
            {decisionTrees.map((tree) => (
              <div key={tree.rootStatementId} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Statement</p>
                    <p className="font-semibold text-slate-900">{tree.rootStatementId}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    erstellt {formatDate(tree.createdAt)} · locale {tree.locale ?? snapshot.locale ?? "–"}
                  </p>
                </div>
                <ScenarioGrid tree={tree} />
              </div>
            ))}
          </div>
        </section>
      )}

      {eventualities.length > 0 && (
        <section className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Freistehende Eventualitäten</h2>
            <p className="text-xs uppercase tracking-wide text-slate-500">Gruppiert nach Statement</p>
          </div>
          {Array.from(fallbackBuckets.entries()).map(([statementId, buckets]) => (
            <div key={statementId} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Statement {statementId}
              </div>
              <FallbackGrid buckets={buckets} />
            </div>
          ))}
        </section>
      )}

      {eventualities.length === 0 && decisionTrees.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Dieser Beitrag enthält aktuell keine Eventualitäten.
        </div>
      )}
    </main>
  );
}

function SnapshotBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ScenarioGrid({ tree }: { tree: DecisionTree }) {
  const order: ScenarioKey[] = ["pro", "neutral", "contra"];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {order.map((key) => {
        const node = tree.options?.[key];
        return (
          <div key={key} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {key === "pro" ? "Pro" : key === "contra" ? "Contra" : "Neutral"}
            </p>
            {node ? <EventualityCard node={node} /> : <p className="text-xs text-slate-400">Kein Szenario</p>}
          </div>
        );
      })}
    </div>
  );
}

function FallbackGrid({ buckets }: { buckets: ScenarioBuckets }) {
  const order: ScenarioKey[] = ["pro", "neutral", "contra"];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {order.map((key) => (
        <div key={key} className="rounded-2xl border border-white bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {key === "pro" ? "Pro" : key === "contra" ? "Contra" : "Neutral"}
          </p>
          {buckets[key].length === 0 ? (
            <p className="text-xs text-slate-400">Keine Angaben</p>
          ) : (
            <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-600">
              {buckets[key].map((node) => (
                <li key={node.id}>{node.narrative}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {buckets.other.length > 0 && (
        <div className="md:col-span-3 rounded-2xl border border-white bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Weitere Szenarien</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-600">
            {buckets.other.map((node) => (
              <li key={node.id}>{node.narrative}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EventualityCard({ node }: { node: EventualityNode }) {
  return (
    <div className="space-y-2 text-sm text-slate-700">
      <p className="font-medium text-slate-900">{node.label}</p>
      <p className="text-slate-700">{node.narrative}</p>
      {node.consequences?.length ? (
        <div className="text-[11px] text-slate-500">
          Folgen:
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {node.consequences.slice(0, 3).map((cons) => (
              <li key={cons.id}>{cons.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {node.responsibilities?.length ? (
        <div className="text-[11px] text-slate-500">
          Zuständigkeiten:
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {node.responsibilities.slice(0, 3).map((resp) => (
              <li key={resp.id}>{resp.actor || resp.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {node.children?.length ? (
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unteräste</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-slate-600">
            {node.children.slice(0, 3).map((child) => (
              <li key={child.id}>{child.narrative}</li>
            ))}
          </ul>
          {node.children.length > 3 && (
            <p className="mt-1 text-[10px] text-slate-400">+{node.children.length - 3} weitere</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function groupEventualitiesByStatement(nodes: EventualityNode[]): Map<string, ScenarioBuckets> {
  const buckets = new Map<string, ScenarioBuckets>();
  nodes.forEach((node) => {
    if (!node.statementId) return;
    if (!buckets.has(node.statementId)) {
      buckets.set(node.statementId, {
        pro: [],
        neutral: [],
        contra: [],
        other: [],
      });
    }
    const bucket = buckets.get(node.statementId)!;
    const stance = normalizeScenario(node.stance);
    if (stance) bucket[stance].push(node);
    else bucket.other.push(node);
  });
  return buckets;
}

function normalizeScenario(value?: string | null): ScenarioKey | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "pro" || normalized === "neutral" || normalized === "contra") {
    return normalized as ScenarioKey;
  }
  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "–";
  try {
    return new Date(value).toLocaleString("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}
