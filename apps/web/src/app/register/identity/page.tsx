"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { RegisterStepper } from "../RegisterStepper";

type OtpPhase = "idle" | "loading" | "ready" | "verifying" | "success" | "error";
type OtbPhase = "idle" | "starting" | "pending" | "success" | "error";
type MethodTab = "otp" | "otb";

export default function IdentityStepPage() {
  const router = useRouter();
  const [method, setMethod] = useState<MethodTab>("otp");

  const [otpPhase, setOtpPhase] = useState<OtpPhase>("idle");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpData, setOtpData] = useState<{
    otpauth: string;
    secret: string;
    issuer: string;
    label: string;
    qr?: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const [otbPhase, setOtbPhase] = useState<OtbPhase>("idle");
  const [otbMessage, setOtbMessage] = useState<string | null>(null);
  const [otbSessionId, setOtbSessionId] = useState<string | null>(null);

  const methodOptions = useMemo(
    () => [
      {
        id: "otp" as MethodTab,
        title: "Authenticator-App (OTP)",
        description: "Nutze jede gängige OTP-/Authenticator-App (z. B. Aegis, 1Password, Ente, Authy, Google Authenticator).",
      },
      {
        id: "otb" as MethodTab,
        title: "OTB / eID (Mock)",
        description: "Mock für den späteren OTB-/eID-Anschluss – geeignet, wenn du Hardware-ID oder Handy-Signatur testen willst.",
      },
    ],
    [],
  );

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
        body: JSON.stringify({ code: otpCode.replace(/\s+/g, "") }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) throw new Error(body?.error || "VERIFICATION_FAILED");
      setOtpPhase("success");
      setOtpMessage("Authenticator aktiviert – wir leiten dich weiter …");
      setTimeout(() => router.push(body?.next || "/account"), 1200);
    } catch (err: any) {
      setOtpPhase("error");
      setOtpMessage(err?.message ?? "Code ungültig. Bitte erneut versuchen.");
    }
  }

  async function startOtbVerification() {
    setOtbPhase("starting");
    setOtbMessage(null);
    try {
      const res = await fetch("/api/auth/verification/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "otb_app" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "start_failed");
      setOtbSessionId(body.sessionId);
      setOtbPhase("pending");
      setOtbMessage("Verbindungsaufbau zur OTB-App (Mock) …");
      setTimeout(() => confirmOtb(body.sessionId), 800);
    } catch (err: any) {
      setOtbPhase("error");
      setOtbMessage(err?.message ?? "Start fehlgeschlagen");
    }
  }

  async function confirmOtb(id?: string) {
    const sid = id ?? otbSessionId;
    if (!sid) return;
    setOtbPhase("pending");
    setOtbMessage("Bestätige Identität …");
    try {
      const res = await fetch("/api/auth/verification/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "confirm_failed");
      setOtbPhase("success");
      setOtbMessage("Identität bestätigt – danke!");
      setTimeout(() => router.push(body?.next || "/account"), 1200);
    } catch (err: any) {
      setOtbPhase("error");
      setOtbMessage(err?.message ?? "Bestätigung fehlgeschlagen");
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <RegisterStepper current={3} />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Schritt 3 · Identität</p>
        <h1 className="text-2xl font-semibold text-slate-900">OTP oder OTB? Du entscheidest.</h1>
        <p className="text-sm text-slate-600">
          Damit Citizen Votes manipulationssicher bleiben, brauchen wir eine starke Legitimation. Du kannst entweder
          eine Authenticator-App deiner Wahl einrichten (Standards wie TOTP, kompatibel mit nahezu allen Apps) oder den
          späteren OTB/eID-Prozess testen. Beide Wege heben dein Verification-Level und schalten mehr Funktionen frei.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {methodOptions.map((option) => {
          const active = option.id === method;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMethod(option.id)}
              className={[
                "rounded-2xl border p-4 text-left transition shadow-sm",
                active
                  ? "border-sky-400 bg-white/90 shadow-[0_20px_45px_rgba(14,165,233,0.15)]"
                  : "border-slate-200 bg-white hover:border-sky-200",
              ].join(" ")}
            >
              <p className="text-sm font-semibold text-slate-900">{option.title}</p>
              <p className="mt-1 text-xs text-slate-600">{option.description}</p>
            </button>
          );
        })}
      </div>

      {method === "otp" ? (
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm space-y-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Authenticator-App (OTP)</h2>
            <p className="text-sm text-slate-600">
              Du kannst jede OTP-App verwenden (Aegis, Ente, Authy, Bitwarden, 1Password, Google Authenticator …). Nach
              Aktivierung nutzt du denselben Code später auch bei der Anmeldung.
            </p>
          </div>
          <div className="space-y-4">
            <button
              type="button"
              onClick={startOtpSetup}
              disabled={otpPhase === "loading" || otpPhase === "verifying"}
              className="rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              {otpPhase === "loading" ? "Vorbereiten …" : "Authenticator starten"}
            </button>

            {otpData && otpData.qr && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center text-sm text-slate-700">
                <img src={otpData.qr} alt="Authenticator QR-Code" className="h-40 w-40 rounded-lg border border-white shadow" />
                <div>
                  <p>Secret-Key (falls du ihn manuell eingeben möchtest):</p>
                  <p className="font-mono text-xs text-slate-900">{otpData.secret}</p>
                </div>
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
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">OTB / eID (Mock)</h2>
            <p className="text-sm text-slate-600">
              Wir simulieren den OTB-/eID-Prozess. Sobald der echte Provider angebunden ist, werden deine Freischaltungen
              automatisch übernommen – kein erneutes Onboarding nötig.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={startOtbVerification}
              disabled={otbPhase === "starting" || otbPhase === "pending"}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {otbPhase === "starting" ? "Starte …" : "Verifizierung starten"}
            </button>
            {otbSessionId && otbPhase === "pending" && (
              <button
                type="button"
                onClick={() => confirmOtb()}
                className="text-sm font-semibold text-sky-600 underline-offset-4 hover:underline"
              >
                Mock: Verifizierung jetzt abschließen
              </button>
            )}
          </div>
          {otbMessage && (
            <p
              className={`text-sm ${
                otbPhase === "error"
                  ? "text-rose-600"
                  : otbPhase === "success"
                    ? "text-emerald-600"
                    : "text-slate-600"
              }`}
            >
              {otbMessage}
            </p>
          )}
          <button
            type="button"
            onClick={() => router.push("/account")}
            className="text-sm font-semibold text-slate-500 underline-offset-4 hover:underline"
          >
            Später erledigen
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 space-y-3">
        <h3 className="font-semibold text-slate-900">Warum dieser Aufwand?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Citizen Votes werden international beobachtet – starke Legitimation schützt Ergebnisse vor Manipulation.</li>
          <li>Doppelter Opt-in: Du bestätigst E-Mail und Identität, damit wir keine fremden Accounts freischalten.</li>
          <li>Ab Mitte Januar kannst du Zahlungsanschrift & Bankeinzug komfortabel im Konto hinterlegen – die Legitimation hier sorgt dafür, dass wir diese Daten sicher zuordnen.</li>
          <li>Familien- oder Teamkonten: Du kannst später in deinem Profil zusätzliche Personen einladen oder Gönner-E-Mails hinterlegen.</li>
        </ul>
        <p className="text-xs text-slate-500">
          Alle Schritte laufen in der VoiceOpenGov-Infrastruktur – keine Datenweitergabe an Dritte, kein Vendor-Lock-in auf eine bestimmte App.
        </p>
      </section>
    </div>
  );
}
