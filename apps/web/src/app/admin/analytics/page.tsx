"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Summary = {
  packages: { code: string; count: number }[];
  roles: { role: string; count: number }[];
  registrationsLast30Days: { date: string; count: number }[];
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard/summary", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?next=/admin/analytics");
        return;
      }
      const body = (await res.json()) as { data: Summary };
      if (active) {
        setData(body.data);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">Registrierungen (30 Tage)</h2>
        <div className="mt-3 flex items-end gap-1">
          {loading && <SkeletonBars />}
          {!loading &&
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
                  <span className="text-slate-700">{p.count}</span>
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
                  <span className="text-slate-700">{r.count}</span>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
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
