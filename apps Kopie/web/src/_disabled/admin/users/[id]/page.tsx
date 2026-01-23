"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<any>();
  const [msg, setMsg] = useState<string>();
  useEffect(() => {
    fetch(`/api/admin/users/detail?id=${id}`)
      .then((r) => r.json())
      .then(setD);
  }, [id]);

  async function suspend(s: boolean) {
    const r = await fetch("/api/admin/users/suspend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, suspended: s }),
    });
    if (r.ok) setD((x: any) => ({ ...x, user: { ...x.user, suspended: s } }));
    else setMsg("Fehler beim Sperren");
  }

  if (!d?.user) return <div>Laden…</div>;
  const u = d.user;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User: {u.email}</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <div className="text-sm text-neutral-500">Name</div>
          <div className="font-semibold">{u.name || "–"}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-neutral-500">Rolle</div>
          <div className="font-semibold">{u.role}</div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-neutral-500">Verifiziert</div>
          <div className="font-semibold">
            {u.verifiedEmail ? "ja" : "nein"} / 2FA:{" "}
            {u?.verification?.twoFA?.enabled ? "ja" : "nein"}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-sm text-neutral-500">Status</div>
          <div className="font-semibold">
            {u.suspended ? "gesperrt" : "aktiv"}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <a className="border rounded px-3 py-2" href="/admin/users">
          Zurück
        </a>
        <button
          className="border rounded px-3 py-2"
          onClick={() => suspend(!u.suspended)}
        >
          {u.suspended ? "Entsperren" : "Sperren"}
        </button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <div>
        <h2 className="text-lg font-semibold mt-4 mb-2">
          Aktivitäten (neueste 50)
        </h2>
        <div className="space-y-2">
          {(d.activity || []).map((a: any, i: number) => (
            <div key={i} className="border rounded p-2 text-sm">
              <div className="text-xs text-neutral-500">
                {new Date(a.ts).toLocaleString()} · {a.type}
              </div>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(a.meta, null, 2)}
              </pre>
            </div>
          ))}
          {(!d.activity || d.activity.length === 0) && (
            <div className="text-sm text-neutral-500">Keine Einträge</div>
          )}
        </div>
      </div>
    </div>
  );
}
