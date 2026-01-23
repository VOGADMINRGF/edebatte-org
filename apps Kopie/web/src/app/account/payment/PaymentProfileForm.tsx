"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type PaymentProfileFormProps = {
  initial?: {
    ibanMasked?: string | null;
    holderName?: string | null;
    bic?: string | null;
  };
};

export function PaymentProfileForm({ initial }: PaymentProfileFormProps) {
  const router = useRouter();
  const [holderName, setHolderName] = useState(initial?.holderName ?? "");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState(initial?.bic ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/account/payment-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          holderName: holderName.trim(),
          iban: iban.replace(/\s+/g, ""),
          bic: bic.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "save_failed");
      }
      setMessage("Konto gespeichert");
      setIban("");
      router.refresh();
    } catch (err: any) {
      const code = err?.message ?? "";
      if (code === "invalid_iban") {
        setError("IBAN ungültig – bitte prüfen.");
      } else if (code === "invalid_bic") {
        setError("BIC ungültig – bitte prüfen.");
      } else {
        setError("Konto konnte nicht gespeichert werden. Bitte erneut versuchen.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-slate-50/80 px-3 py-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Bankverbindung ändern</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="holderName" className="text-[11px] font-medium text-slate-700">
            Kontoinhaber:in
          </label>
          <input
            id="holderName"
            name="holderName"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder={initial?.holderName ?? "Vor- und Nachname / Organisation"}
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="bic" className="text-[11px] font-medium text-slate-700">
            BIC (optional)
          </label>
          <input
            id="bic"
            name="bic"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            value={bic}
            onChange={(e) => setBic(e.target.value)}
            placeholder="z.B. COLSDE33"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="iban" className="text-[11px] font-medium text-slate-700">
          IBAN
        </label>
        <input
          id="iban"
          name="iban"
          inputMode="text"
          autoComplete="off"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder={initial?.ibanMasked ?? "DE00 0000 0000 0000 0000 00"}
          required
        />
        <p className="text-[11px] text-slate-500">IBAN wird geprüft und nur maskiert gespeichert.</p>
      </div>

      {message && <p className="text-[11px] font-medium text-emerald-700">{message}</p>}
      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] transition hover:brightness-105 disabled:opacity-60"
        >
          {submitting ? "Speichert …" : "Standardkonto speichern"}
        </button>
      </div>
    </form>
  );
}
