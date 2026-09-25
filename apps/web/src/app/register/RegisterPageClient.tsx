"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CORE_LOCALES, EXTENDED_LOCALES } from "@/config/locales";
import { HumanCheck } from "@/components/security/HumanCheck";
import {
  REGISTER_FEEDBACK_MESSAGE_CLASSNAME,
  REGISTER_HONEYPOT_FIELD_NAME,
  validateRegisterStep3,
} from "@/features/auth/registerSecurityContract";
import { PRODUCTION_ENTRY_COPY } from "@/features/access/productionEntryContract";
import { normalizeInternalRedirectPath } from "@/features/create/finalizeRedirect";
import { RegisterStepper } from "./RegisterStepper";
import { resolveRegisterBridge } from "./registerFlowBridge";

type RegisterStep = 1 | 2 | 3;
type GeoAddressSuggestion = {
  id: string;
  label: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
};

const MIN_PARTICIPATION_AGE = 14;
const DEFAULT_COUNTRY = "Deutschland";
const HEADLINE_GRADIENT_CLASS = "bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent";
const REGISTER_STEPS = [
  { id: 1 as const, title: "Konto", subtitle: "Anschrift" },
  { id: 2 as const, title: "Legitimation", subtitle: "Bankdaten" },
  { id: 3 as const, title: "Zugang", subtitle: "Abschluss" },
];

function okPwd(p: string) {
  return p.length >= 12 && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
}

function sanitizeBirthDateInput(value: string) {
  return value
    .replace(/[,/]/g, ".")
    .replace(/[^\d.-]/g, "")
    .slice(0, 10);
}

function toIsoBirthdate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return parseIsoDateStrict(v) ? v : null;
  }

  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;

  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  return parseIsoDateStrict(iso) ? iso : null;
}

function isoToDe(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, yyyy, mm, dd] = m;
  return `${dd}.${mm}.${yyyy}`;
}

function parseIsoDateStrict(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return isValid ? date : null;
}

function formatIsoUTC(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function latestBirthDateForMinAge(minAge: number): string {
  const now = new Date();
  const latest = new Date(Date.UTC(now.getUTCFullYear() - minAge, now.getUTCMonth(), now.getUTCDate()));
  return formatIsoUTC(latest);
}

function isAtLeastAge(isoBirthDate: string, minAge: number): boolean {
  const birthDate = parseIsoDateStrict(isoBirthDate);
  if (!birthDate) return false;
  const now = new Date();
  const latestAllowed = new Date(Date.UTC(now.getUTCFullYear() - minAge, now.getUTCMonth(), now.getUTCDate()));
  return birthDate.getTime() <= latestAllowed.getTime();
}

function sanitizeNext(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeInternalRedirectPath(raw);
}

function sanitizeInvite(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^[a-zA-Z0-9_-]{6,128}$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function formatIbanInput(value: string) {
  const cleaned = normalizeIban(value).replace(/[^A-Z0-9]/g, "");
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}

function isValidIban(iban: string) {
  const cleaned = normalizeIban(iban);
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  if (!/^[A-Z]{2}[0-9A-Z]+$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const value = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const digit of value) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

function isValidBic(bicRaw: string) {
  const normalized = bicRaw.replace(/\s+/g, "").toUpperCase();
  if (!normalized) return true;
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized);
}

type RegisterPageClientProps = {
  personCount?: number;
  searchParams?: Record<string, string | string[] | undefined>;
};

function RegisterPageClient({ personCount = 1, searchParams }: RegisterPageClientProps) {
  const fromParams = (() => {
    if (!searchParams) return personCount;
    const raw = Array.isArray(searchParams.personen) ? searchParams.personen[0] : searchParams.personen;
    const n = Number(raw ?? personCount);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : personCount;
  })();

  const [step, setStep] = useState<RegisterStep>(1);

  const [firstName, setFirstName] = useState(searchParams?.firstName ? String(searchParams.firstName) : "");
  const [lastName, setLastName] = useState(searchParams?.lastName ? String(searchParams.lastName) : "");
  const [birthDate, setBirthDate] = useState(
    searchParams?.birthDate ? sanitizeBirthDateInput(String(searchParams.birthDate)) : "",
  );

  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);

  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");
  const [bankConsent, setBankConsent] = useState(false);

  const [email, setEmail] = useState(searchParams?.email ? String(searchParams.email) : "");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [title, setTitle] = useState(searchParams?.title ? String(searchParams.title) : "");
  const [pronouns, setPronouns] = useState(searchParams?.pronouns ? String(searchParams.pronouns) : "");

  const nextParam = sanitizeNext(searchParams?.next ?? null);
  const inviteCode = sanitizeInvite(searchParams?.invite ?? null);

  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const [useNativeDate, setUseNativeDate] = useState(false);
  const [errMsg, setErrMsg] = useState<string>();
  const [okMsg, setOkMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [preferredLocale, setPreferredLocale] = useState<string>("de");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanResetSignal, setHumanResetSignal] = useState(0);
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [hpRegister, setHpRegister] = useState("");
  const [geoSuggestions, setGeoSuggestions] = useState<GeoAddressSuggestion[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const geoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const birthDateIso = toIsoBirthdate(birthDate);
  const latestBirthDateIso = latestBirthDateForMinAge(MIN_PARTICIPATION_AGE);
  const registerBridge = resolveRegisterBridge(nextParam);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const hoverNone = window.matchMedia?.("(hover: none)")?.matches ?? false;
    const probe = document.createElement("input");
    probe.type = "date";
    const supportsDate = probe.type === "date";
    setUseNativeDate(supportsDate && (coarse || hoverNone));
  }, []);

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  useEffect(() => {
    return () => {
      if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);
    };
  }, []);

  const openDatePicker = () => {
    const el = datePickerRef.current;
    if (!el) return;

    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === "function") picker.showPicker();
    else {
      el.focus();
      el.click();
    }
  };

  function scrollUp() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function validateStep1(): string | null {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return "Vor- und Nachname: jeweils mindestens 2 Zeichen.";
    }
    if (!birthDateIso) {
      return "Geburtsdatum: Bitte TT.MM.JJJJ oder JJJJ-MM-TT verwenden.";
    }
    if (!isAtLeastAge(birthDateIso, MIN_PARTICIPATION_AGE)) {
      return `Teilnahme ist erst ab ${MIN_PARTICIPATION_AGE} Jahren möglich.`;
    }
    if (street.trim().length < 2) return "Straße: bitte vollständig angeben.";
    if (houseNumber.trim().length < 1) return "Hausnummer: bitte angeben.";
    if (postalCode.trim().length < 2) return "PLZ: bitte angeben.";
    if (city.trim().length < 2) return "Ort: bitte angeben.";
    if (country.trim().length < 2) return "Land: bitte angeben.";
    return null;
  }

  function validateStep2(): string | null {
    if (bankAccountHolder.trim().length < 2) {
      return "Kontoinhaber: bitte vollständig angeben.";
    }
    if (!isValidIban(bankIban)) {
      return "IBAN ungültig. Bitte prüfen.";
    }
    if (!isValidBic(bankBic)) {
      return "BIC ungültig. Bitte prüfen oder leer lassen.";
    }
    if (!bankConsent) {
      return "Bitte bestätige den Hinweis zur Legitimation mit 0,00 € Kostenbelastung.";
    }
    return null;
  }

  function validateStep3(): string | null {
    return validateRegisterStep3({
      email,
      password,
      humanToken,
    });
  }

  function nextStep() {
    const validation = step === 1 ? validateStep1() : validateStep2();
    if (validation) {
      setErrMsg(validation);
      return;
    }
    setErrMsg(undefined);
    setStep((prev) => Math.min(3, prev + 1) as RegisterStep);
    scrollUp();
  }

  function prevStep() {
    setErrMsg(undefined);
    setStep((prev) => Math.max(1, prev - 1) as RegisterStep);
    scrollUp();
  }

  function applyGeoSuggestion(suggestion: GeoAddressSuggestion) {
    setStreet(suggestion.street ?? street);
    setHouseNumber(suggestion.houseNumber ?? houseNumber);
    setPostalCode(suggestion.postalCode ?? postalCode);
    setCity(suggestion.city ?? city);
    if (suggestion.countryCode === "DE") {
      setCountry("Deutschland");
    } else if (suggestion.countryCode) {
      setCountry(suggestion.countryCode);
    }
    setGeoSuggestions([]);
    setGeoLoading(false);
  }

  function handleStreetChange(value: string) {
    setStreet(value);
    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);

    const query = value.trim();
    if (query.length < 3) {
      setGeoSuggestions([]);
      setGeoLoading(false);
      return;
    }

    setGeoLoading(true);
    geoTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.ok || !Array.isArray(body.suggestions)) {
          setGeoSuggestions([]);
          return;
        }
        setGeoSuggestions(body.suggestions.slice(0, 6));
      } catch {
        setGeoSuggestions([]);
      } finally {
        setGeoLoading(false);
      }
    }, 250);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrMsg(undefined);
    setOkMsg(undefined);

    const step1Validation = validateStep1();
    if (step1Validation) {
      setStep(1);
      setErrMsg(step1Validation);
      return;
    }

    const step2Validation = validateStep2();
    if (step2Validation) {
      setStep(2);
      setErrMsg(step2Validation);
      return;
    }

    const step3Validation = validateStep3();
    if (step3Validation) {
      setStep(3);
      setErrMsg(step3Validation);
      return;
    }

    setBusy(true);
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort("timeout"), 15_000);

      const registerParams = new URLSearchParams();
      if (personCount > 1) {
        registerParams.set("householdSize", String(personCount));
      }
      if (inviteCode) {
        registerParams.set("invite", inviteCode);
      }
      const query = registerParams.toString();
      const registerUrl = query ? `/api/auth/register?${query}` : "/api/auth/register";

      const startedAt = formStartedAt ?? Date.now();
      const r = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          email,
          name: [firstName, lastName].map((p) => p.trim()).filter(Boolean).join(" ") || undefined,
          password,
          preferredLocale,
          newsletterOptIn,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthDateIso,
          title: title.trim() || undefined,
          pronouns: pronouns.trim() || undefined,
          address: {
            street: street.trim(),
            houseNumber: houseNumber.trim(),
            line2: addressLine2.trim() || undefined,
            postalCode: postalCode.trim(),
            city: city.trim(),
            country: country.trim(),
          },
          bank: {
            accountHolder: bankAccountHolder.trim(),
            iban: normalizeIban(bankIban),
            bic: bankBic.trim() ? bankBic.trim().toUpperCase() : undefined,
            consent: bankConsent,
          },
          humanToken,
          formStartedAt: startedAt,
          [REGISTER_HONEYPOT_FIELD_NAME]: hpRegister,
          inviteCode: inviteCode ?? undefined,
          next: nextParam ?? undefined,
        }),
        signal: ac.signal,
      });

      clearTimeout(t);

      const ct = r.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await r.json().catch(() => ({}))
        : { error: (await r.text()).slice(0, 500) };

      if (!r.ok) {
        if (data?.error === "human_token_expired" || data?.error === "human_token_invalid") {
          const isExpired = data?.error === "human_token_expired";
          const err = isExpired
            ? "Der Sicherheitscheck ist abgelaufen. Bitte bestätige ihn kurz erneut."
            : "Der Sicherheitscheck konnte nicht bestätigt werden. Bitte löse ihn kurz erneut.";
          setHumanToken(null);
          setHumanResetSignal((value) => value + 1);
          setErrMsg(err);
          return;
        }
        if (data?.error === "minimum_age_not_met") {
          setErrMsg(`Teilnahme ist erst ab ${MIN_PARTICIPATION_AGE} Jahren möglich.`);
          setStep(1);
          return;
        }
        if (data?.error === "birthdate_invalid") {
          setErrMsg("Geburtsdatum: Bitte ein gültiges Datum eingeben.");
          setStep(1);
          return;
        }
        if (data?.error === "invalid_iban") {
          setErrMsg("IBAN ungültig. Bitte prüfen.");
          setStep(2);
          return;
        }
        if (data?.error === "invalid_bic") {
          setErrMsg("BIC ungültig. Bitte prüfen oder leer lassen.");
          setStep(2);
          return;
        }
        if (data?.error === "email_in_use") {
          setErrMsg("Diese E-Mail wird bereits verwendet. Bitte melde dich an oder nutze eine andere E-Mail.");
          setStep(3);
          return;
        }
        throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
      }

      const emailVerificationPending = data?.emailVerification?.status === "pending";
      setOkMsg(
        emailVerificationPending
          ? "Konto erstellt. Wir leiten dich zur Verifizierung weiter. Falls keine E-Mail ankommt, kannst du den Versand dort erneut auslösen."
          : "Konto erstellt. Weiterleitung zur E-Mail-Verifizierung …",
      );
      const nextQuery = nextParam ? `&next=${encodeURIComponent(nextParam)}` : "";
      const mailQuery = emailVerificationPending ? "&mail=pending" : "";
      router.push(`/register/verify-email?email=${encodeURIComponent(email)}${nextQuery}${mailQuery}`);
    } catch (err: any) {
      setErrMsg(
        err?.name === "AbortError"
          ? "Zeitüberschreitung. Bitte erneut versuchen."
          : err?.message || "Unbekannter Fehler",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-[24px] bg-[rgb(var(--card))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-[rgb(var(--border))] sm:p-5">
      {registerBridge && (
        <section className="rounded-2xl border border-sky-400/35 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-100">
          <p className="text-sm font-semibold">{registerBridge.title}</p>
          <p className="mt-1">{registerBridge.text}</p>
        </section>
      )}

      <header className="space-y-2">
        <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
          <span className={HEADLINE_GRADIENT_CLASS}>Registrieren</span>
        </h1>
        <p className="text-xs text-[rgb(var(--muted))]">
          Dein eDebatte-Konto: sicherer Zugang, verlässliche Identitätsprüfung und klarer Datenschutz.
        </p>
        <p className="text-xs text-[rgb(var(--muted))]">{PRODUCTION_ENTRY_COPY.registerTrustHint}</p>
      </header>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5 text-xs text-[rgb(var(--muted))]">
        <p className="font-semibold text-[rgb(var(--fg))]">Datenschutz und Vertrauen bei eDebatte</p>
        <p className="mt-1">
          Wir verarbeiten nur notwendige Angaben und trennen sensible Daten technisch, damit Sicherheit und
          Nachvollziehbarkeit im Vordergrund stehen.
        </p>
        <p className="mt-1">
          Beschlossene Ergebnisse werden strukturiert dokumentiert und evidenzbasiert weitergeführt, damit aus Debatte
          belastbare, faktenorientierte Entwicklungswege entstehen können.
        </p>
        <p className="mt-1">
          Wenn du darüber hinaus die Initiative unterstützen möchtest, kannst du nach der Registrierung optional einen
          Mitgliedsantrag stellen.
        </p>
      </section>

      <RegisterStepper current={step} steps={REGISTER_STEPS} />

      {fromParams > 1 && step === 1 && (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
          Aus Mitgliedsantrag übernommen: <strong>{fromParams}</strong> Personen ab 14 Jahren.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
        <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor={REGISTER_HONEYPOT_FIELD_NAME}>Bitte leer lassen</label>
          <input
            id={REGISTER_HONEYPOT_FIELD_NAME}
            name={REGISTER_HONEYPOT_FIELD_NAME}
            type="text"
            tabIndex={-1}
            autoComplete="new-password"
            inputMode="none"
            data-form-type="other"
            data-1p-ignore="true"
            data-lpignore="true"
            value={hpRegister}
            onChange={(e) => setHpRegister(e.target.value)}
          />
        </div>

        {step === 1 && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Schritt 1 · Konto und Anschrift</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="firstName" className="text-xs font-medium text-[rgb(var(--muted))]">Vorname</label>
                <input
                  id="firstName"
                  name="firstName"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="lastName" className="text-xs font-medium text-[rgb(var(--muted))]">Nachname</label>
                <input
                  id="lastName"
                  name="lastName"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor={useNativeDate ? "birthDateNative" : "birthDate"} className="text-xs font-medium text-[rgb(var(--muted))]">
                Geburtsdatum
              </label>
              <input
                ref={datePickerRef}
                id="birthDateNative"
                name={useNativeDate ? "birthDate" : undefined}
                type="date"
                className={
                  useNativeDate
                    ? "w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    : "sr-only"
                }
                value={birthDateIso ?? ""}
                onChange={(e) => {
                  const iso = e.currentTarget.value;
                  if (iso) setBirthDate(isoToDe(iso));
                }}
                max={latestBirthDateIso}
                disabled={busy}
              />
              {!useNativeDate && (
                <div className="relative">
                  <input
                    id="birthDate"
                    name="birthDate"
                    type="text"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={birthDate}
                    onChange={(e) => setBirthDate(sanitizeBirthDateInput(e.target.value))}
                    placeholder="TT.MM.JJJJ oder JJJJ-MM-TT"
                    inputMode="text"
                    maxLength={10}
                    autoComplete="bday"
                    title="TT.MM.JJJJ oder JJJJ-MM-TT"
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={openDatePicker}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-1 text-xs shadow-sm"
                    aria-label="Datum auswählen"
                    title="Datum auswählen"
                  >
                    Kalender
                  </button>
                </div>
              )}
              <p className="text-[11px] text-[rgb(var(--muted))]">Teilnahme bei eDebatte ist ab 14 Jahren möglich.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1">
                <label htmlFor="street" className="text-xs font-medium text-[rgb(var(--muted))]">Straße</label>
                <div className="relative">
                  <input
                    id="street"
                    name="street"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={street}
                    onChange={(e) => handleStreetChange(e.target.value)}
                    placeholder="Straße"
                    autoComplete="street-address"
                    maxLength={120}
                    disabled={busy}
                  />
                  {geoLoading ? (
                    <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">Adresshilfe lädt …</p>
                  ) : null}
                  {!geoLoading && geoSuggestions.length > 0 ? (
                    <ul className="absolute z-20 mt-1 w-full divide-y divide-[rgb(var(--border))] overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-lg">
                      {geoSuggestions.map((suggestion) => (
                        <li key={suggestion.id}>
                          <button
                            type="button"
                            onClick={() => applyGeoSuggestion(suggestion)}
                            className="flex w-full flex-col px-3 py-2 text-left hover:bg-[rgb(var(--bg))]"
                          >
                            <span className="text-sm text-[rgb(var(--fg))]">{suggestion.label}</span>
                            <span className="text-[11px] text-[rgb(var(--muted))]">
                              {[suggestion.postalCode, suggestion.city].filter(Boolean).join(" ")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <p className="text-[11px] text-[rgb(var(--muted))]">Adresshilfe auf Basis OpenStreetMap (datenschutzfreundlich, optional).</p>
              </div>
              <div className="space-y-1 sm:w-28">
                <label htmlFor="houseNumber" className="text-xs font-medium text-[rgb(var(--muted))]">Nr.</label>
                <input
                  id="houseNumber"
                  name="houseNumber"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  placeholder="12a"
                  autoComplete="off"
                  maxLength={12}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="addressLine2" className="text-xs font-medium text-[rgb(var(--muted))]">Adresszusatz (optional)</label>
              <input
                id="addressLine2"
                name="addressLine2"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="c/o, Wohnung, Etage ..."
                autoComplete="off"
                maxLength={120}
                disabled={busy}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-1">
                <label htmlFor="postalCode" className="text-xs font-medium text-[rgb(var(--muted))]">PLZ</label>
                <input
                  id="postalCode"
                  name="postalCode"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="city" className="text-xs font-medium text-[rgb(var(--muted))]">Ort</label>
                <input
                  id="city"
                  name="city"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="country" className="text-xs font-medium text-[rgb(var(--muted))]">Land</label>
              <input
                id="country"
                name="country"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                autoComplete="country-name"
                disabled={busy}
              />
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Schritt 2 · Bankdaten zur Legitimation</p>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-3 text-xs text-[rgb(var(--muted))]">
              <p className="font-semibold text-[rgb(var(--fg))]">Kostenfreies Modell · 0,00 €</p>
              <p className="mt-1">
                Es erfolgt aktuell keine kostenpflichtige Abbuchung. Die Bankdaten dienen der Legitimation und
                Missbrauchsprävention.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="bankAccountHolder" className="text-xs font-medium text-[rgb(var(--muted))]">Kontoinhaber</label>
              <input
                id="bankAccountHolder"
                name="bankAccountHolder"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                autoComplete="name"
                disabled={busy}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="bankIban" className="text-xs font-medium text-[rgb(var(--muted))]">IBAN</label>
              <input
                id="bankIban"
                name="bankIban"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm font-medium tracking-wide text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={bankIban}
                onChange={(e) => setBankIban(formatIbanInput(e.target.value))}
                autoComplete="iban"
                inputMode="text"
                placeholder="DE00 0000 0000 0000 0000 00"
                disabled={busy}
              />
              <p className="text-[11px] text-[rgb(var(--muted))]">Wir speichern nur maskierte und abgesicherte Zahlungsmerkmale.</p>
            </div>

            <div className="space-y-1">
              <label htmlFor="bankBic" className="text-xs font-medium text-[rgb(var(--muted))]">BIC (optional)</label>
              <input
                id="bankBic"
                name="bankBic"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={bankBic}
                onChange={(e) => setBankBic(e.target.value.toUpperCase())}
                autoComplete="off"
                placeholder="z. B. COLSDE33"
                disabled={busy}
              />
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
              <input
                type="checkbox"
                checked={bankConsent}
                onChange={(e) => setBankConsent(e.target.checked)}
                className="mt-0.5"
                disabled={busy}
              />
              <span>
                Ich verstehe: für den kostenfreien Zugang entsteht keine kostenpflichtige Abbuchung (0,00 €), die
                Bankdaten werden für Legitimation und Missbrauchsprävention genutzt.
              </span>
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Schritt 3 · Zugang und Abschluss</p>

            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-medium text-[rgb(var(--muted))]">E-Mail</label>
              <input
                id="email"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                type="email"
                name="email"
                placeholder="person@example.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
              />
              <p className="text-[11px] text-[rgb(var(--muted))]">Bei mobilen Tastaturen: Feld antippen, dann wird die E-Mail-Tastatur mit „@“ geladen.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[rgb(var(--muted))]" htmlFor="password">Passwort</label>
              <div className="relative">
                <input
                  id="password"
                  className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 pr-12 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  type={showPwd ? "text" : "password"}
                  name="password"
                  placeholder="Passwort (>=12, Zahl & Sonderzeichen)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={12}
                  pattern="^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$"
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                  aria-describedby="pw-help"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-1 text-xs"
                  tabIndex={-1}
                >
                  {showPwd ? "Verbergen" : "Anzeigen"}
                </button>
              </div>
              <p id="pw-help" className={`text-xs ${okPwd(password) ? "text-emerald-600" : "text-[rgb(var(--muted))]"}`}>
                Anforderungen: min. 12 Zeichen, mind. eine Zahl und ein Sonderzeichen.
              </p>
            </div>

            <details className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[rgb(var(--fg))]">Mehr Angaben (optional)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="title" className="text-xs font-medium text-[rgb(var(--muted))]">Titel (optional)</label>
                  <input
                    id="title"
                    name="title"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Dr., Prof., ..."
                    autoComplete="honorific-prefix"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="pronouns" className="text-xs font-medium text-[rgb(var(--muted))]">Pronomen (optional)</label>
                  <input
                    id="pronouns"
                    name="pronouns"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    placeholder="sie/ihr, er/ihm, ..."
                    autoComplete="additional-name"
                    disabled={busy}
                  />
                </div>
              </div>
            </details>

            <details className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2.5">
              <summary className="cursor-pointer list-none text-xs font-semibold text-[rgb(var(--fg))]">Sprache und Hinweise</summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[rgb(var(--muted))]">Bevorzugte Sprache</label>
                  <select
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={preferredLocale}
                    onChange={(e) => setPreferredLocale(e.target.value)}
                    disabled={busy}
                  >
                    {[...CORE_LOCALES, ...EXTENDED_LOCALES].map((loc) => (
                      <option key={loc} value={loc}>
                        {loc.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
                  <input
                    type="checkbox"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    disabled={busy}
                  />
                  Ich möchte Updates und Hinweise per E-Mail erhalten.
                </label>
              </div>
            </details>

            <div className="space-y-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-3">
              <HumanCheck
                formId="register"
                disabled={busy}
                resetSignal={humanResetSignal}
                onSolved={(res) => {
                  setHumanToken(res.token);
                  setErrMsg((current) =>
                    current?.includes("Sicherheitscheck") ? undefined : current,
                  );
                }}
                onError={() => {
                  setHumanToken(null);
                }}
              />
            </div>
          </section>
        )}

        {errMsg && (
          <p
            className={`${REGISTER_FEEDBACK_MESSAGE_CLASSNAME} border-rose-200/80 bg-rose-50/80 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/12 dark:text-rose-100`}
            aria-live="assertive"
          >
            {String(errMsg)}
          </p>
        )}
        {okMsg && (
          <p
            className={`${REGISTER_FEEDBACK_MESSAGE_CLASSNAME} border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/12 dark:text-emerald-100`}
            aria-live="polite"
          >
            {okMsg}
          </p>
        )}

        <div className="sticky bottom-2 z-10 -mx-1 mt-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 p-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] shadow-[0_12px_30px_rgba(2,6,23,0.12)] backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--card))]/85">
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--bg))] disabled:opacity-50"
              >
                Zurück
              </button>
            ) : (
              <div className="flex-1" />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-105 disabled:opacity-50"
              >
                Weiter
              </button>
            ) : (
              <button
                type="submit"
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-105 disabled:opacity-50"
              >
                {busy ? "Konto wird erstellt ..." : "Konto erstellen"}
              </button>
            )}
          </div>
        </div>
      </form>

      <p className="text-xs text-[rgb(var(--muted))]">
        Schon ein Konto?{" "}
        <Link
          className="font-semibold text-[rgb(var(--fg))] underline"
          href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : "/login"}
        >
          Login
        </Link>
      </p>
    </div>
  );
}

export default RegisterPageClient;