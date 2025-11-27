"use client";

import { useState } from "react";

type Step = "credentials" | "verify";
type Method = "email" | "otp";

type Props = {
  initialStep?: Step;
  initialMethod?: Method;
};

export function LoginPageShell({
  initialStep = "credentials",
  initialMethod = "email",
}: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [method] = useState<Method>(initialMethod);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Login fehlgeschlagen.");
      }

      const data = await res.json();

      if (data.require2fa) {
        setStep("verify");
      } else {
        window.location.href = data.redirectUrl || "/";
      }
    } catch (err: any) {
      setError(err?.message || "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, method }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Verifizierung fehlgeschlagen.");
      }

      const data = await res.json();
      window.location.href = data.redirectUrl || "/";
    } catch (err: any) {
      setError(err?.message || "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  const securityText =
    method === "otp"
      ? "Für dein aktuelles Sicherheitsniveau nutzen wir eine OTP-App (z.B. Aegis, FreeOTP, Google Authenticator)."
      : "Wir schicken dir einen 6-stelligen Code an deine hinterlegte E-Mail-Adresse.";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Login</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sichere Anmeldung für VoiceOpenGov. Wir verzichten auf Magic Links und setzen auf klare 2-Faktor-Optionen.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <span
              className={
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] " +
                (step === "credentials"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-300 bg-white text-slate-500")
              }
            >
              1
            </span>
            <span>Zugangsdaten</span>
          </div>
          <div className="h-px flex-1 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] " +
                (step === "verify"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-300 bg-white text-slate-400")
              }
            >
              2
            </span>
            <span>Verifizierung</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {step === "credentials" ? (
          <form onSubmit={handleSubmitCredentials} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">E-Mail oder Nickname</label>
              <input
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-0 transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="z.B. ricky@voiceopengov.de oder @nickname"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Passwort</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-0 transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Anmeldung …" : "Weiter"}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => (window.location.href = "/forgot-password")}
              >
                Passwort vergessen?
              </button>
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() => (window.location.href = "/register")}
              >
                Noch kein Konto? Registrieren
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitCode} className="space-y-4">
            <p className="text-sm text-slate-600">{securityText}</p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Sicherheits-Code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-lg font-semibold tracking-[0.35em] shadow-sm outline-none ring-0 transition hover:border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Prüfe Code …" : "Login abschließen"}
            </button>

            <p className="text-xs text-slate-500">
              Tipp: Wir nutzen 2-Faktor-Login, um deine Identität und Zahlungsdaten zu schützen. Ohne Weitergabe an Werbenetzwerke.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
