"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  AccountOverview,
  AccountProfile,
  ProfilePublicFlags,
  ProfileTopTopic,
} from "@features/account/types";
import {
  CORE_LOCALES,
  EXTENDED_LOCALES,
  type SupportedLocale,
} from "@/config/locales";
import { LIMITS } from "@/config/limits";
import { B2C_PLANS } from "@/config/plans";
import { VERIFICATION_LEVEL_DESCRIPTIONS } from "@features/auth/verificationRules";
import { TOPIC_CHOICES, type TopicKey } from "@features/interests/topics";
import { canEditTopTopics, canUseProfileStyles } from "@features/account/capabilities";
import { getProfilePackageForAccessTier } from "@features/account/profilePackages";
import {
  canUserChatPublic,
  canUserCreateStream,
  canUserHostStream,
} from "@/utils/accessTiers";
import { useCurrentUser } from "@/hooks/auth";

const LOCALE_OPTIONS = [...CORE_LOCALES, ...EXTENDED_LOCALES];
type Props = {
  initialData: AccountOverview;
  membershipNotice?: boolean;
};

export function AccountClient({ initialData, membershipNotice }: Props) {
  const [data, setData] = useState<AccountOverview>(initialData);
  const [displayName, setDisplayName] = useState(initialData.displayName ?? "");
  const [headline, setHeadline] = useState(initialData.profile?.headline ?? "");
  const [bio, setBio] = useState(initialData.profile?.bio ?? "");
  const [avatarStyle, setAvatarStyle] = useState<AccountProfile["avatarStyle"]>(
    initialData.profile?.avatarStyle ?? "initials",
  );
  const [topTopics, setTopTopics] = useState<ProfileTopTopic[]>(initialData.profile?.topTopics ?? []);
  const [publicFlags, setPublicFlags] = useState<ProfilePublicFlags>(
    initialData.profile?.publicFlags ?? {},
  );
  const [preferredLocale, setPreferredLocale] = useState<SupportedLocale>(
    initialData.preferredLocale as SupportedLocale,
  );
  const [newsletterOptIn, setNewsletterOptIn] = useState(!!initialData.newsletterOptIn);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [ibanInput, setIbanInput] = useState("");
  const [bicInput, setBicInput] = useState("");
  const [holderNameInput, setHolderNameInput] = useState(initialData.displayName ?? "");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState<string | null>(null);
  const [planSaving, setPlanSaving] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const { refresh: refreshAuth } = useCurrentUser();
  const profilePackage = data.profilePackage ?? getProfilePackageForAccessTier(data.accessTier);
  const accessContext = {
    accessTier: data.accessTier,
    engagementXp: data.stats.xp,
    engagementLevel: data.stats.engagementLevel,
  };
  const currentPlan = data.planSlug ?? data.accessTier;
  const currentPlanLimit = LIMITS[data.accessTier]?.contributionsPerMonth ?? 0;
  const membership = data.membershipSnapshot;
  const membershipStatus = membership?.status ?? data.vogMembershipStatus;

  function toggleTopic(key: TopicKey) {
    setTopTopics((prev) => {
      const exists = prev.find((topic) => topic.key === key);
      if (exists) return prev.filter((topic) => topic.key !== key);
      if (prev.length >= 3) return prev;
      const choice = TOPIC_CHOICES.find((topic) => topic.key === key);
      if (!choice) return prev;
      return [...prev, { key, title: choice.label, statement: "" }];
    });
  }

  function updateTopicStatement(key: TopicKey, value: string) {
    setTopTopics((prev) =>
      prev.map((topic) =>
        topic.key === key
          ? { ...topic, statement: value.slice(0, 140) }
          : topic,
      ),
    );
  }

  function updatePublicFlag(key: keyof ProfilePublicFlags, value: boolean) {
    setPublicFlags((prev) => ({ ...prev, [key]: value }));
  }

  function syncFromOverview(overview: AccountOverview) {
    setData(overview);
    setDisplayName(overview.displayName ?? "");
    setPreferredLocale(overview.preferredLocale as SupportedLocale);
    setNewsletterOptIn(!!overview.newsletterOptIn);
    setHeadline(overview.profile?.headline ?? "");
    setBio(overview.profile?.bio ?? "");
    setAvatarStyle(overview.profile?.avatarStyle ?? "initials");
    setTopTopics(overview.profile?.topTopics ?? []);
    setPublicFlags(overview.profile?.publicFlags ?? {});
  }

  async function reloadOverview() {
    const res = await fetch("/api/account/overview", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.overview) {
      syncFromOverview(body.overview);
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
        syncFromOverview(body.overview);
      }
      setMessage("Einstellungen aktualisiert");
    } catch (err: any) {
      setMessage(err?.message ?? "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  }

  async function handleProfileSave() {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          headline,
          bio,
          avatarStyle,
          topTopics: topTopics.map((topic) => ({
            key: topic.key,
            statement: (topic.statement ?? "").trim() || null,
          })),
          publicFlags,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Speichern fehlgeschlagen");
      if (body?.overview) {
        syncFromOverview(body.overview);
      }
      setProfileMessage("Profil aktualisiert");
    } catch (err: any) {
      setProfileMessage(err?.message ?? "Fehler beim Speichern");
    } finally {
      setProfileSaving(false);
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

  async function handlePlanChange(planId: string) {
    setPlanSaving(planId);
    setPlanMessage(null);
    try {
      const res = await fetch("/api/account/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Planwechsel fehlgeschlagen");
      }
      await reloadOverview();
      await refreshAuth?.();
      setPlanMessage("Plan aktualisiert.");
    } catch (err: any) {
      setPlanMessage(err?.message ?? "Planwechsel fehlgeschlagen");
    } finally {
      setPlanSaving(null);
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
  const topicsEditable = canEditTopTopics(data.stats.engagementLevel);
  const stylesEnabled = canUseProfileStyles(data.stats.engagementLevel, profilePackage);

  return (
    <div className="space-y-6">
      {membershipNotice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Mitgliedsantrag eingegangen</p>
          <p className="mt-1">
            Danke für deinen Antrag. Falls du Zahlungsinformationen brauchst, findest du sie in der
            Bestätigungs-Mail. Sobald der Beitrag eingegangen ist, bestätigen wir deine Mitgliedschaft.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          Mitgliedschaft: {membershipLabel(membershipStatus)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1">
          App-Nutzung: {currentPlan ?? "unbekannt"}
        </span>
      </div>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
              {initials || "?"}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">Profil</p>
              <h2 className="text-2xl font-semibold text-slate-900">{previewName}</h2>
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
              onChange={(e) =>
                setPreferredLocale(e.target.value as SupportedLocale)
              }
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

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Profil & Privatsphäre</p>
            <h2 className="text-xl font-semibold text-slate-900">Öffentliche Angaben</h2>
            <p className="text-xs text-slate-500">Profil-Paket: {profilePackage}</p>
          </div>
          {profileMessage && <span className="text-sm text-slate-500">{profileMessage}</span>}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Überschrift
            <input
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="z.B. Bürger:in aus Berlin, Fokus Klima"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Bio
            <textarea
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kurzbeschreibung für dein öffentliches Profil"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Avatar-Stil
            <select
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={avatarStyle ?? "initials"}
              onChange={(e) => setAvatarStyle(e.target.value as AccountProfile["avatarStyle"])}
              disabled={!stylesEnabled}
            >
              <option value="initials">Initialen</option>
              <option value="abstract">Abstrakt</option>
              <option value="emoji">Emoji</option>
            </select>
            {!stylesEnabled && (
              <p className="mt-1 text-xs text-slate-500">
                Erweiterte Styles ab Level „begeistert“ und Profil-Paket Pro/Premium.
              </p>
            )}
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">Top-Themen (max. 3)</p>
            {!topicsEditable && (
              <span className="text-xs font-semibold text-amber-700">
                Top-Themen ab Level „engagiert“ freigeschaltet
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOPIC_CHOICES.map((topic) => {
              const selected = topTopics.some((item) => item.key === topic.key);
              const disabled = !topicsEditable || (!selected && topTopics.length >= 3);
              return (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => toggleTopic(topic.key)}
                  disabled={disabled}
                  className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                    selected
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  } ${disabled ? "opacity-50" : ""}`}
                >
                  {topic.label}
                </button>
              );
            })}
          </div>
          {topTopics.length > 0 && (
            <div className="mt-3 space-y-3">
              {topTopics.map((topic) => (
                <div key={topic.key} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{topic.title}</p>
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={topic.statement ?? ""}
                    onChange={(e) => updateTopicStatement(topic.key, e.target.value)}
                    placeholder="Warum ist dir dieses Thema wichtig? (max. 140 Zeichen)"
                    maxLength={140}
                    disabled={!topicsEditable}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={publicFlags.showRealName ?? false}
              onChange={(e) => updatePublicFlag("showRealName", e.target.checked)}
            />
            Realname anzeigen
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={publicFlags.showCity ?? false}
              onChange={(e) => updatePublicFlag("showCity", e.target.checked)}
            />
            Stadt anzeigen
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={publicFlags.showJoinDate ?? false}
              onChange={(e) => updatePublicFlag("showJoinDate", e.target.checked)}
            />
            Mitglied seit … anzeigen
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={publicFlags.showEngagementLevel ?? false}
              onChange={(e) => updatePublicFlag("showEngagementLevel", e.target.checked)}
            />
            Engagement-Level anzeigen
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={publicFlags.showStats ?? false}
              onChange={(e) => updatePublicFlag("showStats", e.target.checked)}
            />
            Statistiken anzeigen
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            onClick={handleProfileSave}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={profileSaving}
          >
            {profileSaving ? "Speichert …" : "Profil speichern"}
          </button>
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
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              Status:{" "}
              <span className="font-semibold text-slate-900">
                {membershipLabel(membershipStatus)}
              </span>
            </p>
            {membership?.amountPerMonth ? (
              <p>
                Beitrag:{" "}
                <span className="font-semibold text-slate-900">
                  {formatEuro(membership.amountPerMonth)}{" "}
                  {membership.rhythm === "once"
                    ? "(einmalig)"
                    : membership.rhythm === "yearly"
                      ? "/ Jahr"
                      : "/ Monat"}
                </span>
                {membership.householdSize ? ` · Haushalt: ${membership.householdSize}` : null}
              </p>
            ) : (
              <p className="text-slate-600">
                Noch kein Beitrag hinterlegt. Starte deinen Mitgliedsantrag, um die Bewegung zu
                unterstützen.
              </p>
            )}
            {membership?.edebatte?.enabled && membership.edebatte.finalPricePerMonth ? (
              <p>
                eDebatte-Vorbestellung:{" "}
                <span className="font-semibold">
                  {membership.edebatte.planKey ?? "Paket"} ·{" "}
                  {formatEuro(membership.edebatte.finalPricePerMonth)} / Monat
                </span>
              </p>
            ) : null}
            {membership?.paymentInfo && membershipStatus === "waiting_payment" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">Zahlung ausstehend</p>
                <p>
                  Bitte überweise deinen Beitrag an {membership.paymentInfo.bankRecipient}{" "}
                  {membership.paymentInfo.bankName ? `(${membership.paymentInfo.bankName})` : ""}.
                </p>
                <p>
                  IBAN: <span className="font-semibold">{membership.paymentInfo.bankIbanMasked}</span>{" "}
                  {membership.paymentInfo.bankBic ? `· BIC ${membership.paymentInfo.bankBic}` : ""}
                </p>
                <p>
                  Verwendungszweck:{" "}
                  <span className="font-semibold">{membership.paymentInfo.reference}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigator?.clipboard?.writeText?.(membership.paymentInfo.bankIbanMasked)}
                    className="rounded-full border border-amber-300 px-3 py-1 font-semibold text-amber-900 hover:border-amber-400"
                  >
                    IBAN kopieren
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator?.clipboard?.writeText?.(membership.paymentInfo.reference)}
                    className="rounded-full border border-amber-300 px-3 py-1 font-semibold text-amber-900 hover:border-amber-400"
                  >
                    Verwendungszweck kopieren
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-amber-900">
                  Aufbauphase {membership.paymentInfo.accountMode === "private_preUG" ? "Privatkonto" : "Org-Konto"}; keine Spendenquittung, i.d.R. nicht absetzbar.
                  <span
                    className="ml-1 cursor-help text-amber-700"
                    title="Beiträge fließen aktuell in Entwicklung, Server/Produktion, Lebensunterhalt in der Aufbauphase und Rücklagen für die Gründung der gUG/UG."
                  >
                    ℹ︎
                  </span>
                </p>
              </div>
            )}
            {membershipStatus === "active" && membership?.amountPerMonth && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Aktive Mitgliedschaft – {formatEuro(membership.amountPerMonth)}{" "}
                {membership.rhythm === "yearly" ? "/ Jahr" : membership.rhythm === "once" ? "(einmalig)" : "/ Monat"}
                {membership.householdSize ? ` · ${membership.householdSize} Personen` : ""}. Zahlung läuft als Dauerüberweisung auf das hinterlegte Konto.
                <span
                  className="ml-1 cursor-help text-emerald-700"
                  title="Mittelverwendung: Entwicklung, Betrieb/Server, Produktionskosten, Lebensunterhalt in der Aufbauphase, Rücklagen für gUG/UG."
                >
                  ℹ︎
                </span>
              </div>
            )}
            {["cancelled", "household_locked"].includes(membershipStatus) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">
                  Mitgliedschaft aktuell inaktiv / Haushalt gesperrt.
                </p>
                <p className="mt-1">
                  Du kannst jederzeit neu beantragen, wenn du die Mitgliedschaft reaktivieren möchtest.
                </p>
                <Link
                  href="/mitglied-werden"
                  className="mt-2 inline-flex rounded-full bg-sky-600 px-3 py-1 font-semibold text-white"
                >
                  Neu beantragen
                </Link>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/unterstuetzen"
              className="rounded-full border border-slate-300 px-4 py-1 font-semibold"
            >
              Unterstützen
            </Link>
            <Link
              href="/mitglied-werden"
              className="rounded-full bg-emerald-500 px-4 py-1 font-semibold text-white"
            >
              Mitglied werden
            </Link>
            {membershipStatus === "waiting_payment" && (
              <Link
                href="/mitglied-antrag"
                className="rounded-full border border-emerald-300 px-4 py-1 font-semibold text-emerald-700"
              >
                Zahlungsinfos ansehen
              </Link>
            )}
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

      <section className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">App-Nutzung & Limits</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Dein aktueller Plan: {currentPlan ?? "unbekannt"}
            </h3>
            <p className="text-sm text-slate-600">
              {data.stats.xp} XP · Level {data.stats.engagementLevel} · {data.stats.contributionCredits} Credits · Monatslimit{" "}
              {currentPlanLimit}
            </p>
          </div>
          {planMessage && <span className="text-xs text-slate-600">{planMessage}</span>}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {B2C_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const limit = LIMITS[plan.id as keyof typeof LIMITS]?.contributionsPerMonth ?? 0;
            const price =
              typeof plan.monthlyFeeCents === "number"
                ? `${(plan.monthlyFeeCents / 100).toFixed(2)} € / Monat`
                : "Kostenlos";
            return (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-inner"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{plan.id}</p>
                <h4 className="text-lg font-semibold text-slate-900">{plan.label}</h4>
                <p className="text-sm text-slate-600">{plan.description}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{price}</p>
                <p className="text-xs text-slate-500">Monatslimit Beiträge: {limit}</p>
                <p className="text-xs text-slate-500">
                  Inklusive Credits: {(plan.includedPerMonth.level1 ?? 0) + (plan.includedPerMonth.level2 ?? 0)}
                </p>
                <button
                  type="button"
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={isCurrent || planSaving !== null}
                  className="mt-3 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isCurrent ? "Aktueller Plan" : planSaving === plan.id ? "Wechsle …" : "Plan wählen"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Streams & Teilnahme</p>
          <h3 className="text-lg font-semibold text-slate-900">Stream erstellen</h3>
          <p className="mt-2 text-sm text-slate-600">
            Du brauchst mindestens Engagement-Level "Brennend" und einen Tier mit Stream-Rechten.
          </p>
          <button
            type="button"
            disabled={!canUserCreateStream(accessContext)}
            className="mt-4 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            title={
              canUserCreateStream(accessContext)
                ? undefined
                : "Erfordert Engagement-Level 'Brennend' und einen Tier mit Stream-Rechten."
            }
          >
            {canUserCreateStream(accessContext)
              ? "Stream jetzt erstellen"
              : "Stream-Erstellung aktuell gesperrt"}
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Streaming</p>
          <h3 className="text-lg font-semibold text-slate-900">Host-Rechte</h3>
          <p className="mt-2 text-sm text-slate-600">
            Hosting erfordert Engagement-Level "Inspirierend" oder höher sowie Pro/Ultra oder Staff.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {canUserHostStream(accessContext)
              ? "Du kannst Streams hosten."
              : "Hosting aktuell nicht freigeschaltet."}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Public Chat</p>
          <h3 className="text-lg font-semibold text-slate-900">Chat-Berechtigung</h3>
          <p className="mt-2 text-sm text-slate-600">
            Öffentlich schreiben ist für Organisationstiers deaktiviert. Citizen-Tiers mit Chat-Flag können sofort
            mitdiskutieren.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {canUserChatPublic(accessContext)
              ? "Chatting freigeschaltet"
              : "Chat aktuell gesperrt"}
          </p>
        </div>
      </section>
    </div>
  );
}

function membershipLabel(status: AccountOverview["vogMembershipStatus"]) {
  switch (status) {
    case "submitted":
      return "Eingereicht";
    case "active":
      return "Aktiv";
    case "pending":
      return "In Prüfung";
    case "waiting_payment":
      return "Zahlung ausstehend";
    case "cancelled":
      return "Beendet";
    case "household_locked":
      return "Haushalt gesperrt";
    default:
      return "Kein aktiver Plan";
  }
}

function formatEuro(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}
