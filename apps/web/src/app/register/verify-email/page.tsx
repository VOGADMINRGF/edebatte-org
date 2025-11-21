"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RegisterStepper } from "../RegisterStepper";

const TOKEN_VALIDITY_HOURS = 24;

type State = "idle" | "pending" | "success" | "error";

export default function VerifyEmailPage() {
  const search = useSearchParams();
  const router = useRouter();
  const emailParam = useMemo(() => search.get("email") ?? "", [search]);
  const tokenParam = search.get("token");
  const [token, setToken] = useState(tokenParam ?? "");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  useEffect(() => {
    if (tokenParam) {
      confirmToken(tokenParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam]);

  async function confirmToken(rawToken?: string) {
    const value = rawToken ?? token;
    if (!value) {
      setMessage("Bitte gib den Verifizierungs-Code ein.");
      return;
    }
    setState("pending");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/email/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: value.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        let friendly = "Bestätigung fehlgeschlagen";
        if (body?.error === "invalid_or_expired") {
          friendly = "Token ungültig oder abgelaufen. Fordere bitte einen neuen Link an.";
        }
        throw new Error(friendly);
      }
      setState("success");
      setMessage("E-Mail bestätigt. Weiter geht's mit Schritt 3 …");
      setTimeout(() => {
        router.push(body?.next || "/register/identity");
      }, 1200);
    } catch (err: any) {
      setState("error");
      setMessage(err?.message ?? "Bestätigung fehlgeschlagen");
    }
  }

  async function resendEmail() {
    if (!emailParam) {
      setMessage("Bitte gib deine E-Mail an, um den Link erneut zu senden.");
      return;
    }
    setResendState("sending");
    setMessage(null);
    try {
      await fetch("/api/auth/email/start-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailParam }),
      });
      setResendState("sent");
      setMessage(`Wir haben dir eine neue E-Mail gesendet. Der Link ist ${TOKEN_VALIDITY_HOURS} Stunden gültig.`);
    } catch (err: any) {
      setResendState("idle");
      setMessage(err?.message ?? "Versand fehlgeschlagen");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <RegisterStepper current={2} />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Schritt 2 · E-Mail bestätigen</h1>
        <p className="text-sm text-slate-600">
          Wir haben dir einen Bestätigungslink {emailParam && `an ${emailParam}`} geschickt. Der Link ist{" "}
          {TOKEN_VALIDITY_HOURS} Stunden gültig. Öffne die E-Mail und bestätige den Link oder gib den Sicherheitscode
          hier ein.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirmToken();
          }}
          className="space-y-4"
        >
          <label className="block text-sm font-semibold text-slate-700">
            Verifizierungs-Code
            <input
              type="text"
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token aus der E-Mail"
              required
            />
          </label>
          {message && (
            <p
              className={`text-sm ${
                state === "error" ? "text-rose-600" : state === "success" ? "text-emerald-600" : "text-slate-600"
              }`}
            >
              {message}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={state === "pending"}
            >
              {state === "pending" ? "Bestätige …" : "Code bestätigen"}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-sky-600 underline-offset-4 hover:underline"
              onClick={resendEmail}
              disabled={resendState === "sending"}
            >
              {resendState === "sent" ? "E-Mail gesendet ✓" : "E-Mail erneut senden"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <p>Kein Zugriff auf dein Postfach?</p>
        <ul className="mt-2 list-disc pl-5">
          <li>Prüfe auch Spam-Ordner.</li>
          <li>Klicke auf „E-Mail erneut senden“ oder ändere die Adresse im ersten Schritt.</li>
          <li>Bei Problemen melde dich unter support@voiceopengov.org.</li>
        </ul>
      </section>
    </div>
  );
}
