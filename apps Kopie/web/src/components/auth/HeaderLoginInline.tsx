"use client";

import { useEffect, useRef, useState } from "react";
import { useLoginFlow } from "@/hooks/useLoginFlow";

export function HeaderLoginInline({ redirectTo }: { redirectTo?: string }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { step, method, loading, error, submitCredentials, submitTwoFactor, reset } = useLoginFlow({ redirectTo });

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      setIdentifier("");
      setPassword("");
      setCode("");
    }
  }, [open, reset]);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    await submitCredentials(identifier, password);
  }

  async function handleCode(e: React.FormEvent) {
    e.preventDefault();
    await submitTwoFactor(code);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-slate-200 px-4 py-1 text-slate-700 transition hover:bg-slate-100"
      >
        Login
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xl">
          {step === "credentials" && (
            <form onSubmit={handleCredentials} className="space-y-3">
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="E-Mail oder Nickname"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Passwort"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-white shadow-sm disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "…" : "Einloggen"}
              </button>
            </form>
          )}

          {step === "twofactor" && (
            <form onSubmit={handleCode} className="space-y-3">
              <p className="text-slate-700">
                {method === "email"
                  ? "Wir haben dir einen 6-stelligen Code per E-Mail gesendet."
                  : "Bitte Code aus deiner Authenticator-App eingeben."}
              </p>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Sicherheitscode"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-white shadow-sm disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? "…" : "Bestätigen"}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-700"
                  onClick={reset}
                >
                  Zurück
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
