"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TotpState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; otpauth: string; secret: string; issuer: string; label: string }
  | { status: "verifying" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function SecurityPage() {
  const router = useRouter();
  const [totp, setTotp] = useState<TotpState>({ status: "idle" });
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ enabled: boolean; updatedAt?: string | null }>({ enabled: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const res = await fetch("/api/auth/totp/status", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (active && body?.ok) {
          setStatus({ enabled: Boolean(body.enabled), updatedAt: body.updatedAt });
          if (body.enabled) setTotp({ status: "success" });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadStatus();
    return () => {
      active = false;
    };
  }, []);

  async function startTotp() {
    try {
      setTotp({ status: "loading" });
      const res = await fetch("/api/auth/totp/initiate", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.otpauth) {
        throw new Error(body?.error || "TOTP konnte nicht gestartet werden");
      }
      setTotp({
        status: "ready",
        otpauth: body.otpauth,
        secret: body.secret,
        issuer: body.issuer,
        label: body.label,
      });
    } catch (err: any) {
      setTotp({ status: "error", message: err?.message ?? "Fehler beim Start" });
    }
  }

  async function verifyTotp(e: FormEvent) {
    e.preventDefault();
    try {
      setTotp((prev) =>
        prev.status === "ready" ? { ...prev, status: "verifying" } : { status: "verifying" },
      );
      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Code ungültig");
      }
      setTotp({ status: "success" });
      setTimeout(() => router.push("/account"), 1000);
    } catch (err: any) {
      setTotp({ status: "error", message: err?.message ?? "Verifizierung fehlgeschlagen" });
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Sicherheit &amp; 2-Faktor</h1>
        <p className="text-sm text-slate-600">
          Hier kannst du eine Zwei-Faktor-Authentifizierung mit einer Authenticator-App einrichten
          (z.B. FreeOTP, Microsoft Authenticator, 1Password, …).
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Authenticator-App (TOTP)</h2>

        {loading && <p className="text-sm text-slate-600">Status wird geladen …</p>}

        {totp.status === "success" && status.enabled && (
          <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            2-Faktor ist aktiv{status.updatedAt ? ` · aktiviert am ${status.updatedAt}` : ""}. Wenn du neu koppeln willst, deaktiviere die alte App und starte
            das Setup erneut.
          </div>
        )}

        {!loading && !status.enabled && totp.status === "idle" && (
          <button
            type="button"
            onClick={startTotp}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            2-Faktor mit App einrichten
          </button>
        )}

        {totp.status === "loading" && <p className="text-sm text-slate-600">Starte …</p>}

        {(totp.status === "ready" || totp.status === "verifying") && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              1. Öffne deine Authenticator-App und füge einen neuen Eintrag hinzu. <br />
              2. Wähle &quot;Manuell hinzufügen&quot; und trage <strong>Secret</strong> und{" "}
              <strong>Issuer</strong> ein.
            </p>
            <div className="rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-700">
              <div>Issuer: {("issuer" in totp ? totp.issuer : "eDebatte")}</div>
              {totp.status === "ready" && "secret" in totp && (
                <div className="mt-1 break-all">Secret: {totp.secret}</div>
              )}
            </div>
            {/* Wenn du magst: später QR-Code aus `otpauth` bauen */}

            <form onSubmit={verifyTotp} className="space-y-3">
              <label className="block text-sm text-slate-700">
                3. Gib den 6-stelligen Code aus der App ein:
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="w-full rounded border px-3 py-2 text-lg tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
              <button
                type="submit"
                disabled={totp.status === "verifying"}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {totp.status === "verifying" ? "Prüfe Code …" : "Code bestätigen"}
              </button>
            </form>
          </div>
        )}

        {totp.status === "success" && (
          <p className="text-sm font-semibold text-emerald-700">
            2-Faktor-Authentifizierung aktiviert. Du bist jetzt als „verified“ markiert.
          </p>
        )}

        {totp.status === "error" && (
          <p className="text-sm font-semibold text-red-600">{totp.message}</p>
        )}
      </section>
    </div>
  );
}
