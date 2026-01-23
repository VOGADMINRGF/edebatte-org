"use client";

import { useEffect, useMemo, useState } from "react";
import { useLoginFlow, type LoginStep, type TwoFactorMethod } from "@/hooks/useLoginFlow";
import Link from "next/link";

export function LoginPageShell({
  redirectTo,
  initialStep,
  initialMethod,
  forceTwoFactor,
}: {
  redirectTo?: string;
  initialStep?: LoginStep;
  initialMethod?: TwoFactorMethod | null;
  forceTwoFactor?: boolean;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { step, method, expiresAt, loading, error, submitCredentials, submitTwoFactor, reset } =
    useLoginFlow({ redirectTo, initialStep, initialMethod });

  const expiresInMinutes = useMemo(() => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt).getTime();
    const diff = Math.max(0, expires - Date.now());
    return Math.ceil(diff / 60000);
  }, [expiresAt]);

  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200";

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
    <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="mb-5 space-y-1 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Sicherer Login</p>
        <h1 className="text-2xl font-bold text-slate-900">
          <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
            Bei eDebatte anmelden
          </span>
        </h1>
        <p className="text-sm text-slate-600">E-Mail &amp; Passwort, optional mit 2FA.</p>
      </div>

      {forceTwoFactor && step === "twofactor" && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          2FA erforderlich: Bitte den Code aus E-Mail oder Authenticator eingeben, um fortzufahren.
        </div>
      )}

      {step === "credentials" && (
        <form onSubmit={handleCredentialSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="identifier">
              E-Mail oder Nickname
            </label>
            <input
              id="identifier"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-slate-900 shadow-inner focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
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
            <div className="relative">
              <input
                id="password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 pr-12 text-slate-900 shadow-inner focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                className="absolute inset-y-0 right-2 my-auto inline-flex items-center rounded-md px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Verbergen" : "Anzeigen"}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? "Prüfe Zugang …" : "Einloggen"}
          </button>
          <p className="text-center text-sm text-slate-600">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-semibold text-sky-700 underline-offset-2 hover:underline">
              Jetzt registrieren
            </Link>
            <br />
            <Link href="/reset" className="text-[12px] font-semibold text-slate-600 underline-offset-2 hover:text-sky-700 hover:underline">
              Passwort vergessen?
            </Link>
          </p>
        </form>
      )}

      {step === "twofactor" && (
        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {method === "email"
              ? "Wir haben dir einen 6-stelligen Code per E-Mail gesendet. Bitte Posteingang/Spam prüfen."
              : "Öffne deine Authenticator-App und gib den aktuellen 6-stelligen Code ein."}
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
            <button type="submit" className={`${primaryButtonClass} w-full`} disabled={loading}>
              {loading ? "Prüfe Code …" : "Bestätigen"}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={reset}>
              Zurück
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
