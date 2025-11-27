"use client";

import { useState } from "react";

export function HeaderLoginInline() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Login fehlgeschlagen.");

      if (data.require2fa) {
        window.location.href = `/login?step=verify&method=${data.method || "email"}`;
      } else {
        window.location.href = data.redirectUrl || "/";
      }
    } catch {
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="hidden items-center gap-2 md:flex">
      <input
        type="text"
        placeholder="E-Mail / Nick"
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        autoComplete="username"
      />
      <input
        type="password"
        placeholder="Passwort"
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-100"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={loading}
        className="h-9 rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-70"
      >
        {loading ? "…" : "Login"}
      </button>
    </form>
  );
}
