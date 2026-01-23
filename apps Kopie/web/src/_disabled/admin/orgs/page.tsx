"use client";
import { useEffect, useState } from "react";

type Org = { id?: string; name: string; type: string; members?: number };

export default function OrgsPage() {
  const [items, setItems] = useState<Org[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("ngo");
  async function load() {
    const r = await fetch("/api/admin/orgs/list");
    const j = await r.json();
    if (r.ok) setItems(j.items);
  }
  useEffect(() => {
    load();
  }, []);
  async function save() {
    await fetch("/api/admin/orgs/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    setName("");
    setType("ngo");
    load();
  }
  async function del(id: string) {
    await fetch("/api/admin/orgs/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Organisationen</h1>
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="ngo">NGO</option>
          <option value="gov">Behörde</option>
          <option value="company">Unternehmen</option>
          <option value="other">Sonstige</option>
        </select>
        <button className="border rounded px-3 py-2" onClick={save}>
          Speichern
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Name</th>
            <th>Typ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="py-2">{o.name}</td>
              <td>{o.type}</td>
              <td>
                <button
                  className="border rounded px-2 py-1"
                  onClick={() => del(o.id!)}
                >
                  Löschen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
