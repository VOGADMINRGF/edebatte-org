"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type NewsletterEntry = {
  email: string;
  name?: string | null;
  createdAt?: string | null;
  confirmedAt?: string | null;
  locale?: string | null;
  audienceTier?: string | null;
  frequency?: string | null;
};

type Operations = {
  snapshot?: {
    subscriberCounts?: { active?: number; pending?: number; unsubscribed?: number; suppressed?: number };
    candidateCount?: number;
    delivery7d?: { sent?: number; failed?: number };
  };
  lifecycle?: {
    failed7d?: number;
    inProgress?: number;
    retryExhausted7d?: number;
    maxAttempts?: number;
    retentionDays?: number;
    asynchronousBounceFeedback?: string;
  };
  configuration?: {
    unsubscribeConfigured?: boolean;
    cronConfigured?: boolean;
  };
};

type Preview = {
  eligible: boolean;
  audienceTier: string;
  frequency: string;
  candidateIds: string[];
  subject: string | null;
  html: string | null;
  text: string | null;
  deliveryReason: string;
};

export default function AdminNewsletterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<NewsletterEntry[]>([]);
  const [operations, setOperations] = useState<Operations | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewEmail, setPreviewEmail] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [suppressionEmail, setSuppressionEmail] = useState("");
  const [suppressionMessage, setSuppressionMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setAccessError(null);
    const [exportRes, operationsRes] = await Promise.all([
      fetch("/api/admin/dashboard/newsletter/export", { cache: "no-store" }),
      fetch("/api/admin/dashboard/newsletter/operations", { cache: "no-store" }),
    ]);
    if (exportRes.status === 401 || operationsRes.status === 401) {
      router.replace("/login?next=/admin/newsletter");
      return;
    }
    if (exportRes.status === 403 || operationsRes.status === 403) {
      const body = await exportRes.json().catch(() => ({}));
      if (body?.error === "two_factor_required") {
        router.replace("/login?next=/admin/newsletter");
        return;
      }
      setAccessError("Kein Zugriff auf die Newsletter-Verwaltung.");
      setLoading(false);
      return;
    }
    const exportBody = (await exportRes.json()) as { items: NewsletterEntry[] };
    const operationsBody = (await operationsRes.json().catch(() => ({}))) as Operations;
    setItems(exportBody.items || []);
    setOperations(operationsBody);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) setQuery(qParam);
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      `${item.email} ${item.name ?? ""} ${item.audienceTier ?? ""} ${item.locale ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  const downloadCsv = () => {
    const rows = [
      ["email", "name", "createdAt", "confirmedAt", "locale", "audienceTier", "frequency"],
      ...items.map((item) => [
        item.email,
        item.name ?? "",
        item.createdAt ?? "",
        item.confirmedAt ?? "",
        item.locale ?? "",
        item.audienceTier ?? "",
        item.frequency ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "newsletter.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  async function loadPreview(email: string) {
    setPreviewLoading(true);
    setPreview(null);
    setPreviewEmail(email);
    const response = await fetch(`/api/admin/dashboard/newsletter/preview?email=${encodeURIComponent(email)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body?.ok) setPreview(body.preview as Preview);
    else setPreview({ eligible: false, audienceTier: "—", frequency: "—", candidateIds: [], subject: null, html: null, text: null, deliveryReason: String(body?.error ?? "preview_failed") });
    setPreviewLoading(false);
  }

  async function suppress(suppressed: boolean) {
    const email = suppressionEmail.trim();
    if (!email) return;
    setSuppressionMessage(null);
    const response = await fetch("/api/admin/dashboard/newsletter/suppression", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, suppressed, reason: suppressed ? "admin_newsletter_console" : undefined }),
    });
    const body = await response.json().catch(() => ({}));
    setSuppressionMessage(response.ok && body?.ok
      ? suppressed
        ? "Adresse wurde kanonisch unterdrückt."
        : "Suppression aufgehoben; Status bleibt aus Sicherheitsgründen abgemeldet bis zu neuem Double-Opt-in."
      : `Aktion fehlgeschlagen: ${String(body?.error ?? response.status)}`);
    if (response.ok) await load();
  }

  const counts = operations?.snapshot?.subscriberCounts;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Admin Newsletter</h1>
      {accessError ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{accessError}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-[rgb(var(--card))] p-4 shadow ring-1 ring-[rgb(var(--border))]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Newsletter</p>
          <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Personalisierte Briefings</h2>
          <p className="text-sm text-[rgb(var(--muted))]">{loading ? "Lade ..." : `${items.length} aktiv bestätigte Empfänger`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suche" className="w-56 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm focus:border-sky-300 focus:outline-none" />
          <button type="button" onClick={downloadCsv} className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow" disabled={loading}>CSV exportieren</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Aktiv", counts?.active ?? 0],
          ["Pending", counts?.pending ?? 0],
          ["Abgemeldet", counts?.unsubscribed ?? 0],
          ["Suppressed", counts?.suppressed ?? 0],
          ["Kandidaten", operations?.snapshot?.candidateCount ?? 0],
          ["Gesendet 7d", operations?.snapshot?.delivery7d?.sent ?? 0],
          ["Fehler 7d", operations?.snapshot?.delivery7d?.failed ?? 0],
          ["Retry erschöpft", operations?.lifecycle?.retryExhausted7d ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
            <p className="text-xs text-[rgb(var(--muted))]">{label}</p>
            <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-semibold">Production Guards</p>
        <p className="mt-1">Cron: {operations?.configuration?.cronConfigured ? "konfiguriert" : "FEHLT"} · Unsubscribe-Secret: {operations?.configuration?.unsubscribeConfigured ? "konfiguriert" : "FEHLT"} · Max. Versuche: {operations?.lifecycle?.maxAttempts ?? "—"} · Ledger-Retention: {operations?.lifecycle?.retentionDays ?? "—"} Tage.</p>
        <p className="mt-1">Asynchrones Bounce-/Complaint-Feedback: {operations?.lifecycle?.asynchronousBounceFeedback === "not_available_via_generic_smtp" ? "über generisches SMTP nicht beweisbar; Suppression bleibt operator-/Hard-Fail-basiert" : "verfügbar"}.</p>
      </div>

      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
        <p className="font-semibold text-[rgb(var(--fg))]">Operator-Suppression</p>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">Suppression schlägt Consent immer. Aufheben reaktiviert niemals still den Versand.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={suppressionEmail} onChange={(event) => setSuppressionEmail(event.target.value)} placeholder="name@example.de" className="min-w-64 flex-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm" />
          <button type="button" onClick={() => void suppress(true)} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Suppress</button>
          <button type="button" onClick={() => void suppress(false)} className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold">Suppression aufheben</button>
        </div>
        {suppressionMessage ? <p className="mt-2 text-sm text-[rgb(var(--muted))]">{suppressionMessage}</p> : null}
      </div>

      <div className="overflow-hidden rounded-3xl bg-[rgb(var(--card))] shadow ring-1 ring-[rgb(var(--border))]">
        <table className="min-w-full divide-y divide-[rgb(var(--border))] text-sm">
          <thead className="bg-[rgb(var(--bg))]"><tr><th className="px-3 py-2 text-left">E-Mail</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Bestätigt</th><th className="px-3 py-2 text-left">Segment</th><th className="px-3 py-2 text-left">Rhythmus</th><th className="px-3 py-2 text-left">Preview</th></tr></thead>
          <tbody className="divide-y divide-[rgb(var(--border))]">
            {loading ? <tr><td colSpan={6} className="px-3 py-4 text-center text-[rgb(var(--muted))]">Lädt …</td></tr> : null}
            {!loading && filteredItems.map((item) => (
              <tr key={item.email} className="hover:bg-[rgb(var(--bg))]">
                <td className="px-3 py-2">{item.email}</td><td className="px-3 py-2">{item.name ?? "—"}</td><td className="px-3 py-2 text-[rgb(var(--muted))]">{item.confirmedAt?.slice(0, 10) ?? item.createdAt?.slice(0, 10) ?? "—"}</td><td className="px-3 py-2">{item.audienceTier ?? "public"}</td><td className="px-3 py-2">{item.frequency ?? "weekly"}</td>
                <td className="px-3 py-2"><button type="button" onClick={() => void loadPreview(item.email)} className="rounded-full border border-sky-300 px-3 py-1 text-xs font-semibold text-sky-700">Ansehen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredItems.length === 0 ? <p className="px-3 py-4 text-center text-sm text-[rgb(var(--muted))]">Keine Treffer.</p> : null}
      </div>

      {previewEmail ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Exakter Preview · sendet nichts</p><p className="font-semibold">{previewEmail}</p></div><button type="button" onClick={() => { setPreview(null); setPreviewEmail(null); }} className="text-sm text-sky-600">Schließen</button></div>
          {previewLoading ? <p className="mt-4 text-sm text-[rgb(var(--muted))]">Preview wird aufgebaut …</p> : null}
          {!previewLoading && preview ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm"><strong>{preview.subject ?? "Kein versandfähiges Briefing"}</strong><br />Segment {preview.audienceTier} · {preview.frequency} · {preview.candidateIds.length} Inhalte · Policy: {preview.deliveryReason}</p>
              {preview.html ? <iframe title="Newsletter preview" srcDoc={preview.html} className="h-[680px] w-full rounded-2xl border border-[rgb(var(--border))] bg-white" sandbox="" /> : <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Aktuell kein relevanter, freigegebener Inhalt für diesen Empfänger.</div>}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
