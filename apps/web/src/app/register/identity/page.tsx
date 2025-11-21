"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegisterStepper } from "../RegisterStepper";

type Phase = "idle" | "starting" | "pending" | "success" | "error";

export default function IdentityStepPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function startVerification() {
    setPhase("starting");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verification/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method: "otb_app" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "start_failed");
      setSessionId(body.sessionId);
      setPhase("pending");
      setMessage("Verbindungsaufbau zur OTB-App (Mock) …");
      setTimeout(() => confirm(body.sessionId), 800);
    } catch (err: any) {
      setPhase("error");
      setMessage(err?.message ?? "Start fehlgeschlagen");
    }
  }

  async function confirm(id?: string) {
    const sid = id ?? sessionId;
    if (!sid) return;
    setPhase("pending");
    setMessage("Bestätige Identität …");
    try {
      const res = await fetch("/api/auth/verification/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "confirm_failed");
      setPhase("success");
      setMessage("Identität bestätigt – danke!");
      setTimeout(() => router.push("/account"), 1200);
    } catch (err: any) {
      setPhase("error");
      setMessage(err?.message ?? "Bestätigung fehlgeschlagen");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <RegisterStepper current={3} />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Schritt 3 · Identität prüfen</h1>
        <p className="text-sm text-slate-600">
          Für Abstimmungen und Evidence-Freigaben benötigen wir eine verifizierte Identität. In V1 simulieren wir den
          Prozess über eine OTB-Mock-Integration – sobald der echte Provider angebunden ist, greifen diese Schritte ohne erneutes Onboarding.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">OTB-App (Mock)</h2>
        <p className="text-sm text-slate-600">
          Starte die Verifizierung – wir simulieren im Hintergrund die Bestätigung über die OTB-App. Nach erfolgreicher
          Prüfung wirst du zu deinem Account weitergeleitet.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={startVerification}
            disabled={phase === "starting" || phase === "pending"}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {phase === "starting" ? "Starte …" : "Mit OTB-App verifizieren"}
          </button>
          {sessionId && phase === "pending" && (
            <button
              type="button"
              onClick={() => confirm()}
              className="text-sm font-semibold text-sky-600 underline-offset-4 hover:underline"
            >
              Mock: Verifizierung jetzt abschließen
            </button>
          )}
        </div>
        {message && (
          <p
            className={`text-sm ${
              phase === "error" ? "text-rose-600" : phase === "success" ? "text-emerald-600" : "text-slate-600"
            }`}
          >
            {message}
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

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 space-y-2">
        <p className="font-semibold text-slate-800">Was passiert danach?</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dein Verification-Level steigt auf „soft“.</li>
          <li>Du kannst Evidence-Beiträge priorisiert einreichen.</li>
          <li>Mit Level „strong“ (Bankprofil + digitale Unterschrift) nimmst du an hochrelevanten Abstimmungen teil.</li>
          <li>Für Zahlungsprofil & Signatur nutzt du später dein Account-Center.</li>
        </ul>
      </section>
    </div>
  );
}
