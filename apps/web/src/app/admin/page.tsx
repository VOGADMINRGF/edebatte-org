"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Summary = {
  totalUsers: number;
  activeUsers: number;
  newsletterOptIn: number;
  packages: { code: string; count: number }[];
  roles: { role: string; count: number }[];
  registrationsLast30Days: { date: string; count: number }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const nf = new Intl.NumberFormat("de-DE");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/dashboard/summary", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          router.replace("/login?next=/admin");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { data: Summary };
        if (active) setData(body.data);
      } catch (err: any) {
        if (active) setError(err?.message || "load_failed");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  const newUsers30d = data?.registrationsLast30Days?.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {renderCard("User gesamt", data?.totalUsers, loading, nf, undefined, "/admin/users")}
        {renderCard("Neue User (30d)", newUsers30d, loading, nf, undefined, "/admin/users?createdDays=30")}
        {renderCard(
          "Aktive User (30d)",
          data?.activeUsers,
          loading,
          nf,
          "Mindestens ein Login oder eine Aktion im Zeitraum",
          "/admin/users?activeDays=30",
        )}
        {renderCard("Newsletter Opt-in", data?.newsletterOptIn, loading, nf, undefined, "/admin/users?newsletter=true")}
        {renderCard(
          "Pakete (aktiv)",
          data?.packages?.reduce((a, b) => a + b.count, 0) ?? 0,
          loading,
          nf,
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Paket-Verteilung</h2>
          <div className="mt-2 space-y-2">
            {loading && <SkeletonLines lines={4} />}
            {!loading &&
              data?.packages?.map((p) => (
                <div key={p.code} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{p.code || "none"}</span>
                  <span className="text-slate-700">{nf.format(p.count)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Rollen-Verteilung</h2>
          <div className="mt-2 space-y-2">
            {loading && <SkeletonLines lines={4} />}
            {!loading &&
              data?.roles?.map((r) => (
                <div key={r.role} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{r.role}</span>
                  <span className="text-slate-700">{nf.format(r.count)}</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">Registrierungen (letzte 30 Tage)</h2>
        <div className="mt-3 flex items-end gap-1 min-h-[80px]">
          {loading && <SkeletonBars />}
          {!loading && data?.registrationsLast30Days?.length === 0 && (
            <p className="text-sm text-slate-400">Noch keine Registrierungen im betrachteten Zeitraum.</p>
          )}
          {!loading &&
            data?.registrationsLast30Days &&
            data.registrationsLast30Days.length > 0 &&
            data?.registrationsLast30Days?.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <div
                  className="w-4 rounded-full bg-gradient-to-t from-sky-500 via-cyan-500 to-emerald-500"
                  style={{ height: `${Math.max(6, d.count * 6)}px` }}
                  title={`${d.date}: ${d.count}`}
                />
                <span className="text-[10px] text-slate-400">{d.date.slice(5)}</span>
              </div>
            ))}
        </div>
        {error && (
          <p className="mt-3 text-sm text-rose-600">
            Fehler beim Laden: {error} <button className="underline" onClick={() => location.reload()}>Neu laden</button>
          </p>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin Hubs</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <LinkCard title="People Hub" href="/admin/people" description="User, Rollen, Newsletter & Regeln" />
          <LinkCard title="Content Hub" href="/admin/content" description="Evidence, Graph, Feeds & Reports" />
          <LinkCard title="Telemetry Hub" href="/admin/telemetry" description="AI Usage, Health & Logs" />
          <LinkCard title="System Hub" href="/admin/system" description="Settings & Analytics" />
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Direktzugriff</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <LinkCard title="Access Center" href="/admin/access" description="Seitenzugriffe verwalten" />
          <LinkCard title="Graph Impact" href="/admin/graph/impact" description="Impact-Summary & Knoten" />
          <LinkCard title="Reports" href="/admin/reports" description="Topic- und Region-Reports" />
          <LinkCard title="AI Telemetry" href="/admin/telemetry/ai" description="Usage, Live-Events & Smoke-Tests" />
        </div>
      </section>
    </div>
  );
}

function renderCard(
  title: string,
  value: number | undefined,
  loading: boolean,
  nf: Intl.NumberFormat,
  subtitle?: string,
  href?: string,
) {
  const content = (
    <div className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100 hover:ring-sky-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {loading ? (
        <div className="mt-2 h-6 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-slate-900">{nf.format(value ?? 0)}</p>
      )}
      {subtitle && <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>}
    </div>
  );
  if (href) {
    return (
      <a href={href} className="block transition hover:-translate-y-0.5">
        {content}
      </a>
    );
  }
  return content;
}

function SkeletonLines({ lines }: { lines: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-6 animate-pulse rounded bg-slate-100" />
      ))}
    </div>
  );
}

function SkeletonBars() {
  return (
    <div className="flex items-end gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="w-4 rounded-full bg-slate-100" style={{ height: `${10 + i * 2}px` }} />
      ))}
    </div>
  );
}

function LinkCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-sky-200"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm text-slate-700">{description}</p>
    </a>
  );
}
