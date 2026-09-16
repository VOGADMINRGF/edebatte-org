"use client";

import { useState } from "react";

export function StripeBillingPortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/stripe/portal", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url || !String(data.url).startsWith("https://billing.stripe.com/")) {
        throw new Error("portal_unavailable");
      }
      window.location.assign(data.url);
    } catch {
      setError("Stripe-Aboverwaltung ist für dieses Konto noch nicht verfügbar.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void openPortal()}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Stripe wird geöffnet …" : "eDebatte-Abo bei Stripe verwalten"}
      </button>
      {error ? <p role="alert" className="text-xs text-amber-700">{error}</p> : null}
    </div>
  );
}
