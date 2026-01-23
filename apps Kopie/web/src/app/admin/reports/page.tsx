"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function AdminReportsPage() {
  const router = useRouter();
  const [topicSlug, setTopicSlug] = useState("");
  const [regionId, setRegionId] = useState("");

  const openTopic = () => {
    const value = topicSlug.trim();
    if (!value) return;
    router.push(`/admin/reports/topic/${encodeURIComponent(value)}`);
  };

  const openRegion = () => {
    const value = regionId.trim();
    if (!value) return;
    router.push(`/admin/reports/region/${encodeURIComponent(value)}`);
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Reports</p>
        <h1 className="text-2xl font-bold text-slate-900">Reports Explorer</h1>
        <p className="text-sm text-slate-600">
          Gezielter Einstieg in Topic- und Region-Reports. Optional kannst du das oeffentliche Archiv oeffnen.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Topic Report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Topic-Slug eingeben und den Impact-Report oeffnen.
          </p>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              openTopic();
            }}
          >
            <input
              value={topicSlug}
              onChange={(e) => setTopicSlug(e.target.value)}
              placeholder="z.B. klima, bildung, energie"
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={openTopic}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Oeffnen
            </button>
          </form>
        </div>

        <div className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Region Report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Region-ID eingeben und den Report laden.
          </p>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              openRegion();
            }}
          >
            <input
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              placeholder="z.B. 1, berlin, de-berlin"
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={openRegion}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Oeffnen
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Archiv (oeffentlich)</h2>
            <p className="text-sm text-slate-600">
              Oeffnet die oeffentliche Archiv-Uebersicht.
            </p>
          </div>
          <Link
            href="/archiv"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-200 hover:text-sky-700"
          >
            Zu /archiv
          </Link>
        </div>
      </section>
    </main>
  );
}
