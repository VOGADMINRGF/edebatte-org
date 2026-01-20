"use client";
import * as React from "react";

export type QuickRegisterProps = React.ComponentProps<"form"> & {
  /** Telemetrie/Context (optional) – z.B. "join_page", "hero_banner" */
  source?: string;
  onSuccess?: (payload: any) => void;
  onError?: (err: unknown) => void;
};

type FormState = {
  fullName: string;
  email: string;
  agree: boolean;
  message: string;
};

export default function QuickRegister(
  { source = "join_page", onSuccess, onError, className, ...formProps }: QuickRegisterProps
) {
  const [form, setForm] = React.useState<FormState>({
    fullName: "",
    email: "",
    agree: false,
    message: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; msg: string } | null>(null);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);

    if (!form.fullName.trim()) return setNotice({ ok: false, msg: "Bitte Namen angeben." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setNotice({ ok: false, msg: "Bitte eine gültige E-Mail angeben." });
    }
    if (!form.agree) return setNotice({ ok: false, msg: "Bitte Datenschutz bestätigen." });

    setSubmitting(true);
    try {
      const res = await fetch("/api/registrations/quick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          message: form.message.trim() || undefined,
          consent: form.agree,
          createdAt: new Date().toISOString(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        const msg = String(json?.error || `Fehler ${res.status}`);
        setNotice({ ok: false, msg });
        onError?.(msg);
        return;
      }
      setNotice({ ok: true, msg: "Danke! Wir haben deine Anmeldung erhalten." });
      onSuccess?.(json);
      setForm({ fullName: "", email: "", agree: false, message: "" });
    } catch (err) {
      setNotice({ ok: false, msg: "Netzwerkfehler – bitte später erneut versuchen." });
      onError?.(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      {...formProps}
      onSubmit={handleSubmit}
      className={["max-w-xl w-full space-y-4", className].filter(Boolean).join(" ")}
      aria-describedby="quickregister-notice"
    >
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="qr-fullname" className="text-sm font-medium">Name</label>
        <input
          id="qr-fullname"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          value={form.fullName}
          onChange={(e) => onChange("fullName", e.target.value)}
          className="rounded-xl border px-3 py-2 outline-none focus:ring-2"
          placeholder="Vor- und Nachname"
        />
      </div>

      {/* E-Mail */}
      <div className="flex flex-col gap-1">
        <label htmlFor="qr-email" className="text-sm font-medium">E-Mail</label>
        <input
          id="qr-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          className="rounded-xl border px-3 py-2 outline-none focus:ring-2"
          placeholder="name@beispiel.de"
        />
      </div>

      {/* Nachricht (optional) */}
      <div className="flex flex-col gap-1">
        <label htmlFor="qr-message" className="text-sm font-medium">Nachricht (optional)</label>
        <textarea
          id="qr-message"
          name="message"
          rows={3}
          value={form.message}
          onChange={(e) => onChange("message", e.target.value)}
          className="rounded-xl border px-3 py-2 outline-none focus:ring-2"
          placeholder="Wobei möchtest du mitwirken?"
        />
      </div>

      {/* Einwilligung (Datenschutz) */}
      <label className="flex items-start gap-2 text-sm">
        <input
          id="qr-agree"
          name="agree"
          type="checkbox"
          checked={form.agree}
          onChange={(e) => onChange("agree", e.target.checked)}
          className="mt-1"
          required
        />
        <span>
          Ich stimme der Verarbeitung meiner Daten gemäß Datenschutzhinweisen zu.
        </span>
      </label>

      {/* Grenzüberquerender Hinweis (neutral + leicht polemisch) */}
      <div className="rounded-xl border bg-gray-50/50 p-3">
        <p className="text-xs text-gray-700 leading-snug">
          <strong>Hinweis:</strong> eDebatte ist <em>grenzüberquerend</em> – unsere Plattform ist
          für Menschen, nicht für Völker. Die rechtliche Auslegung des <em>Wahlgeheimnisses</em> kann je
          nach Rechtsraum variieren. Wir speichern personenbezogene Daten in <strong>getrennten
          Datendomänen</strong> (Inhalte, Stimmen, Personenbezug) und setzen mehrschichtige
          Schutzmaßnahmen ein; absolute Sicherheit kann niemand garantieren.
        </p>
        <details className="mt-2 text-xs text-gray-600">
          <summary className="cursor-pointer select-none underline underline-offset-2">
            Mehr lesen
          </summary>
          <div className="mt-2 space-y-2">
            <p>
              Diese Plattform richtet sich an Erwachsene (18+) und berührt mitunter unbequeme, kontroverse
              Themen. Hier wird abgestimmt, nicht ausweichend diskutiert. Und ja: Manches, was „längst
              beschlossen“ scheint, darf hier freundlich infrage gestellt werden.
            </p>
            <p>
              Wer schon Bauchweh bekommt bei der Vorstellung, jemand könne eines Tages herausfinden, dass
              er oder sie sich <em>für Plastikstrohhalme</em> ausgesprochen hat – dem sei in aller Freundschaft
              gesagt: Diese Plattform ist vermutlich nichts für dich. Alle anderen: Willkommen.
            </p>
          </div>
        </details>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-medium border disabled:opacity-60"
        >
          {submitting ? "Sende …" : "Anmelden"}
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <p
          id="quickregister-notice"
          className={notice.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}
          role={notice.ok ? "status" : "alert"}
        >
          {notice.msg}
        </p>
      )}

      {/* Telemetrie */}
      <input type="hidden" name="source" value={source} />
    </form>
  );
}
