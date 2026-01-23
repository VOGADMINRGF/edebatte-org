"use client";
import { useEffect, useState } from "react";

export default function LogsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [lvl, setLvl] = useState("");
  useEffect(() => {
    fetch(`/api/admin/errors/last24${lvl ? `?lvl=${lvl}` : ""}`)
      .then((r) => r.json())
      .then((j) => setItems(j.items || []));
  }, [lvl]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Fehler (24h)</h1>
      <div className="flex gap-2">
        <select
          className="border rounded px-2 py-1"
          value={lvl}
          onChange={(e) => setLvl(e.target.value)}
        >
          <option value="">Alle</option>
          <option value="error">error</option>
          <option value="warn">warn</option>
          <option value="info">info</option>
        </select>
        <a
          className="underline"
          href={`/api/admin/errors/export${lvl ? `?lvl=${lvl}` : ""}`}
        >
          CSV exportieren
        </a>
      </div>
      <div className="space-y-2">
        {items.map((x, i) => (
          <div key={i} className="border rounded p-3 dark:border-neutral-700">
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              {new Date(x.ts).toLocaleString()} · {x.lvl}
            </div>
            <div className="text-sm">{x.msg}</div>
            {x.ctx && Object.keys(x.ctx).length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs">Kontext</summary>
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(x.ctx, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-neutral-500">Keine Einträge.</div>
        )}
      </div>
    </div>
  );
}
