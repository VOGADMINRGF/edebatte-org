"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLoginFlow, type LoginStep, type TwoFactorMethod } from "@/hooks/useLoginFlow";
import Link from "next/link";
import { normalizeTwoFactorCode, TWO_FACTOR_CODE_LENGTH } from "@/features/auth/twoFactorSetup";

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
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const {
    step,
    method,
    availableMethods,
    expiresAt,
    loading,
    requestingEmail,
    switchingMethod,
    allowEmailFallback,
    error,
    verificationState,
    submitCredentials,
    submitTwoFactor,
    requestEmailCode,
    selectTwoFactorMethod,
    reset,
  } = useLoginFlow({ redirectTo, initialStep, initialMethod });

  const expiresInMinutes = useMemo(() => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt).getTime();
    const diff = Math.max(0, expires - Date.now());
    return Math.ceil(diff / 60000);
  }, [expiresAt]);
  const normalizedCode = useMemo(() => normalizeTwoFactorCode(code), [code]);
  const twoFactorLocked = loading || verificationState !== "idle";
  const canSubmitTwoFactor =
    normalizedCode.length === TWO_FACTOR_CODE_LENGTH && !twoFactorLocked;
  const showOtpOption = availableMethods.includes("otp");
  const showEmailOption = availableMethods.includes("email");

  const primaryButtonClass =
    "inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60";
  const secondaryButtonClass =
    "inline-flex items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-semibold text-[rgb(var(--muted))] shadow-sm transition hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200";

  useEffect(() => {
    if (step === "credentials") {
      setCode("");
    }
  }, [step]);

  useEffect(() => {
    if (step === "twofactor") {
      codeInputRef.current?.focus();
    }
  }, [step, method]);

  async function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCredentials(identifier, password);
  }

  async function handleTwoFactorSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitTwoFactor(normalizedCode);
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="mb-5 space-y-1 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Sicherer Login</p>
        <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">
          <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
            Bei eDebatte anmelden
          </span>
        </h1>
        <p className="text-sm text-[rgb(var(--muted))]">E-Mail &amp; Passwort · Anmeldung mit 2FA.</p>
      </div>

      {forceTwoFactor && step === "twofactor" && (
        <div className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-200/20 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-100">
          2FA erforderlich: Bitte den Code aus E-Mail oder Authenticator eingeben, um fortzufahren.
        </div>
      )}

      {step === "credentials" && (
        <form onSubmit={handleCredentialSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[rgb(var(--muted))]" htmlFor="identifier">
              E-Mail oder Nickname
            </label>
            <input
              id="identifier"
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[rgb(var(--fg))] shadow-inner focus:border-sky-400 focus:bg-[rgb(var(--card))] focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[rgb(var(--muted))]" htmlFor="password">
              Passwort
            </label>
            <div className="relative">
              <input
                id="password"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 pr-12 text-[rgb(var(--fg))] shadow-inner focus:border-sky-400 focus:bg-[rgb(var(--card))] focus:outline-none focus:ring-2 focus:ring-sky-100"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                className="absolute inset-y-0 right-2 my-auto inline-flex items-center rounded-md px-2 text-xs font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] focus:outline-none focus:ring-2 focus:ring-sky-200"
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
          <p className="text-center text-sm text-[rgb(var(--muted))]">
            Noch kein Konto?{" "}
            <Link href="/register" className="font-semibold text-sky-700 underline-offset-2 hover:underline">
              Jetzt registrieren
            </Link>
            <br />
            <Link href="/reset" className="text-[12px] font-semibold text-[rgb(var(--muted))] underline-offset-2 hover:text-sky-700 hover:underline">
              Passwort vergessen?
            </Link>
          </p>
        </form>
      )}

      {step === "twofactor" && (
        <form
          onSubmit={handleTwoFactorSubmit}
          className="space-y-4"
          aria-busy={twoFactorLocked}
        >
          {(showOtpOption || showEmailOption) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
                Sicherheitscode erhalten über
              </p>
              <div className={`grid gap-2 ${showOtpOption && showEmailOption ? "grid-cols-2" : "grid-cols-1"}`}>
                {showOtpOption && (
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                      method === "otp"
                        ? "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-100"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--muted))]"
                    }`}
                    onClick={async () => {
                      const ok = await selectTwoFactorMethod("otp");
                      if (ok) setCode("");
                    }}
                    disabled={switchingMethod || requestingEmail || twoFactorLocked}
                  >
                    Authenticator-App
                  </button>
                )}
                {showEmailOption && (
                  <button
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${
                      method === "email"
                        ? "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-100"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--muted))]"
                    }`}
                    onClick={async () => {
                      const ok = await selectTwoFactorMethod("email");
                      if (ok) setCode("");
                    }}
                    disabled={switchingMethod || requestingEmail || twoFactorLocked}
                  >
                    Code per E-Mail
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="rounded-lg bg-[rgb(var(--bg))] p-3 text-sm text-[rgb(var(--muted))]">
            {method === "email"
              ? "Wir haben dir einen 6-stelligen Code per E-Mail gesendet. Bitte Posteingang/Spam prüfen."
              : "Öffne deine Authenticator-App und gib den aktuellen 6-stelligen Code ein."}
            {method === "email" && expiresInMinutes
              ? ` (gültig für ca. ${expiresInMinutes} Min.)`
              : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[rgb(var(--muted))]" htmlFor="code">
              Sicherheitscode
            </label>
            <input
              ref={codeInputRef}
              id="code"
              className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[rgb(var(--fg))] shadow-inner focus:border-sky-400 focus:bg-[rgb(var(--card))] focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={normalizedCode}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              required
              disabled={twoFactorLocked}
            />
          </div>
          {allowEmailFallback && method === "email" && (
            <button
              type="button"
              className="text-xs font-semibold text-sky-700 underline-offset-2 hover:underline disabled:opacity-60"
              onClick={async () => {
                const ok = await requestEmailCode();
                if (ok) setCode("");
              }}
              disabled={requestingEmail || switchingMethod || twoFactorLocked}
            >
              {requestingEmail ? "Sende neuen Code per E-Mail …" : "Neuen Code per E-Mail senden"}
            </button>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {verificationState === "redirecting" && (
            <p className="text-sm text-emerald-700" role="status">
              Anmeldung erfolgreich. Du wirst weitergeleitet …
            </p>
          )}
          <div className="flex items-center gap-3">
            <button type="submit" className={`${primaryButtonClass} w-full`} disabled={!canSubmitTwoFactor}>
              {verificationState === "redirecting"
                ? "Weiterleitung …"
                : loading
                  ? "Prüfe Code …"
                  : "Bestätigen"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={reset}
              disabled={twoFactorLocked}
            >
              Zurück
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
