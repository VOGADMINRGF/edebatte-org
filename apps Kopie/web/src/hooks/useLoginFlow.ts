"use client";

import { useCallback, useState } from "react";

export type LoginStep = "credentials" | "twofactor";
export type TwoFactorMethod = "email" | "otp" | "totp";

export function useLoginFlow(opts?: {
  redirectTo?: string;
  initialStep?: LoginStep;
  initialMethod?: TwoFactorMethod | null;
}) {
  const [step, setStep] = useState<LoginStep>(opts?.initialStep ?? "credentials");
  const initialMethod =
    opts?.initialMethod ?? (opts?.initialStep === "twofactor" ? "email" : null);
  const [method, setMethod] = useState<TwoFactorMethod | null>(initialMethod);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState(opts?.redirectTo || "/account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCredentials = useCallback(
    async (identifier: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password, next: redirectUrl }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body) {
          throw new Error(body?.error || "login_failed");
        }

        if (body.require2fa) {
          setMethod(body.method ?? null);
          setExpiresAt(body.expiresAt ?? null);
          setRedirectUrl(body.redirectUrl || redirectUrl);
          setStep("twofactor");
          return;
        }

        window.location.href = body.redirectUrl || redirectUrl || "/";
      } catch (e: any) {
        setError(mapLoginError(e?.message));
      } finally {
        setLoading(false);
      }
    },
    [redirectUrl],
  );

  const submitTwoFactor = useCallback(
    async (code: string) => {
      if (!method) {
        setError("2FA-Methode fehlt – bitte Login neu starten.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, method, next: redirectUrl }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.ok) {
          throw new Error(body?.error || "verify_failed");
        }
        window.location.href = body.redirectUrl || redirectUrl || "/";
      } catch (e: any) {
        const codeVal = e?.message as string | undefined;
        setError(mapVerifyError(codeVal));
        if (codeVal === "challenge_missing" || codeVal === "method_mismatch") {
          setStep("credentials");
          setMethod(null);
          setExpiresAt(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [method, redirectUrl],
  );

  const reset = useCallback(() => {
    setStep("credentials");
    setMethod(null);
    setExpiresAt(null);
    setError(null);
  }, []);

  return { step, method, expiresAt, redirectUrl, loading, error, submitCredentials, submitTwoFactor, reset };
}

function mapLoginError(code?: string) {
  switch (code) {
    case "invalid_input":
      return "Bitte E-Mail/Nickname und Passwort prüfen.";
    case "invalid_credentials":
      return "E-Mail oder Passwort stimmen nicht.";
    case "rate_limited":
      return "Zu viele Versuche – bitte kurz warten.";
    default:
      return "Login fehlgeschlagen. Bitte erneut versuchen.";
  }
}

function mapVerifyError(code?: string) {
  switch (code) {
    case "code_required":
      return "Bitte den Sicherheitscode eingeben.";
    case "invalid_code":
      return "Der Code ist falsch oder abgelaufen.";
    case "challenge_expired":
      return "Der Code ist abgelaufen. Bitte erneut einloggen.";
    case "challenge_missing":
      return "Keine offene 2FA-Anfrage gefunden – bitte erneut einloggen.";
    case "method_mismatch":
      return "Dieser Code passt nicht zur gewählten 2FA-Methode.";
    case "user_not_found":
      return "Nutzerkonto nicht gefunden. Bitte neu anmelden.";
    case "rate_limited":
      return "Zu viele Codes eingegeben – bitte kurz warten.";
    default:
      return "Verifizierung fehlgeschlagen. Bitte erneut versuchen.";
  }
}
