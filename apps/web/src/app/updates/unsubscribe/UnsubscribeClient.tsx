"use client";

import { useEffect, useState } from "react";

type VerifyState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; emailHint: string }
  | { status: "done" };

export default function UnsubscribeClient({ token }: { token: string }) {
  const [state, setState] = useState<VerifyState>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!token) {
        setState({ status: "invalid", message: "Der Abmeldelink fehlt oder ist unvollständig." });
        return;
      }
      const response = await fetch(`/api/public/updates/unsubscribe?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!active) return;
      if (!response.ok || !body?.ok) {
        setState({ status: "invalid", message: response.status === 503 ? "Die Abmeldung ist derzeit nicht konfiguriert." : "Dieser Abmeldelink ist ungültig oder abgelaufen." });
        return;
      }
      setState({ status: "ready", emailHint: String(body.emailHint ?? "") });
    }
    void verify();
    return () => {
      active = false;
    };
  }, [token]);

  async function confirm() {
    setSubmitting(true);
    const response = await fetch("/api/public/updates/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.ok) {
      setState({ status: "invalid", message: "Die Abmeldung konnte nicht gespeichert werden. Bitte öffne den Link aus der E-Mail erneut." });
      setSubmitting(false);
      return;
    }
    setState({ status: "done" });
    setSubmitting(false);
  }

  if (state.status === "loading") {
    return <p className="text-sm text-[rgb(var(--muted))]">Link wird geprüft …</p>;
  }
  if (state.status === "invalid") {
    return <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.message}</div>;
  }
  if (state.status === "done") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Abgemeldet. Du erhältst keine weiteren Newsletter-Briefings, solange du nicht erneut ausdrücklich einwilligst.
        </div>
        <a href="/" className="text-sm font-medium text-sky-600 hover:underline">Zur eDebatte-Startseite</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3 text-sm">
        Abonnement für <strong>{state.emailHint || "deine E-Mail-Adresse"}</strong>
      </div>
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={submitting}
        className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Wird abgemeldet …" : "Ja, Updates abbestellen"}
      </button>
    </div>
  );
}
