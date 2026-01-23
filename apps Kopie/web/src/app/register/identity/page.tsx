"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { RegisterStepper } from "../RegisterStepper";

type OtpPhase = "idle" | "loading" | "ready" | "verifying" | "success" | "error";
type MethodTab = "otp";

function sanitizeNext(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed;
}

export default function IdentityStepPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [method] = useState<MethodTab>("otp");

  const [otpPhase, setOtpPhase] = useState<OtpPhase>("idle");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [resumeState, setResumeState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resumeMessage, setResumeMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [otpData, setOtpData] = useState<{
    otpauth: string;
    secret: string;
    issuer: string;
    label: string;
    qr?: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const nextAfterVerify = useMemo(
    () => sanitizeNext(searchParams.get("next")) ?? "/account?welcome=1",
    [searchParams],
  );

  useEffect(() => {
    // Auto-start OTP setup for smoother flow
    startOtpSetup().catch(() => {
      setOtpMessage("Konnte nicht starten – bitte erneut versuchen.");
    });
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  async function startOtpSetup() {
    setOtpPhase("loading");
    setOtpMessage(null);
    setOtpData(null);
    try {
      const res = await fetch("/api/auth/totp/initiate", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.otpauth) throw new Error(body?.error || "TOTP_INIT_FAILED");
      const qr = await QRCode.toDataURL(body.otpauth);
      setOtpData({ ...body, qr });
      setOtpPhase("ready");
      setOtpMessage("Scanne den QR-Code mit deiner bevorzugten Authenticator-App oder gib den Secret-Key manuell ein.");
    } catch (err: any) {
      setOtpPhase("error");
      setOtpMessage(err?.message ?? "Setup konnte nicht gestartet werden.");
    }
  }

  async function copySecret(secret: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(secret);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = secret;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyMessage("Secret kopiert.");
    } catch (err: any) {
      setCopyMessage(err?.message ?? "Kopieren fehlgeschlagen.");
    } finally {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => setCopyMessage(null), 2500);
    }
  }
  async function verifyOtpCode() {
    if (!otpCode.trim()) {
      setOtpMessage("Bitte den 6-stelligen Code eingeben.");
      return;
    }
    setOtpPhase("verifying");
    setOtpMessage(null);
    try {
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: otpCode.replace(/\s+/g, ""), next: nextAfterVerify }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "VERIFICATION_FAILED");
      setOtpPhase("success");
      setOtpMessage("Authenticator aktiviert – danke für deine Registrierung. Wir leiten dich weiter …");
      setTimeout(() => router.push(body?.next || nextAfterVerify), 1200);
    } catch (err: any) {
      setOtpPhase("error");
      setOtpMessage(err?.message ?? "Code ungültig. Bitte erneut versuchen.");
    }
  }

  async function sendResumeMail() {
    setResumeState("sending");
    setResumeMessage(null);
    try {
      const res = await fetch("/api/auth/totp/send-resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ next: nextAfterVerify }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "SEND_FAILED");
      setResumeState("sent");
      setResumeMessage("Link gesendet. Öffne ihn später auf dem Gerät deiner Wahl.");
    } catch (err: any) {
      setResumeState("error");
      setResumeMessage(err?.message ?? "Versand fehlgeschlagen. Bitte erneut versuchen.");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <RegisterStepper current={3} />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schritt 3 · OTP</p>
        <h1 className="text-2xl font-semibold text-slate-900">Schnell verifizieren mit Authenticator-App</h1>
        <p className="text-sm text-slate-600">
          Wir nutzen eine Authenticator-App (TOTP), um Missbrauch vorzubeugen. Später können weitere Ident-Stufen wie
          eID hinzukommen – aktuell reicht dieser Schritt.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Authenticator-App (OTP)</h2>
          <p className="text-sm text-slate-600">
            Du kannst jede OTP-App verwenden (Aegis, Ente, Authy, Bitwarden, 1Password, Google Authenticator …). Nach
            Aktivierung nutzt du denselben Code später auch bei der Anmeldung.
          </p>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Wir haben die Einrichtung bereits gestartet. Falls etwas schiefgeht, nutze den Button:
          </p>
          <button
            type="button"
            onClick={startOtpSetup}
            disabled={otpPhase === "loading" || otpPhase === "verifying"}
            className="rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
          >
            {otpPhase === "loading" ? "Vorbereiten …" : "Neu starten"}
          </button>

          {otpPhase !== "loading" && !otpData && (
            <p className="text-sm text-rose-600">
              Konnte keinen QR-Code abrufen. Bitte neu starten oder später erneut versuchen.
            </p>
          )}

          {otpData && otpData.qr && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center text-sm text-slate-700">
              <img src={otpData.qr} alt="Authenticator QR-Code" className="h-40 w-40 rounded-lg border border-white shadow" />
              <div>
                <p>Secret-Key (falls du ihn manuell eingeben möchtest):</p>
                <p className="font-mono text-xs text-slate-900">{otpData.secret}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a
                  href={otpData.otpauth}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900"
                >
                  In Authenticator öffnen
                </a>
                <button
                  type="button"
                  onClick={() => copySecret(otpData.secret)}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-900"
                >
                  Secret kopieren
                </button>
              </div>
              {copyMessage && <p className="text-xs text-emerald-600">{copyMessage}</p>}
            </div>
          )}

          {otpData && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                6-stelliger Code
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123 456"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                  maxLength={9}
                />
              </label>
              <button
                type="button"
                onClick={verifyOtpCode}
                disabled={otpPhase === "verifying"}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
              >
                {otpPhase === "verifying" ? "Prüfe Code …" : "Code bestätigen"}
              </button>
            </div>
          )}

          {otpMessage && (
            <p
              className={`text-sm ${
                otpPhase === "error"
                  ? "text-rose-600"
                  : otpPhase === "success"
                    ? "text-emerald-600"
                    : "text-slate-600"
              }`}
            >
              {otpMessage}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 space-y-3">
        <h3 className="font-semibold text-slate-900">Gerät wechseln oder später fortsetzen</h3>
        <p>
          Auf dem Handy ist der QR-Code unkomfortabel? Schick dir den Link per E-Mail oder überspringe den Schritt
          jetzt und erledige ihn später im Profil.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={sendResumeMail}
            disabled={resumeState === "sending"}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            {resumeState === "sending" ? "Sende …" : "Link per E-Mail senden"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/account?welcome=1")}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Schritt überspringen
          </button>
        </div>
        {resumeMessage && (
          <p className={`text-sm ${resumeState === "error" ? "text-rose-600" : "text-emerald-600"}`}>{resumeMessage}</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 space-y-3">
        <h3 className="font-semibold text-slate-900">Warum dieser Aufwand?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Bürgerabstimmungen werden international beobachtet – starke Legitimation schützt Ergebnisse vor Manipulation.</li>
          <li>Doppelter Opt-in: Du bestätigst E-Mail und Identität, damit wir keine fremden Accounts freischalten.</li>
          <li>Ab Mitte Januar kannst du Zahlungsanschrift & Bankeinzug komfortabel im Konto hinterlegen – die Legitimation hier sorgt dafür, dass wir diese Daten sicher zuordnen.</li>
          <li>Familien- oder Teamkonten: Du kannst später in deinem Profil zusätzliche Personen einladen oder Gönner-E-Mails hinterlegen.</li>
        </ul>
        <p className="text-xs text-slate-500">
          Alle Schritte laufen in der eDebatte-Infrastruktur – keine Datenweitergabe an Dritte, kein Vendor-Lock-in auf eine bestimmte App.
        </p>
      </section>
    </div>
  );
}
