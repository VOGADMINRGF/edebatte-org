"use client";
import Link from "next/link"; // ⬅️ NEU
import { useEffect, useState } from "react";

type Item = {
  id: string;
  email: string;
  name?: string;
  role: string;
  verifiedEmail: boolean;
  twoFA: boolean;
  createdAt?: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [msg, setMsg] = useState<string>();

  async function load(reset = false) {
    const u = new URL("/api/admin/users/list", location.origin);
    if (q) u.searchParams.set("q", q);
    if (!reset && cursor) u.searchParams.set("cursor", cursor);
    const r = await fetch(u.toString());
    const j = await r.json();
    if (r.ok) {
      setItems((prev) => (reset ? j.items : [...prev, ...j.items]));
      setCursor(j.nextCursor);
      setHasMore(!!j.nextCursor);
    }
  }
  useEffect(() => {
    load(true);
  }, []);

  async function setRole(id: string, role: string) {
    const r = await fetch("/api/admin/users/updateRole", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role }),
    });
    if (r.ok)
      setItems((it) => it.map((x) => (x.id === id ? { ...x, role } : x)));
  }
  async function resetVerify(id: string) {
    const r = await fetch("/api/admin/users/resetVerify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Verify-Link: ${j.verifyLink}` : j.error || "Fehler");
  }
  async function reset2fa(id: string) {
    const r = await fetch("/api/admin/users/reset2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMsg(r.ok ? "2FA zurückgesetzt" : "Fehler");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Benutzer</h1>
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2"
          placeholder="Suche (E-Mail/Name)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="border rounded px-3 py-2" onClick={() => load(true)}>
          Suche
        </button>
        {process.env.NODE_ENV !== "production" && (
          <button
            className="border rounded px-3 py-2"
            onClick={async () => {
              const r = await fetch("/api/admin/dev-elevate", {
                method: "POST",
              });
              if (r.ok) location.reload();
            }}
          >
            Mich zum Admin machen (Dev)
          </button>
        )}
      </div>
      {msg && <p className="text-sm text-neutral-700 break-all">{msg}</p>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">E-Mail</th>
            <th>Name</th>
            <th>Rolle</th>
            <th>Verifiziert</th>
            <th>2FA</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-2">
                {/* ⬇️ E-Mail verlinkt zur Detailseite */}
                <Link
                  href={`/admin/users/${i.id}`}
                  className="text-indigo-600 hover:underline break-all"
                >
                  {i.email}
                </Link>
              </td>
              <td>{i.name || "–"}</td>
              <td>
                <select
                  value={i.role}
                  onChange={(e) => setRole(i.id, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  {["user", "editor", "moderator", "admin"].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>{i.verifiedEmail ? "ja" : "nein"}</td>
              <td>{i.twoFA ? "ja" : "nein"}</td>
              <td className="space-x-2">
                <button
                  className="border rounded px-2 py-1"
                  onClick={() => resetVerify(i.id)}
                >
                  Verify-Link
                </button>
                <button
                  className="border rounded px-2 py-1"
                  onClick={() => reset2fa(i.id)}
                >
                  2FA reset
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          className="border rounded px-3 py-2"
          onClick={() => load(false)}
        >
          Mehr laden
        </button>
      )}
    </div>
  );
}
