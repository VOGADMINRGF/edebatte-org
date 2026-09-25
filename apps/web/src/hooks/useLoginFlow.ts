"use client";

import { useCallback, useRef, useState } from "react";

export type LoginStep = "credentials" | "twofactor";
export type TwoFactorMethod = "email" | "otp" | "totp";
export type TwoFactorVerificationState = "idle" | "submitting" | "redirecting";

function navigateWindow(href: string) {
  window.location.href = href;
}

function normalizeMethod(method?: TwoFactorMethod | null): TwoFactorMethod | null {
  if (!method) return null;
  return method === "totp" ? "otp" : method;
}

function normalizeAvailableMethods(
  methods?: unknown,
  fallbackMethod?: TwoFactorMethod | null,
  allowEmailFallback?: boolean,
) {
  const normalized = new Set<TwoFactorMethod>();
  if (Array.isArray(methods)) {
    for (const entry of methods) {
      const method = normalizeMethod(typeof entry === "string" ? (entry as TwoFactorMethod) : null);
      if (method === "email" || method === "otp") {
        normalized.add(method);
      }
    }
  }
  const fallback = normalizeMethod(fallbackMethod);
  if (fallback) normalized.add(fallback);
  if (allowEmailFallback) normalized.add("email");
  return Array.from(normalized);
}

export function useLoginFlow(opts?: {
  redirectTo?: string;
  initialStep?: LoginStep;
  initialMethod?: TwoFactorMethod | null;
  navigate?: (href: string) => void;
}) {
  const twoFactorSubmitGuard = useRef(false);
  const [step, setStep] = useState<LoginStep>(opts?.initialStep ?? "credentials");
  const initialMethod =
    opts?.initialMethod ?? (opts?.initialStep === "twofactor" ? "email" : null);
  const [method, setMethod] = useState<TwoFactorMethod | null>(initialMethod);
  const [availableMethods, setAvailableMethods] = useState<TwoFactorMethod[]>(
    normalizeAvailableMethods(undefined, initialMethod),
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState(opts?.redirectTo || "");
  const [loading, setLoading] = useState(false);
  const [requestingEmail, setRequestingEmail] = useState(false);
  const [switchingMethod, setSwitchingMethod] = useState(false);
  const [allowEmailFallback, setAllowEmailFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationState, setVerificationState] =
    useState<TwoFactorVerificationState>("idle");
  const navigate = opts?.navigate ?? navigateWindow;

  const submitCredentials = useCallback(
    async (identifier: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password, next: redirectUrl || undefined }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body) {
          throw new Error(body?.error || "login_failed");
        }

        if (body.require2fa) {
          const nextMethod = normalizeMethod(body.method ?? null);
          setMethod(nextMethod);
          setAvailableMethods(
            normalizeAvailableMethods(body.availableMethods, nextMethod, Boolean(body.allowEmailFallback)),
          );
          setExpiresAt(body.expiresAt ?? null);
          setRedirectUrl(body.redirectUrl || redirectUrl || "/account");
          setAllowEmailFallback(Boolean(body.allowEmailFallback));
          setStep("twofactor");
          return;
        }

        navigate(body.redirectUrl || redirectUrl || "/account");
      } catch (e: any) {
        setError(mapLoginError(e?.message));
      } finally {
        setLoading(false);
      }
    },
    [navigate, redirectUrl],
  );

  const submitTwoFactor = useCallback(
    async (code: string) => {
      if (twoFactorSubmitGuard.current) {
        return;
      }
      if (!method) {
        setError("2FA-Methode fehlt – bitte Login neu starten.");
        return;
      }
      twoFactorSubmitGuard.current = true;
      setLoading(true);
      setVerificationState("submitting");
      setError(null);
      let succeeded = false;
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
        succeeded = true;
        setVerificationState("redirecting");
        navigate(body.redirectUrl || "/");
      } catch (e: any) {
        const codeVal = e?.message as string | undefined;
        setError(mapVerifyError(codeVal));
        if (codeVal === "challenge_missing" || codeVal === "method_mismatch") {
          setStep("credentials");
          setMethod(null);
          setAvailableMethods([]);
          setExpiresAt(null);
        }
      } finally {
        if (!succeeded) {
          twoFactorSubmitGuard.current = false;
          setVerificationState("idle");
          setLoading(false);
        }
      }
    },
    [method, navigate, redirectUrl],
  );

  const selectTwoFactorMethod = useCallback(
    async (nextMethod: TwoFactorMethod) => {
      if (twoFactorSubmitGuard.current) {
        return false;
      }
      const normalizedMethod = normalizeMethod(nextMethod);
      if (!normalizedMethod) {
        setError(mapVerifyError("method_required"));
        return false;
      }
      if (!availableMethods.includes(normalizedMethod)) {
        setError(
          mapVerifyError(normalizedMethod === "email" ? "email_fallback_disabled" : "totp_not_setup"),
        );
        return false;
      }
      if (normalizedMethod === method) {
        return true;
      }
      if (normalizedMethod === "email") {
        setRequestingEmail(true);
      } else {
        setSwitchingMethod(true);
      }
      setError(null);
      try {
        const res = await fetch("/api/auth/2fa/select-method", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: normalizedMethod, next: redirectUrl }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.ok) {
          throw new Error(body?.error || "request_failed");
        }
        setMethod(normalizeMethod(body.method ?? normalizedMethod));
        setExpiresAt(body.expiresAt ?? null);
        return true;
      } catch (e: any) {
        setError(mapVerifyError(e?.message));
        return false;
      } finally {
        setRequestingEmail(false);
        setSwitchingMethod(false);
      }
    },
    [availableMethods, method, redirectUrl],
  );

  const resendEmailCode = useCallback(async () => {
    if (twoFactorSubmitGuard.current) {
      return false;
    }
    if (!allowEmailFallback) {
      setError(mapVerifyError("email_fallback_disabled"));
      return false;
    }
    setRequestingEmail(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa/request-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: redirectUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "request_failed");
      }
      setMethod("email");
      setExpiresAt(body.expiresAt ?? null);
      return true;
    } catch (e: any) {
      setError(mapVerifyError(e?.message));
      return false;
    } finally {
      setRequestingEmail(false);
    }
  }, [allowEmailFallback, redirectUrl]);

  const reset = useCallback(() => {
    if (twoFactorSubmitGuard.current) {
      return;
    }
    setStep("credentials");
    setMethod(null);
    setAvailableMethods([]);
    setExpiresAt(null);
    setRequestingEmail(false);
    setSwitchingMethod(false);
    setError(null);
    setAllowEmailFallback(false);
    setLoading(false);
    setVerificationState("idle");
  }, []);

  return {
    step,
    method,
    availableMethods,
    expiresAt,
    redirectUrl,
    loading,
    requestingEmail,
    switchingMethod,
    allowEmailFallback,
    error,
    verificationState,
    submitCredentials,
    submitTwoFactor,
    requestEmailCode: resendEmailCode,
    selectTwoFactorMethod,
    reset,
  };
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
    case "demo_only":
      return "E-Mail-Code ist nur für Demo-Accounts verfügbar.";
    case "email_fallback_disabled":
      return "E-Mail-Code ist für dieses Konto nicht verfügbar.";
    case "totp_not_setup":
      return "Für dieses Konto ist keine Authenticator-App eingerichtet.";
    case "email_missing":
      return "Für dieses Konto ist keine E-Mail hinterlegt.";
    case "request_failed":
      return "Code konnte nicht gesendet werden. Bitte erneut versuchen.";
    case "method_required":
      return "Bitte eine 2FA-Methode auswählen.";
    case "code_required":
      return "Bitte den Sicherheitscode eingeben.";
    case "invalid_code":
      return "Der Code ist ungültig oder abgelaufen. Bitte erneut prüfen.";
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
