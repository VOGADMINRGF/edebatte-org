"use client";

import { useState } from "react";
import Link from "next/link";
import type { AccountOverview } from "@features/account/types";
import { CORE_LOCALES, EXTENDED_LOCALES } from "@/config/locales";
import { VERIFICATION_LEVEL_DESCRIPTIONS } from "@features/auth/verificationRules";

const LOCALE_OPTIONS = [...CORE_LOCALES, ...EXTENDED_LOCALES];

type Props = {
  initialData: AccountOverview;
};

export function AccountClient({ initialData }: Props) {
  const [data, setData] = useState<AccountOverview>(initialData);
  const [displayName, setDisplayName] = useState(initialData.displayName ?? "");
  const [preferredLocale, setPreferredLocale] = useState(initialData.preferredLocale);
  const [newsletterOptIn, setNewsletterOptIn] = useState(!!initialData.newsletterOptIn);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ibanInput, setIbanInput] = useState("");
  const [bicInput, setBicInput] = useState("");
  const [holderNameInput, setHolderNameInput] = useState(initialData.displayName ?? "");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState<string | null>(null);

  async function reloadOverview() {
    const res = await fetch("/api/account/overview", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.overview) {
      setData(body.overview);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          preferredLocale,
          newsletterOptIn,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Speichern fehlgeschlagen");
      if (body?.overview) {
        setData(body.overview);
        setDisplayName(body.overview.displayName ?? "");
        setPreferredLocale(body.overview.preferredLocale);
        setNewsletterOptIn(!!body.overview.newsletterOptIn);
      }
      setMessage("Einstellungen aktualisiert");
    } catch (err: any) {
      setMessage(err?.message ?? "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentProfile(e: React.FormEvent) {
    e.preventDefault();
    setPaymentSaving(true);
    setPaymentMessage(null);
    try {
      const res = await fetch("/api/account/payment-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          iban: ibanInput,
          bic: bicInput || undefined,
          holderName: holderNameInput || displayName || data.email,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Speichern fehlgeschlagen");
      setPaymentMessage("Bankprofil aktualisiert.");
      setIbanInput("");
      setBicInput("");
      await reloadOverview();
    } catch (err: any) {
      setPaymentMessage(err?.message ?? "Fehler beim Speichern");
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleSignature(kind: "digital" | "id_document" = "digital") {
    setSignatureSaving(true);
    setSignatureMessage(null);
    try {
      const res = await fetch("/api/account/signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Aktion fehlgeschlagen");
      setSignatureMessage("Unterschrift hinterlegt.");
      await reloadOverview();
    } catch (err: any) {
      setSignatureMessage(err?.message ?? "Aktion fehlgeschlagen");
    } finally {
      setSignatureSaving(false);
    }
  }

  const previewName = displayName || data.displayName || data.email || "Unbekannt";
  const initials = (previewName || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
            {initials || "?"}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">Profil</p>
            <h2 className="text-2xl font-semibold text-slate-900">
            {previewName}
            </h2>
            <p className="text-sm text-slate-500">{data.email}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Anzeigename
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Name für öffentliche Bereiche"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Bevorzugte Sprache
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={preferredLocale}
              onChange={(e) => setPreferredLocale(e.target.value)}
            >
              {LOCALE_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Newsletter & Updates
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
              <input
                id="newsletter"
                type="checkbox"
                checked={newsletterOptIn}
                onChange={(e) => setNewsletterOptIn(e.target.checked)}
              />
              <span>Ich möchte Updates zur Plattform erhalten.</span>
            </div>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            onClick={handleSave}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Speichert …" : "Änderungen speichern"}
          </button>
          {message && <span className="text-sm text-slate-500">{message}</span>}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Rollen & Zugänge</p>
          <h3 className="text-lg font-semibold text-slate-900">Aktive Rollen</h3>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
            <span className="rounded-full bg-slate-100 px-3 py-1">Tier: {data.accessTier}</span>
            {data.roles.map((role) => (
              <span key={role} className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                {role}
              </span>
            ))}
            {data.groups.map((group) => (
              <span key={group} className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                Gruppe: {group}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Diese Rollen bestimmen, welche Bereiche der Plattform du nutzen kannst. Anpassungen erfolgen durch das
            Access-Center oder unser Team.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Nutzung & Limits</p>
          <h3 className="text-lg font-semibold text-slate-900">Dein monatlicher Status</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-700">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Swipes (Monat)</dt>
              <dd className="text-xl font-semibold text-slate-900">{data.stats.swipesThisMonth}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Beiträge Level 1</dt>
              <dd className="text-xl font-semibold text-slate-900">{data.stats.remainingPostsLevel1}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Beiträge Level 2</dt>
              <dd className="text-xl font-semibold text-slate-900">{data.stats.remainingPostsLevel2}</dd>
            </div>
          </dl>
          <Link href="/nutzungsmodell" className="mt-4 inline-flex text-sm font-semibold text-sky-600 underline">
            Nutzungsmodell ansehen
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mitgliedschaft</p>
          <h3 className="text-lg font-semibold text-slate-900">VoiceOpenGov</h3>
          <p className="mt-2 text-sm text-slate-600">
            Status:{" "}
            <span className="font-semibold text-slate-900">
              {membershipLabel(data.vogMembershipStatus)}
            </span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Pricing-Tier: <span className="font-semibold text-slate-900">{data.pricingTier}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/unterstuetzen" className="rounded-full border border-slate-300 px-4 py-1 font-semibold">
              Unterstützen
            </Link>
            <Link href="/mitglied-werden" className="rounded-full bg-emerald-500 px-4 py-1 font-semibold text-white">
              Mitglied werden
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sicherheit & Login</p>
          <h3 className="text-lg font-semibold text-slate-900">Aktueller Zustand</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>
              <span className="font-semibold">E-Mail:</span>{" "}
              {data.emailVerified ? "bestätigt" : "noch nicht bestätigt"}
            </li>
            <li>
              <span className="font-semibold">Verifizierungs-Level:</span> {data.verificationLevel}
            </li>
            <li>
              <span className="font-semibold">Methoden:</span>{" "}
              {data.verificationMethods.length > 0
                ? data.verificationMethods.join(", ")
                : "keine"}
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            Dein Login basiert aktuell auf Benutzername/E-Mail &amp; Passwort. Weitere Identitätsmethoden folgen in den nächsten Releases.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Zuletzt angemeldet:{" "}
            {data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString("de-DE") : "n/a"}
          </p>
          {!data.emailVerified && (
            <a
              href="/register/verify-email"
              className="mt-3 inline-flex text-sm font-semibold text-sky-600 underline"
            >
              E-Mail jetzt bestätigen
            </a>
          )}
          {["none", "email"].includes(data.verificationLevel) && (
            <a
              href="/register/identity"
              className="mt-2 inline-flex text-sm font-semibold text-emerald-600 underline"
            >
              Identität bestätigen
            </a>
          )}
          <div className="mt-3 space-y-1 rounded-2xl border border-slate-100 bg-white/70 p-3 text-xs text-slate-500">
            {(["none", "email", "soft", "strong"] as const).map((level) => (
              <p key={level}>
                <span className="font-semibold text-slate-700">{level.toUpperCase()} · </span>
                {VERIFICATION_LEVEL_DESCRIPTIONS[level]}
              </p>
            ))}
          </div>
          <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900">Bankprofil</p>
              <p className="text-slate-600">
                {data.paymentProfile
                  ? `${data.paymentProfile.ibanMasked} (${data.paymentProfile.holderName})`
                  : "Noch nicht hinterlegt"}
              </p>
            </div>
            <form className="space-y-2" onSubmit={handlePaymentProfile}>
              <label className="flex flex-col text-xs font-semibold text-slate-600">
                Kontoinhaber:in
                <input
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                  value={holderNameInput}
                  onChange={(e) => setHolderNameInput(e.target.value)}
                />
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-600">
                IBAN
                <input
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                  value={ibanInput}
                  onChange={(e) => setIbanInput(e.target.value)}
                  placeholder="DE89..."
                  required
                />
              </label>
              <label className="flex flex-col text-xs font-semibold text-slate-600">
                BIC (optional)
                <input
                  className="mt-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
                  value={bicInput}
                  onChange={(e) => setBicInput(e.target.value)}
                  placeholder="BANKDEFFXXX"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-4 py-1.5 text-white disabled:opacity-60"
                disabled={paymentSaving}
              >
                {paymentSaving ? "Speichere …" : "Zahlungsmethode speichern"}
              </button>
              {paymentMessage && <p className="text-xs text-slate-500">{paymentMessage}</p>}
            </form>
          </div>
          <div className="mt-4 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900">Digitale Unterschrift</p>
              <p className="text-slate-600">
                {data.signature
                  ? `Hinterlegt am ${new Date(data.signature.storedAt).toLocaleDateString("de-DE")}`
                  : "Noch nicht hinterlegt"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSignature("digital")}
              className="rounded-full bg-emerald-500 px-4 py-1.5 font-semibold text-white disabled:opacity-60"
              disabled={signatureSaving}
            >
              {signatureSaving ? "Aktualisiere …" : "Digitale Unterschrift hinterlegen"}
            </button>
            {signatureMessage && <p className="text-xs text-slate-500">{signatureMessage}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function membershipLabel(status: AccountOverview["vogMembershipStatus"]) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "pending":
      return "In Prüfung";
    case "cancelled":
      return "Beendet";
    default:
      return "Kein aktiver Plan";
  }
}
