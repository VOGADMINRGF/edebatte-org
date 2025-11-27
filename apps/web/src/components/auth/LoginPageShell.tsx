"use client";

import { useEffect, useMemo, useState } from "react";
import { useLoginFlow } from "@/hooks/useLoginFlow";

export function LoginPageShell({ redirectTo }: { redirectTo?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const { step, method, expiresAt, loading, error, submitCredentials, submitTwoFactor, reset } =
    useLoginFlow({ redirectTo });

  const expiresInMinutes = useMemo(() => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt).getTime();
    const diff = Math.max(0, expires - Date.now());
    return Math.ceil(diff / 60000);
  }, [expiresAt]);

  useEffect(() => {
    if (step === "credentials") {
      setCode("");
    }
  }, [step]);

  async function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCredentials(identifier, password);
  }

  async function handleTwoFactorSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitTwoFactor(code);
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-md backdrop-blur">
      <div className="mb-4 space-y-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sicherer Login</p>
        <h1 className="text-2xl font-bold text-slate-900">Bei VoiceOpenGov anmelden</h1>
        <p className="text-sm text-slate-600">E-Mail & Passwort, optional mit 2FA.</p>
      </div>

      {step === "credentials" && (
        <form onSubmit={handleCredentialSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="identifier">
              E-Mail oder Nickname
            </label>
            <input
              id="identifier"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Passwort
            </label>
            <input
              id="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white shadow-sm disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Prüfe Zugang …" : "Einloggen"}
          </button>
        </form>
      )}

      {step === "twofactor" && (
        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {method === "email"
              ? "Wir haben dir einen 6-stelligen Code per E-Mail gesendet."
              : "Gib den Code aus deiner Authenticator-App ein."}
            {expiresInMinutes ? ` (gültig für ca. ${expiresInMinutes} Min.)` : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="code">
              Sicherheitscode
            </label>
            <input
              id="code"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-white shadow-sm disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Prüfe Code …" : "Bestätigen"}
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              onClick={reset}
            >
              Zurück
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
