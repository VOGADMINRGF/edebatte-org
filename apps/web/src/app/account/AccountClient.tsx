"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { EDEBATTE_PACKAGES_WITH_NONE, EDEBATTE_PACKAGES } from "@/config/edebatte";
import type { UserRole } from "@/types/user";

// Konsistente Button-Styles im VoiceOpenGov-Gradient-CI
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(14,116,144,0.35)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200";

const primaryButtonSmallClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_22px_rgba(14,116,144,0.32)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-200";

const secondaryLightButtonClass =
  "inline-flex items-center justify-center rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200";

const ghostDarkButtonClass =
  "inline-flex items-center justify-center rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-semibold text-slate-50 shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500";

const subtleLinkClass =
  "text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline";

/**
 * Typen – können bei Bedarf mit getAccountOverview harmonisiert werden.
 */

export type ProfileData = {
  id: string;
  displayName: string;
  email: string;
  preferredLocale: string;
  newsletterOptIn: boolean;
  avatarUrl?: string | null;
  coverUrl?: string | null;
};

export type PublicProfileData = {
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
  bio?: string | null;
  tagline?: string | null;
  avatarStyle?: "initials" | "photo";
  topTopics?: string[];
  showRealName: boolean;
  showCity: boolean;
  showStats: boolean;
  showMembership: boolean;
};

export type EDebattePackage = "basis" | "start" | "pro" | "none";

export type EDebattePackageInfo = {
  package: EDebattePackage;
  status: "none" | "preorder" | "active" | "canceled";
  billingInterval?: "monthly" | "yearly";
  nextBillingDate?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
};

export type UsageInfo = {
  swipesThisMonth: number;
  swipeLimit?: number | null;
  xpLevelLabel?: string | null;
};

export type MembershipInfo = {
  isMember: boolean;
  label?: string;
  statusLabel?: string;
  contributionLabel?: string;
};

export type RoleInfo = {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  role?: UserRole;
};

export type SecurityInfo = {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string | null;
  loginHint?: string | null;
};

export type PaymentInfo = {
  ibanMasked?: string | null;
  bic?: string | null;
  accountHolder?: string | null;
  note?: string | null;
};

export type SignatureInfo = {
  hasSignature: boolean;
  updatedAt?: string | null;
};

export type FeatureFlags = {
  streamsEnabled: boolean;
  hostRightsEnabled: boolean;
  chatEnabled: boolean;
};

export type AccountOverview = {
  profile: ProfileData;
  publicProfile: PublicProfileData;
  edebatte: EDebattePackageInfo;
  usage: UsageInfo;
  membership: MembershipInfo;
  membershipSnapshot?: {
    status?: string | null;
    paymentReference?: string | null;
    paymentInfo?: {
      mandateStatus?: string | null;
    } | null;
  } | null;
  roles: RoleInfo[];
  security: SecurityInfo;
  payment: PaymentInfo;
  signature: SignatureInfo;
  features: FeatureFlags;
};

type NormalizedOverview = AccountOverview;

export type AccountClientProps = {
  initialData: any;
  membershipNotice: boolean;
};

export function AccountClient({ initialData, membershipNotice }: AccountClientProps) {
  const [data, setData] = useState<NormalizedOverview>(normalizeOverview(initialData));
  const pendingMicroTransfer =
    data.membershipSnapshot?.status === "waiting_payment" &&
    data.membershipSnapshot?.paymentInfo?.mandateStatus === "pending_microtransfer";

  async function refreshOverview() {
    try {
      const res = await fetch("/api/account/overview", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.overview) {
        setData(normalizeOverview(body.overview));
      }
    } catch (err) {
      console.warn("[account] refresh overview failed", err);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {membershipNotice && <MembershipBanner />}
      {pendingMicroTransfer && (
        <MicroTransferBanner paymentReference={data.membershipSnapshot?.paymentReference} />
      )}

      <ProfileAndPackageSection profile={data.profile} edebatte={data.edebatte} usage={data.usage} onRefresh={refreshOverview} />

      <PublicProfileSection publicProfile={data.publicProfile} onRefresh={refreshOverview} />

      <MembershipAndRolesSection membership={data.membership} roles={data.roles} />

      <SecurityAndPaymentSection security={data.security} payment={data.payment} signature={data.signature} membership={data.membership} />

      <AdvancedFeaturesSection features={data.features} />
    </div>
  );
}

export default AccountClient;

function normalizeOverview(src: any): AccountOverview {
  const paymentProfile = src?.paymentProfile ?? null;

  const profile: ProfileData = {
    id: src?.profile?.id ?? src?.id ?? "",
    displayName: src?.profile?.displayName ?? src?.displayName ?? "Dein Anzeigename",
    email: src?.profile?.email ?? src?.email ?? "",
    preferredLocale: src?.profile?.preferredLocale ?? src?.preferredLocale ?? "de",
    newsletterOptIn: Boolean(src?.profile?.newsletterOptIn ?? src?.newsletterOptIn),
    avatarUrl: src?.profile?.avatarUrl ?? null,
    coverUrl: src?.profile?.coverUrl ?? null,
  };

  const publicProfile: PublicProfileData = {
    city: src?.publicProfile?.city ?? null,
    region: src?.publicProfile?.region ?? null,
    countryCode: src?.publicProfile?.countryCode ?? null,
    bio: src?.publicProfile?.bio ?? "",
    tagline: src?.publicProfile?.tagline ?? "",
    avatarStyle: src?.publicProfile?.avatarStyle ?? "initials",
    topTopics: src?.publicProfile?.topTopics ?? [],
    showRealName: Boolean(src?.publicProfile?.showRealName),
    showCity: Boolean(src?.publicProfile?.showCity),
    showStats: Boolean(src?.publicProfile?.showStats),
    showMembership: Boolean(src?.publicProfile?.showMembership),
  };

  const edebatte: EDebattePackageInfo = {
    package: src?.edebatte?.package ?? "none",
    status: src?.edebatte?.status ?? "none",
    billingInterval: src?.edebatte?.billingInterval,
    nextBillingDate: src?.edebatte?.nextBillingDate ?? null,
    validFrom: src?.edebatte?.validFrom ?? null,
    validTo: src?.edebatte?.validTo ?? null,
  };

  const usage: UsageInfo = {
    swipesThisMonth: src?.usage?.swipesThisMonth ?? 0,
    swipeLimit: src?.usage?.swipeLimit ?? null,
    xpLevelLabel: src?.usage?.xpLevelLabel ?? null,
  };

  const membership: MembershipInfo = {
    isMember: Boolean(src?.membership?.isMember),
    label: src?.membership?.label,
    statusLabel: src?.membership?.statusLabel,
    contributionLabel: src?.membership?.contributionLabel,
  };

  const roles: RoleInfo[] = Array.isArray(src?.roles)
    ? src.roles.map((r: any, idx: number) =>
        typeof r === "string"
          ? { id: String(idx), label: r, role: r as UserRole }
          : {
              id: r.id ?? String(idx),
              label: r.label ?? r.role ?? "Rolle",
              description: r.description,
              badge: r.badge,
              role: r.role,
            },
      )
    : [];

  const security: SecurityInfo = {
    emailVerified: Boolean(src?.security?.emailVerified ?? src?.emailVerified ?? src?.verifiedEmail ?? src?.verification?.email),
    twoFactorEnabled: Boolean(
      src?.security?.twoFactorEnabled ??
        src?.security?.twoFactor ??
        src?.verification?.twoFA?.enabled ??
        src?.verification?.twoFA?.secret,
    ),
    lastLoginAt: src?.security?.lastLoginAt
      ? String(src.security.lastLoginAt)
      : src?.lastLoginAt
      ? String(src.lastLoginAt)
      : null,
    loginHint: src?.security?.loginHint ?? null,
  };

  const payment: PaymentInfo = {
    ibanMasked: src?.payment?.ibanMasked ?? paymentProfile?.ibanMasked ?? src?.membership?.paymentInfo?.bankIbanMasked ?? null,
    bic: src?.payment?.bic ?? paymentProfile?.bic ?? src?.membership?.paymentInfo?.bankBic ?? null,
    accountHolder: src?.payment?.accountHolder ?? paymentProfile?.holderName ?? src?.membership?.paymentInfo?.bankRecipient ?? null,
    note: src?.payment?.note ?? src?.membership?.paymentInfo?.reference ?? null,
  };

  const signature: SignatureInfo = {
    hasSignature: Boolean(src?.signature?.hasSignature),
    updatedAt: src?.signature?.updatedAt ?? null,
  };

  const features: FeatureFlags = {
    streamsEnabled: Boolean(src?.features?.streamsEnabled),
    hostRightsEnabled: Boolean(src?.features?.hostRightsEnabled),
    chatEnabled: Boolean(src?.features?.chatEnabled),
  };

  return {
    profile,
    publicProfile,
    edebatte,
    usage,
    membership,
    membershipSnapshot: src?.membershipSnapshot ?? null,
    roles,
    security,
    payment,
    signature,
    features,
  };
}

/* -------------------------------------------------------
 * Banner nach erfolgreicher eDebatte-Bestellung
 * ---------------------------------------------------- */

function MembershipBanner() {
  return (
    <section
      aria-label="Bestätigung eDebatte-Paket"
      className="rounded-3xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 shadow-sm"
    >
      <p className="font-medium">Vielen Dank für deine Vorbestellung von eDebatte!</p>
      <p className="mt-1 text-xs text-emerald-800">
        Dein eDebatte-Paket ist in deinem Konto hinterlegt. Sobald die App startet, erhältst du eine separate Bestätigung mit allen Details per
        E-Mail.
      </p>
    </section>
  );
}

function MicroTransferBanner({ paymentReference }: { paymentReference?: string | null }) {
  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900 shadow-[0_16px_50px_rgba(14,116,144,0.12)]">
      <p className="font-semibold">Deine Mitgliedschaft wartet auf die 0,01 €-Verifikation.</p>
      <p className="mt-1 text-xs text-sky-800">
        Sobald der TAN-Code aus der 0,01 €-Überweisung vorliegt, kannst du ihn im Zahlungsprofil
        eingeben.
      </p>
      {paymentReference && (
        <p className="mt-2 text-[11px] text-sky-700">
          Beitrags-Verwendungszweck: <span className="font-semibold">{paymentReference}</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/account/payment" className={primaryButtonSmallClass}>
          TAN-Code eingeben
        </Link>
        <Link href="/account/payment" className={secondaryLightButtonClass}>
          Zahlungsprofil öffnen
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------
 * Section A: Profil & eDebatte-Paket
 * ---------------------------------------------------- */

type ProfileAndPackageSectionProps = {
  profile: ProfileData;
  edebatte: EDebattePackageInfo;
  usage: UsageInfo;
  onRefresh: () => void;
};

function ProfileAndPackageSection({ profile, edebatte, usage, onRefresh }: ProfileAndPackageSectionProps) {
  return (
    <section aria-labelledby="account-core-heading" className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 id="account-core-heading" className="text-sm font-semibold tracking-tight text-slate-900">
          Profil &amp; eDebatte-Paket
        </h2>
        <p className="text-xs text-slate-500">Passe dein Profil an und behalte dein gewähltes eDebatte-Paket im Blick.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.6fr)]">
        <ProfileCard profile={profile} onRefresh={onRefresh} />
        <EDebattePackageCard edebatte={edebatte} usage={usage} onRefresh={onRefresh} />
      </div>
    </section>
  );
}

/* -------------------------------------------------------
 * Profilkarte mit Avatar & Cover à la LinkedIn/Facebook
 * ---------------------------------------------------- */

type ProfileCardProps = {
  profile: ProfileData;
  onRefresh: () => void;
};

function ProfileCard({ profile, onRefresh }: ProfileCardProps) {
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const handleFieldChange = (patch: Partial<ProfileData>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleCoverClick = () => {
    coverInputRef.current?.click();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: An API zum Upload anbinden.
    const previewUrl = URL.createObjectURL(file);
    setDraft((prev) => ({ ...prev, avatarUrl: previewUrl }));
  };

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: An API zum Upload anbinden.
    const previewUrl = URL.createObjectURL(file);
    setDraft((prev) => ({ ...prev, coverUrl: previewUrl }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    fetch("/api/account/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: draft.displayName,
        preferredLocale: draft.preferredLocale,
        newsletterOptIn: draft.newsletterOptIn,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Speichern fehlgeschlagen");
        setSaveMsg("Gespeichert");
        onRefresh();
      })
      .catch((err) => {
        console.warn("[account] settings update failed", err);
        setSaveMsg("Speichern fehlgeschlagen");
      })
      .finally(() => setSaving(false));
  };

  const initials =
    draft.displayName
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "VO";

  return (
    <form onSubmit={handleSubmit} className="overflow-hidden rounded-3xl bg-white/95 shadow-[0_22px_65px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
      {/* Cover / Hintergrund */}
      <div className="relative h-28 w-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500">
        {draft.coverUrl && <Image src={draft.coverUrl} alt="Profil-Hintergrundbild" fill sizes="100vw" className="object-cover" />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

        <div className="absolute right-4 bottom-3">
          <button
            type="button"
            onClick={handleCoverClick}
            className="pointer-events-auto inline-flex items-center rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            Titelbild ändern
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="sr-only" onChange={handleCoverChange} />
        </div>
      </div>

      {/* Inhalt */}
      <div className="px-5 pb-5 pt-0 sm:px-6 sm:pb-6">
        {/* Avatar + Name */}
        <div className="-mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-lg font-semibold text-slate-700 shadow-[0_12px_35px_rgba(15,23,42,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              aria-label="Profilfoto ändern"
            >
              {draft.avatarUrl ? (
                <Image src={draft.avatarUrl} alt={draft.displayName || "Profilfoto"} fill sizes="80px" className="rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              <span className="pointer-events-none absolute bottom-0 right-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white ring-2 ring-white">
                +
              </span>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Profil</p>
              <h3 className="text-lg font-semibold text-slate-900">{draft.displayName || "Dein Anzeigename"}</h3>
              <p className="text-xs text-slate-500">{draft.email}</p>
            </div>
          </div>
        </div>

        {/* Form-Felder */}
        <div className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="displayName" className="text-xs font-medium text-slate-700">
              Anzeigename
            </label>
            <input
              id="displayName"
              name="displayName"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={draft.displayName}
              onChange={(event) => handleFieldChange({ displayName: event.target.value })}
            />
            <p className="text-[11px] text-slate-400">So wirst du in der Plattform und in öffentlichen Profilen angezeigt.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-700">E-Mail-Adresse</span>
              <p className="truncate text-sm text-slate-700">{draft.email}</p>
              <p className="text-[11px] text-slate-400">Änderungen der E-Mail-Adresse sind aus Sicherheitsgründen nur über den Support möglich.</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="preferredLocale" className="text-xs font-medium text-slate-700">
                Bevorzugte Sprache
              </label>
              <select
                id="preferredLocale"
                name="preferredLocale"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
                value={draft.preferredLocale}
                onChange={(event) => handleFieldChange({ preferredLocale: event.target.value })}
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <label className="inline-flex items-start gap-2 rounded-2xl bg-slate-50/80 px-3 py-2 text-xs text-slate-700">
            <input
              type="checkbox"
              className="mt-[2px] h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              checked={draft.newsletterOptIn}
              onChange={(event) => handleFieldChange({ newsletterOptIn: event.target.checked })}
            />
            <span>Ich möchte gelegentlich Updates zur Plattform, neuen Funktionen und Einladungen zu Streams erhalten.</span>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" className={primaryButtonClass} disabled={saving}>
            {saving ? "Speichert …" : "Änderungen speichern"}
          </button>
          {saveMsg && <p className="ml-3 text-xs text-slate-500">{saveMsg}</p>}
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------
 * eDebatte-Paket-Karte
 * ---------------------------------------------------- */

type EDebattePackageCardProps = {
  edebatte: EDebattePackageInfo;
  usage: UsageInfo;
  onRefresh: () => void;
};

function getEDebatteLabel(pkg: EDebattePackage): string {
  const labels: Record<EDebattePackage, string> = {
    basis: "eDebatte Basis",
    start: "eDebatte Start",
    pro: "eDebatte Pro",
    none: "Noch kein eDebatte-Paket",
  };
  return labels[pkg] ?? "Noch kein eDebatte-Paket";
}

function getEDebatteStatusLabel(info: EDebattePackageInfo): string {
  switch (info.status) {
    case "preorder":
      return "Vorbestellt – Abrechnung startet erst zum Launch.";
    case "active":
      return "Aktiv";
    case "canceled":
      return "Beendet – Zugriff läuft zum angegebenen Datum aus.";
    case "none":
    default:
      return "Du kannst jederzeit ein eDebatte-Paket wählen.";
  }
}

function EDebattePackageCard({ edebatte, usage, onRefresh }: EDebattePackageCardProps) {
  const [showModal, setShowModal] = useState(false);

  const isNone = edebatte.status === "none";

  const label = getEDebatteLabel(edebatte.package);
  const statusLabel = getEDebatteStatusLabel(edebatte);

  const swipeLimitText =
    typeof usage.swipeLimit === "number"
      ? `${usage.swipesThisMonth} / ${usage.swipeLimit} Swipes in diesem Monat`
      : `${usage.swipesThisMonth} Swipes in diesem Monat`;

  const primaryCtaLabel = isNone ? "Paket auswählen" : "Paket wechseln";

  return (
    <>
      <section className="flex h-full flex-col justify-between rounded-3xl bg-slate-900 text-slate-50 shadow-[0_22px_65px_rgba(15,23,42,0.65)] ring-1 ring-slate-800">
        <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">eDebatte-Paket</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{isNone ? "Noch kein eDebatte-Paket" : label}</h3>
            </div>

            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 ring-1 ring-emerald-400/40">
              {isNone
                ? "Noch nicht aktiviert"
                : edebatte.status === "preorder"
                ? "Vorbestellt"
                : edebatte.status === "active"
                ? "Aktiv"
                : "Gekündigt"}
            </span>
          </div>

          <p className="text-xs text-slate-300">
            {isNone ? "Du kannst jederzeit ein eDebatte-Paket wählen – vom kostenlosen Einstieg (Basis) bis zum Pro-Paket." : statusLabel}
          </p>

          <div className="mt-3 rounded-2xl bg-slate-800/70 p-3 text-xs">
            {isNone ? (
              <p className="text-slate-200">Sobald du startest, siehst du hier deine Swipes, Limits und dein Engagement-Level.</p>
            ) : (
              <>
                <p className="text-slate-200">{swipeLimitText}</p>
                {usage.xpLevelLabel && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Engagement-Level: <span className="font-semibold">{usage.xpLevelLabel}</span>
                  </p>
                )}
              </>
            )}

            {!isNone && (edebatte.nextBillingDate || edebatte.validFrom || edebatte.validTo) && (
              <p className="mt-2 text-[11px] text-slate-400">
                {edebatte.validFrom && (
                  <>
                    gültig ab <span className="font-medium">{edebatte.validFrom}</span>
                  </>
                )}
                {edebatte.validTo && (
                  <>
                    {" · "}endet spätestens am <span className="font-medium">{edebatte.validTo}</span>
                  </>
                )}
                {edebatte.nextBillingDate && (
                  <>
                    {" · "}nächste Abrechnung: <span className="font-medium">{edebatte.nextBillingDate}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowModal(true)} className={primaryButtonSmallClass}>
              {primaryCtaLabel}
            </button>
          <Link href="/faq#edebatte" className={secondaryLightButtonClass}>
            Mehr zu eDebatte
          </Link>
        </div>

        <Link href="/faq#edebatte" className={secondaryLightButtonClass}>
          Details zu eDebatte
        </Link>
      </div>
    </section>

      {showModal && <EDebattePackageModal currentPackage={edebatte} onClose={() => setShowModal(false)} onRefresh={onRefresh} />}
    </>
  );
}

type EDebattePackageModalProps = {
  currentPackage: EDebattePackageInfo;
  onClose: () => void;
  onRefresh: () => void;
};

type EDebatteChoice = {
  id: EDebattePackage;
  name: string;
  priceLabel: string;
  description: string;
};

const EDEBATTE_CHOICES: EDebatteChoice[] = EDEBATTE_PACKAGES.map((pkg) => {
  switch (pkg) {
    case "basis":
      return {
        id: "basis" as const,
        name: "eDebatte Basis",
        priceLabel: "0,00 € / Monat",
        description: "Kostenfreier Einstieg: Inhalte ansehen, swipen, Community kennenlernen.",
      };
    case "start":
      return {
        id: "start" as const,
        name: "eDebatte Start",
        priceLabel: "9,90 € / Monat",
        description: "Für alle, die regelmäßig mitbestimmen und eigene Vorschläge einbringen wollen.",
      };
    case "pro":
      return {
        id: "pro" as const,
        name: "eDebatte Pro",
        priceLabel: "29,00 € / Monat",
        description: "Für Vielnutzer:innen, Initiativen und Organisationen mit erweiterten Kontingenten.",
      };
  }
});

function EDebattePackageModal({ currentPackage, onClose, onRefresh }: EDebattePackageModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSelect = (choiceId: EDebattePackage) => {
    fetch("/api/edebatte/package", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ package: choiceId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json().catch(() => ({}));
      })
      .then(() => {
        onClose();
        onRefresh?.();
      })
      .catch((err) => {
        console.warn("[edebatte] paketwahl fehlgeschlagen", err);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl bg-white/98 p-5 shadow-[0_32px_90px_rgba(15,23,42,0.45)] ring-1 ring-slate-200 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">eDebatte-Paket wählen</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-900">Welches Paket möchtest du nutzen?</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Hier siehst du, welche Pakete bereits beauftragt sind, was vorbestellt ist und was du zusätzlich buchen kannst.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200"
            aria-label="Auswahl schließen"
          >
            ✕
          </button>
        </header>

        <div className="mt-4 space-y-3">
          {EDEBATTE_CHOICES.map((choice) => {
            const isCurrent = currentPackage.package === choice.id && (currentPackage.status === "active" || currentPackage.status === "preorder");
            const isCanceled = currentPackage.package === choice.id && currentPackage.status === "canceled";

            let statusText: string | null = null;
            let statusClass =
              "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600";

            if (isCurrent && currentPackage.status === "active") {
              statusText = "Aktuelles Paket";
              statusClass = "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200";
            } else if (isCurrent && currentPackage.status === "preorder") {
              statusText = "Vorbestellt";
              statusClass = "inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 ring-1 ring-sky-200";
            } else if (isCanceled) {
              statusText = "Zuletzt gekündigt";
              statusClass = "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-200";
            }

            const disabled = isCurrent;

            return (
              <article key={choice.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3 py-3 ring-1 ring-slate-100 sm:px-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-900">{choice.name}</p>
                  <p className="text-[11px] text-slate-500">{choice.description}</p>
                  <p className="text-[11px] font-medium text-slate-800">{choice.priceLabel}</p>
                  {statusText && (
                    <div className="mt-1">
                      <span className={statusClass}>{statusText}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => !disabled && handleSelect(choice.id)}
                    disabled={disabled}
                    className={
                      disabled
                        ? "inline-flex items-center justify-center rounded-full bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500 cursor-default"
                        : primaryButtonSmallClass
                    }
                  >
                    {disabled ? "Ausgewählt" : "Dieses Paket wählen"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <footer className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className={secondaryLightButtonClass}>
            Auswahl schließen
          </button>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
 * Section B: Öffentliches Profil
 * ---------------------------------------------------- */

type PublicProfileSectionProps = {
  publicProfile: PublicProfileData;
  onRefresh: () => void;
};

function PublicProfileSection({ publicProfile, onRefresh }: PublicProfileSectionProps) {
  return (
    <section aria-labelledby="account-public-heading" className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 id="account-public-heading" className="text-sm font-semibold tracking-tight text-slate-900">
          Öffentliches Profil &amp; Privatsphäre
        </h2>
        <p className="text-xs text-slate-500">Steuere, wie du in öffentlichen Übersichten, Diskussionen und Streams angezeigt wirst.</p>
      </div>

      <PublicProfileCard initial={publicProfile} onRefresh={onRefresh} />
    </section>
  );
}

type PublicProfileCardProps = {
  initial: PublicProfileData;
  onRefresh: () => void;
};

function PublicProfileCard({ initial, onRefresh }: PublicProfileCardProps) {
  const [draft, setDraft] = useState<PublicProfileData>(initial);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const handleFieldChange = (patch: Partial<PublicProfileData>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bio: draft.bio,
        tagline: draft.tagline,
        city: draft.city,
        region: draft.region,
        countryCode: draft.countryCode,
        topTopics: draft.topTopics,
        showRealName: draft.showRealName,
        showCity: draft.showCity,
        showStats: draft.showStats,
        showMembership: draft.showMembership,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Speichern fehlgeschlagen");
        setSaveMsg("Gespeichert");
        onRefresh();
      })
      .catch((err) => {
        console.warn("[account] public profile update failed", err);
        setSaveMsg("Speichern fehlgeschlagen");
      })
      .finally(() => setSaving(false));
  };

  const location = [draft.city, draft.region, draft.countryCode].filter(Boolean).join(" · ");

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="public-bio" className="text-xs font-medium text-slate-700">
              Kurzbeschreibung für dein öffentliches Profil
            </label>
            <textarea
              id="public-bio"
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={draft.bio ?? ""}
              onChange={(event) => handleFieldChange({ bio: event.target.value })}
              placeholder="Zum Beispiel: Engagiert mich für bezahlbaren Wohnraum und konsequenten Klimaschutz in meiner Stadt."
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="public-tagline" className="text-xs font-medium text-slate-700">
              Optionaler Zusatz (z.B. Beruf, Rolle)
            </label>
            <input
              id="public-tagline"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={draft.tagline ?? ""}
              onChange={(event) => handleFieldChange({ tagline: event.target.value })}
              placeholder="z.B. Pflegekraft, Student, Kommunalpolitikerin"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Sichtbarkeit</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleRow label="Realnamen in öffentlichen Profilen anzeigen" checked={draft.showRealName} onChange={(value) => handleFieldChange({ showRealName: value })} />
              <ToggleRow label="Stadt / Region anzeigen" checked={draft.showCity} onChange={(value) => handleFieldChange({ showCity: value })} />
              <ToggleRow label="Anonymisierte Statistiken anzeigen" checked={draft.showStats} onChange={(value) => handleFieldChange({ showStats: value })} />
              <ToggleRow label="Mitgliedschaft bei VoiceOpenGov anzeigen" checked={draft.showMembership} onChange={(value) => handleFieldChange({ showMembership: value })} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">Ort (für öffentliche Anzeige)</p>
            <p className="text-sm text-slate-800">{location || "Noch kein öffentlicher Ort hinterlegt."}</p>
            <p className="text-[11px] text-slate-400">Die genaue Anschrift wird nie öffentlich angezeigt – nur Stadt, Region und Land, sofern du das möchtest.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Top-Themen (Auszug)</p>
            <div className="flex flex-wrap gap-1.5">
              {draft.topTopics && draft.topTopics.length > 0 ? (
                draft.topTopics.slice(0, 6).map((topic) => (
                  <span key={topic} className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800 ring-1 ring-sky-100">
                    {topic}
                  </span>
                ))
              ) : (
                <p className="text-[11px] text-slate-400">Deine Top-Themen werden angezeigt, sobald du dich aktiver mit Inhalten beschäftigst.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <div className="flex items-center gap-3">
          <button type="submit" className={primaryButtonClass} disabled={saving}>
            {saving ? "Speichert …" : "Öffentliches Profil speichern"}
          </button>
          {saveMsg && <p className="text-xs text-slate-500">{saveMsg}</p>}
        </div>
      </div>
    </form>
  );
}

type ToggleRowProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="inline-flex items-start gap-2 rounded-2xl bg-slate-50/80 px-3 py-2 text-[11px] text-slate-700">
      <input
        type="checkbox"
        className="mt-[2px] h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/* -------------------------------------------------------
 * Section C: Mitgliedschaft & Rollen
 * ---------------------------------------------------- */

type MembershipAndRolesSectionProps = {
  membership: MembershipInfo;
  roles: RoleInfo[];
};

function MembershipAndRolesSection({ membership, roles }: MembershipAndRolesSectionProps) {
  return (
    <section aria-labelledby="account-membership-heading" className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 id="account-membership-heading" className="text-sm font-semibold tracking-tight text-slate-900">
          Mitgliedschaft &amp; Rollen
        </h2>
        <p className="text-xs text-slate-500">Überblick über deine Rolle bei VoiceOpenGov und deine Mitgliedschaft.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <VOGMembershipCard membership={membership} />
        <RolesCard roles={roles} />
      </div>
    </section>
  );
}

type VOGMembershipCardProps = {
  membership: MembershipInfo;
};

function VOGMembershipCard({ membership }: VOGMembershipCardProps) {
  const title = membership.label || "Mitgliedschaft VoiceOpenGov";
  const status = membership.statusLabel || (membership.isMember ? "Aktiv" : "Noch nicht Mitglied");
  const badgeClass = membership.isMember
    ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200"
    : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-200";

  return (
    <section className="rounded-3xl bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Mitgliedschaft</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-slate-500">{status}</span>
        <span className={badgeClass}>{membership.isMember ? "aktiv" : "optional"}</span>
      </div>
      {membership.contributionLabel && <p className="mt-1 text-xs text-slate-700">Beitrag: {membership.contributionLabel}</p>}

      <p className="mt-3 text-[11px] text-slate-400">
        VoiceOpenGov finanziert sich unabhängig durch viele kleine Beiträge. Details findest du im Transparenzbericht.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/mitglied-werden" className={primaryButtonSmallClass}>
          {membership.isMember ? "Mitgliedschaft verwalten" : "Mitglied werden"}
        </Link>
        <Link href="/transparenz" className={secondaryLightButtonClass}>
          Transparenzbericht
        </Link>
      </div>
    </section>
  );
}

type RolesCardProps = {
  roles: RoleInfo[];
};

function RolesCard({ roles }: RolesCardProps) {
  const hasSuperadmin = roles.some((r) => r.role === "superadmin" || r.label === "superadmin");

  return (
    <section className="rounded-3xl bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Rollen &amp; Zugänge</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-900">Aktive Rollen</h3>

      <div className="mt-3 space-y-2">
        {roles && roles.length > 0 ? (
          roles.map((role) => (
            <div key={role.id} className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50/80 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-slate-800">{role.label}</p>
                {role.description && <p className="text-[11px] text-slate-500">{role.description}</p>}
                {role.role && (
                  <p className="text-[10px] text-slate-400">
                    Systemrolle: <span className="font-semibold">{role.role}</span>
                  </p>
                )}
              </div>
              {role.badge && (
                <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 ring-1 ring-sky-100">
                  {role.badge}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50/80 px-3 py-2 text-[11px] text-slate-500">
            Noch keine Sonderrolle hinterlegt. Für Moderation/Team-Zugänge bitte das Team kontaktieren.
          </div>
        )}
        {hasSuperadmin && (
          <div className="rounded-2xl bg-emerald-50/70 px-3 py-2 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
            Superadmin aktiv
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------
 * Section D: Sicherheit & Zahlung
 * ---------------------------------------------------- */

type SecurityAndPaymentSectionProps = {
  security: SecurityInfo;
  payment: PaymentInfo;
  signature: SignatureInfo;
  membership?: MembershipInfo;
};

function SecurityAndPaymentSection({ security, payment, signature, membership }: SecurityAndPaymentSectionProps) {
  return (
    <section aria-labelledby="account-security-heading" className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 id="account-security-heading" className="text-sm font-semibold tracking-tight text-slate-900">
          Sicherheit &amp; Zahlung
        </h2>
        <p className="text-xs text-slate-500">Login-Schutz, Zahlungsdaten und digitale Unterschrift im Überblick.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SecurityCard security={security} />
        <PaymentAndSignatureCard payment={payment} signature={signature} membership={membership} />
      </div>
    </section>
  );
}

type SecurityCardProps = {
  security: SecurityInfo;
};

function SecurityCard({ security }: SecurityCardProps) {
  const identPilot = "Zusätzliche Ident (Bank-Check / eID) in Pilotphase – schalten wir bald frei.";
  const emailOk = security.emailVerified === undefined ? true : Boolean(security.emailVerified);
  const twoFaOk = security.twoFactorEnabled === undefined ? true : Boolean(security.twoFactorEnabled);
  return (
    <section className="rounded-3xl bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Sicherheit</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-900">Aktueller Zustand</h3>

      <div className="mt-3 space-y-2 text-xs">
        <StatusRow label="E-Mail verifiziert" positive={emailOk} />
        <StatusRow label="2-Faktor-Authentifizierung" positive={twoFaOk} />
        {security.lastLoginAt && (
          <p className="text-[11px] text-slate-500">
            Letzter Login: <span className="font-medium">{security.lastLoginAt}</span>
          </p>
        )}
        {security.loginHint && <p className="text-[11px] text-slate-400">{security.loginHint}</p>}
        <p className="text-[11px] text-slate-400">{identPilot}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/account/security" className={primaryButtonSmallClass}>
          Sicherheitseinstellungen öffnen
        </Link>
      </div>
    </section>
  );
}

type StatusRowProps = {
  label: string;
  positive: boolean;
};

function StatusRow({ label, positive }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3 py-2">
      <span className="text-[11px] text-slate-700">{label}</span>
      <span
        className={
          positive
            ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200"
            : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-200"
        }
      >
        {positive ? "aktiv" : "empfohlen"}
      </span>
    </div>
  );
}

type PaymentAndSignatureCardProps = {
  payment: PaymentInfo;
  signature: SignatureInfo;
  membership?: MembershipInfo;
};

function PaymentAndSignatureCard({ payment, signature, membership }: PaymentAndSignatureCardProps) {
  const hasIban = Boolean(payment.ibanMasked);
  const contribution =
    (membership && (membership.contributionLabel || membership.statusLabel)) || null;

  return (
    <section className="rounded-3xl bg-white/95 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Zahlung &amp; Unterschrift</p>
      <h3 className="mt-1 text-sm font-semibold text-slate-900">Standardkonto &amp; digitale Unterschrift</h3>

      <div className="mt-3 space-y-3 text-xs">
        <div className="space-y-1 rounded-2xl bg-slate-50/80 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-700">Standardkonto für Beiträge</p>
          <p className="text-[11px] text-slate-600">{hasIban ? `${payment.accountHolder ?? ""} · ${payment.ibanMasked}` : "Noch kein Konto hinterlegt."}</p>
          {(payment.note || contribution) && (
            <p className="text-[11px] text-slate-400">
              {contribution ? `Aktuelle Rate: ${contribution}` : null}
              {payment.note ? ` · ${payment.note}` : null}
            </p>
          )}
        </div>

        <div className="space-y-1 rounded-2xl bg-slate-50/80 px-3 py-2">
          <p className="text-[11px] font-medium text-slate-700">Digitale Unterschrift</p>
          <p className="text-[11px] text-slate-600">
            {signature.hasSignature ? `Hinterlegt · zuletzt aktualisiert am ${signature.updatedAt ?? "–"}` : "Noch keine digitale Unterschrift hinterlegt."}
          </p>
          <p className="text-[11px] text-slate-400">
            Pilot: Auf Mobilgeräten kannst du deine Unterschrift direkt erfassen (Finger/Tablet). Für bestimmte Abstimmungen oder Mandatsvergaben kann sie hilfreich sein. Ident (Bank-Check / eID) rüsten wir gerade nach, damit du dich ohne Papieraufwand legitimieren kannst.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/account/payment" className={primaryButtonSmallClass}>
          Zahlungsprofil bearbeiten
        </Link>
        <Link href="/account/signature" className={secondaryLightButtonClass}>
          Digitale Unterschrift verwalten
        </Link>
      </div>
    </section>
  );
}

/* -------------------------------------------------------
 * Section E: Erweiterte Funktionen (Pilotphase)
 * ---------------------------------------------------- */

type AdvancedFeaturesSectionProps = {
  features: FeatureFlags;
};

function AdvancedFeaturesSection({ features }: AdvancedFeaturesSectionProps) {
  return (
    <section aria-labelledby="account-advanced-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="account-advanced-heading" className="text-sm font-semibold tracking-tight text-slate-900">
          Erweiterte Funktionen (Pilotphase)
        </h2>
        <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100">
          Early Access
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          title="Streams &amp; Sessions"
          description="Eigene Streams und thematische Sessions für deine Community – inklusive strukturierter Abstimmungen."
          enabled={features.streamsEnabled}
        />
        <FeatureCard
          title="Host-Rechte"
          description="Moderations- und Host-Rechte für größere Runden oder wiederkehrende Formate."
          enabled={features.hostRightsEnabled}
        />
        <FeatureCard
          title="Chat &amp; Kollaboration"
          description="Erweiterte Chat-Funktionen, Kollaborationsräume und begleitende Diskussionen zu Abstimmungen."
          enabled={features.chatEnabled}
        />
      </div>
    </section>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
  enabled: boolean;
};

function FeatureCard({ title, description, enabled }: FeatureCardProps) {
  return (
    <article className="flex h-full flex-col justify-between rounded-3xl bg-white/95 p-4 text-xs shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-5">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={
            enabled
              ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200"
              : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200"
          }
        >
          {enabled ? "freigeschaltet" : "Pilot / bald verfügbar"}
        </span>
        <Link href="/kontakt" className="text-[10px] font-semibold text-sky-700 underline-offset-2 hover:underline">
          Interesse melden
        </Link>
      </div>
    </article>
  );
}
