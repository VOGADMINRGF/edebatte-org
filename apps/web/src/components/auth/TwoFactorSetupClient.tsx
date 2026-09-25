"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  mapTwoFactorSetupError,
  normalizeTwoFactorCode,
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_EMAIL_COOLDOWN_SECONDS,
} from "@/features/auth/twoFactorSetup";

type TotpStatus = {
  enabled?: boolean;
  hasPending?: boolean;
};

type SetupMode = "totp" | "email";

export default function TwoFactorSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [qr, setQr] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<SetupMode>("totp");
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [ok, setOk] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailCooldownUntil, setEmailCooldownUntil] = useState<number | null>(null);

  const nextPath = useMemo(() => {
    const raw = searchParams?.get("next") ?? "";
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    return "/account";
  }, [searchParams]);
  const recoveryMode = searchParams?.get("mode") === "recovery";
  const codeLabel = mode === "email" ? "E-Mail-Code eingeben" : "Code aus der Authenticator-App";
  const normalizedCode = useMemo(() => normalizeTwoFactorCode(code), [code]);
  const canSubmit = normalizedCode.length === TWO_FACTOR_CODE_LENGTH && !verifying;
  const emailFallbackAllowed = useMemo(() => {
    if (recoveryMode) return true;
    return !status?.enabled;
  }, [recoveryMode, status?.enabled]);
  const emailCooldownRemaining = useMemo(() => {
    if (!emailCooldownUntil) return 0;
    return Math.max(0, Math.ceil((emailCooldownUntil - Date.now()) / 1000));
  }, [emailCooldownUntil]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (!error) return;
    inputRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (!emailCooldownUntil) return;
    if (emailCooldownUntil <= Date.now()) {
      setEmailCooldownUntil(null);
      return;
    }
    const timer = window.setInterval(() => {
      if (emailCooldownUntil <= Date.now()) {
        setEmailCooldownUntil(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [emailCooldownUntil]);

  useEffect(() => {
    let active = true;

    async function loadSetup() {
      setLoadingSetup(true);
      setError(undefined);
      setMessage(undefined);
      try {
        const statusRes = await fetch("/api/auth/totp/status", { cache: "no-store" });
        const statusBody = await statusRes.json().catch(() => ({}));
        if (!statusRes.ok) {
          throw new Error(statusBody?.error || "STATUS_FAILED");
        }
        if (!active) return;
        setStatus(statusBody);

        if (statusBody?.enabled && !recoveryMode) {
          setMessage("2FA ist bereits aktiviert. Du kannst den nächsten geschützten Schritt jetzt fortsetzen.");
          return;
        }

        if (recoveryMode) {
          setMode("email");
          setMessage("Für diese Sitzung kannst du alternativ einen E-Mail-Code als Recovery-Fallback anfordern.");
          return;
        }

        const initiateRes = await fetch("/api/auth/totp/initiate", { method: "POST" });
        const initiateBody = await initiateRes.json().catch(() => ({}));
        if (!initiateRes.ok || !initiateBody?.otpauth) {
          throw new Error(initiateBody?.error || "TOTP_INIT_FAILED");
        }
        if (!active) return;
        setSecret(initiateBody.secret);
        setQr(await QRCode.toDataURL(initiateBody.otpauth));
      } catch (loadError: any) {
        if (!active) return;
        setError(mapTwoFactorSetupError(loadError?.message));
      } finally {
        if (active) setLoadingSetup(false);
      }
    }

    void loadSetup();
    return () => {
      active = false;
    };
  }, [recoveryMode]);

  async function handleEmailSend() {
    setSendingEmail(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const res = await fetch("/api/auth/2fa/email-code/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          next: nextPath,
          context: recoveryMode ? "recovery" : "setup",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.retryAfterSeconds) {
          setEmailCooldownUntil(Date.now() + Number(body.retryAfterSeconds) * 1000);
        }
        throw new Error(body?.error || "SEND_FAILED");
      }
      setMode("email");
      setCode("");
      setEmailCooldownUntil(Date.now() + TWO_FACTOR_EMAIL_COOLDOWN_SECONDS * 1000);
      setMessage(
        body?.message ||
          "Wir haben dir einen Code per E-Mail gesendet, falls die Adresse bestätigt ist.",
      );
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (sendError: any) {
      setError(mapTwoFactorSetupError(sendError?.message));
    } finally {
      setSendingEmail(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setVerifying(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const endpoint =
        mode === "email" ? "/api/auth/2fa/email-code/verify" : "/api/auth/totp/verify";
      const payload =
        mode === "email"
          ? { code: normalizedCode, next: nextPath, context: recoveryMode ? "recovery" : "setup" }
          : { code: normalizedCode, next: nextPath };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "VERIFY_FAILED");
      }
      setOk(true);
      setMessage(
        mode === "email"
          ? "E-Mail-Code bestätigt. Du wirst jetzt weitergeleitet."
          : "2FA ist jetzt aktiviert. Du wirst jetzt weitergeleitet.",
      );
      window.setTimeout(() => {
        router.replace(body?.redirectUrl || body?.next || nextPath);
      }, 400);
    } catch (verifyError: any) {
      setError(mapTwoFactorSetupError(verifyError?.message));
    } finally {
      setVerifying(false);
    }
  }

  const helperId = error ? "twofa-error twofa-help" : "twofa-help";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-[28px] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-7">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
            Geschützter Schritt
          </p>
          <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">2-Faktor bestätigen</h1>
          <p className="max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
            Richte deine Authenticator-App ein oder nutze für diese Sitzung einen E-Mail-Code,
            wenn der Fallback für deinen aktuellen Kontext erlaubt ist.
          </p>
        </div>

        {!ok ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.95fr)]">
            <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[rgb(var(--fg))]">Authenticator-App</h2>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                    Scanne den QR-Code und gib danach den 6-stelligen Code ein.
                  </p>
                </div>
                {mode === "email" ? (
                  <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
                    E-Mail-Code aktiv
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex min-h-[244px] w-full max-w-[244px] items-center justify-center rounded-[24px] border border-[rgb(var(--border))] bg-white p-4 shadow-sm">
                  {loadingSetup ? (
                    <p className="text-sm text-slate-500">QR wird geladen …</p>
                  ) : qr ? (
                    <img src={qr} alt="QR-Code für Authenticator-App" className="h-52 w-52" />
                  ) : (
                    <p className="text-sm text-slate-500">
                      {recoveryMode
                        ? "Für diesen Recovery-Fallback ist kein QR-Code nötig."
                        : "QR-Code konnte nicht geladen werden."}
                    </p>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                      Manuelle Einrichtung
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-[rgb(var(--fg))]">
                      {secret || "Wird geladen …"}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-[rgb(var(--muted))]">
                    Wenn dein Authenticator gerade nicht verfügbar ist, kannst du für diesen Schritt
                    einen E-Mail-Code anfordern. Das ersetzt keine dauerhaft aktivierte 2FA.
                  </p>
                </div>
              </div>

              <form onSubmit={verify} className="mt-5 space-y-3">
                <label className="block text-sm font-medium text-[rgb(var(--fg))]" htmlFor="twofa-code">
                  {codeLabel}
                </label>
                <input
                  ref={inputRef}
                  id="twofa-code"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={helperId}
                  autoFocus
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-lg font-semibold tracking-[0.24em] text-[rgb(var(--fg))] shadow-inner outline-none transition placeholder:text-[rgb(var(--muted))] focus:border-sky-400 focus:ring-2 focus:ring-sky-300/35 dark:bg-[rgba(9,18,29,0.92)]"
                  placeholder="000000"
                  value={normalizedCode}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                />
                <p id="twofa-help" className="text-xs text-[rgb(var(--muted))]">
                  Es sind genau 6 Ziffern nötig. Leerzeichen und andere Zeichen werden automatisch entfernt.
                </p>
                {error ? (
                  <p id="twofa-error" className="text-sm text-rose-600 dark:text-rose-300" role="alert">
                    {error}
                  </p>
                ) : null}
                {message ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300" aria-live="polite">
                    {message}
                  </p>
                ) : null}
                <button
                  className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={!canSubmit}
                >
                  {verifying ? "Prüfe Code …" : "Bestätigen"}
                </button>
              </form>
            </section>

            <aside className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 sm:p-5">
              <h2 className="text-base font-semibold text-[rgb(var(--fg))]">Kein Zugriff auf die Authenticator-App?</h2>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
                Für den aktuellen Schritt kannst du einen zeitlich begrenzten E-Mail-Code anfordern,
                wenn dieser Fallback für dein Konto und diesen Kontext freigegeben ist.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm font-semibold text-[rgb(var(--fg))] transition hover:border-sky-300 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-sky-200"
                onClick={handleEmailSend}
                disabled={!emailFallbackAllowed || sendingEmail || emailCooldownRemaining > 0}
              >
                {sendingEmail
                  ? "Sende Code per E-Mail …"
                  : emailCooldownRemaining > 0
                    ? `Erneut senden in ${emailCooldownRemaining}s`
                    : "Code per E-Mail senden"}
              </button>
              {!emailFallbackAllowed ? (
                <p className="mt-3 text-xs leading-5 text-[rgb(var(--muted))]">
                  Dieser Fallback ist hier nur vor der finalen TOTP-Aktivierung oder im expliziten Recovery-Kontext verfügbar.
                </p>
              ) : null}
              <div className="mt-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Sicherheit
                </p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[rgb(var(--muted))]">
                  <li>Der E-Mail-Code ist nur kurz gültig.</li>
                  <li>Ein erneutes Senden ist erst nach 60 Sekunden möglich.</li>
                  <li>Ein bereits aktiver TOTP-Faktor wird hier nicht still durch E-Mail ersetzt.</li>
                </ul>
              </div>
            </aside>
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
