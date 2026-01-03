"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type MicroTransferVerificationFormProps = {
  membershipStatus?: string | null;
  mandateStatus?: string | null;
  paymentReference?: string | null;
};

export function MicroTransferVerificationForm({
  membershipStatus,
  mandateStatus,
  paymentReference,
}: MicroTransferVerificationFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending =
    membershipStatus === "waiting_payment" && mandateStatus === "pending_microtransfer";

  if (!isPending) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/memberships/verify-microtransfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "verify_failed");
      }
      setMessage("TAN bestätigt. Mitgliedschaft wird freigeschaltet.");
      setCode("");
      router.refresh();
      } catch (err: any) {
        const code = err?.message ?? "";
        if (code === "invalid_code") {
          setError("Der TAN-Code ist ungültig. Bitte prüfe die 0,01 €-Überweisung.");
        } else if (code === "expired") {
          setError("Der TAN-Code ist abgelaufen. Bitte kontaktiere den Support.");
        } else if (code === "too_many_attempts") {
          setError("Zu viele Fehlversuche. Bitte kontaktiere den Support.");
        } else if (code === "not_pending") {
          setError("Die Verifikation ist aktuell nicht möglich.");
        } else {
        setError("Verifikation fehlgeschlagen. Bitte später erneut versuchen.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-slate-50/80 px-3 py-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
        0,01 €-Verifikation
      </p>
      <p className="text-xs text-slate-600">
        Wir überweisen dir 0,01 € mit einem TAN-Code im Verwendungszweck. Sobald der Betrag
        eingegangen ist, gib den Code hier ein.
      </p>
      {paymentReference && (
        <p className="text-[11px] text-slate-500">
          Beitrags-Verwendungszweck: <span className="font-semibold">{paymentReference}</span>
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="microTransferCode" className="text-[11px] font-medium text-slate-700">
          TAN-Code
        </label>
        <input
          id="microTransferCode"
          name="microTransferCode"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-stelliger Code"
          required
        />
      </div>

      {message && <p className="text-[11px] font-medium text-emerald-700">{message}</p>}
      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] transition hover:brightness-105 disabled:opacity-60"
        >
          {submitting ? "Prüft …" : "Code bestätigen"}
        </button>
      </div>
    </form>
  );
}
