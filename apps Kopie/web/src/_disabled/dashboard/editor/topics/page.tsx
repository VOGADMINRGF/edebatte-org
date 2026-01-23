// apps/web/src/app/dashboard/editor/topics/page.tsx
"use client";

import { useEffect, useState } from "react";
import EditorGate from "../../../../../../../features/editor/components/EditorGate";
import { fetchWithToken } from "../components/fetchWithToken";

type Topic = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  locale: string;
};

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState<Partial<Topic>>({ locale: "de" });

  const load = async () => {
    const res = await fetch("/api/topics?locale=de");
    const json = await res.json();
    setTopics(json);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const res = await fetchWithToken("/api/editor/topics", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const j = await res.json();
      alert("Fehler: " + JSON.stringify(j));
      return;
    }
    setForm({ locale: "de" });
    await load();
  };

  return (
    <EditorGate>
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-4">Topics</h1>

        <div className="border rounded p-3 mb-6">
          <div className="font-semibold mb-2">Neu</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              className="border rounded px-2 py-1"
              placeholder="slug"
              value={form.slug ?? ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
            <input
              className="border rounded px-2 py-1"
              placeholder="title"
              value={form.title ?? ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="border rounded px-2 py-1"
              placeholder="locale"
              value={form.locale ?? "de"}
              onChange={(e) => setForm({ ...form, locale: e.target.value })}
            />
            <input
              className="border rounded px-2 py-1 md:col-span-3"
              placeholder="description"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="mt-2">
            <button onClick={create} className="border rounded px-3 py-2">
              Anlegen
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {topics.map((t) => (
            <div key={t.id} className="border rounded p-3">
              <div className="font-semibold">
                {t.title} <span className="opacity-60">({t.slug})</span>
              </div>
              <div className="text-sm opacity-70">{t.description}</div>
            </div>
          ))}
        </div>
      </div>
    </EditorGate>
  );
}
