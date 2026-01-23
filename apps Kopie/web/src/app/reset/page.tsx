"use client";
import { useMemo, useState } from "react";

export default function ResetPage() {
  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);
  const invite = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("invite") ?? "";
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>();
  const [okMsg, setOkMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    setOkMsg(undefined);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Fehler");
      setOkMsg(
        "Wenn die E-Mail bei uns existiert, haben wir dir einen Link geschickt.",
      );
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function setNew(e: React.FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    setOkMsg(undefined);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, invite: invite || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Fehler");
      setOkMsg("Passwort gesetzt. Du kannst dich jetzt einloggen.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-semibold mb-4">Neues Passwort setzen</h1>
        <form onSubmit={setNew} className="space-y-4">
          <input
            type="password"
            placeholder="Neues Passwort"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {msg && <p className="text-red-600 text-sm">{msg}</p>}
          {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
          <button
            disabled={busy}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {busy ? "…" : "Setzen"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Passwort zurücksetzen</h1>
      <form onSubmit={requestLink} className="space-y-4">
        <input
          type="email"
          placeholder="E-Mail"
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {msg && <p className="text-red-600 text-sm">{msg}</p>}
        {okMsg && <p className="text-green-700 text-sm">{okMsg}</p>}
        <button
          disabled={busy}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {busy ? "…" : "Link anfordern"}
        </button>
      </form>
    </div>
  );
}
