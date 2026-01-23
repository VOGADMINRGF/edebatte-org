"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CORE_LOCALES, EXTENDED_LOCALES } from "@/config/locales";
import { HumanCheck } from "@/components/security/HumanCheck";
import { RegisterStepper } from "./RegisterStepper";

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
    return Number.isNaN(Date.parse(v)) ? null : v;
  }

  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;

  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function isoToDe(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, yyyy, mm, dd] = m;
  return `${dd}.${mm}.${yyyy}`;
}

function sanitizeNext(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed;
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

  const [email, setEmail] = useState(searchParams?.email ? String(searchParams.email) : "");
  const [firstName, setFirstName] = useState(searchParams?.firstName ? String(searchParams.firstName) : "");
  const [lastName, setLastName] = useState(searchParams?.lastName ? String(searchParams.lastName) : "");
  const [title, setTitle] = useState(searchParams?.title ? String(searchParams.title) : "");
  const [pronouns, setPronouns] = useState(searchParams?.pronouns ? String(searchParams.pronouns) : "");
  const [birthDate, setBirthDate] = useState(
    searchParams?.birthDate ? sanitizeBirthDateInput(String(searchParams.birthDate)) : "",
  );
  const nextParam = sanitizeNext(searchParams?.next ?? null);
  const datePickerRef = useRef<HTMLInputElement | null>(null);
  const [useNativeDate, setUseNativeDate] = useState(false);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [errMsg, setErrMsg] = useState<string>();
  const [okMsg, setOkMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [preferredLocale, setPreferredLocale] = useState<string>("de");
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanNote, setHumanNote] = useState<string | null>(null);
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [hpRegister, setHpRegister] = useState("");
  const router = useRouter();
  const birthDateIso = toIsoBirthdate(birthDate);

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

  const openDatePicker = () => {
    const el = datePickerRef.current;
    if (!el) return;

    // Chrome/Edge unterstützen showPicker; iOS Safari öffnet via click/focus
    const picker = el as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === "function") picker.showPicker();
    else {
      el.focus();
      el.click();
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrMsg(undefined);
    setOkMsg(undefined);

    if (!humanToken) {
      setErrMsg("Bitte Sicherheitscheck bestätigen.");
      return;
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setErrMsg("Vor- und Nachname: jeweils mindestens 2 Zeichen.");
      return;
    }

    if (!okPwd(password)) {
      setErrMsg("Passwort: min. 12 Zeichen, inkl. Zahl & Sonderzeichen.");
      return;
    }

    if (!birthDateIso) {
      setErrMsg("Geburtsdatum: Bitte TT.MM.JJJJ oder JJJJ-MM-TT verwenden.");
      return;
    }

    setBusy(true);
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort("timeout"), 15_000);

      const registerUrl =
        personCount > 1
          ? `/api/auth/register?householdSize=${encodeURIComponent(String(personCount))}`
          : "/api/auth/register";

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
          humanToken,
          formStartedAt: startedAt,
          hp_register: hpRegister,
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
          const note = isExpired
            ? "Sicherheitscheck abgelaufen. Bitte erneut."
            : "Sicherheitscheck ungültig. Bitte erneut.";
          const err = isExpired
            ? "Sicherheitscheck abgelaufen. Bitte erneut bestätigen."
            : "Sicherheitscheck ungültig. Bitte erneut bestätigen.";
          setHumanToken(null);
          setHumanNote(note);
          setErrMsg(err);
          return;
        }
        throw new Error(data?.error || data?.message || `HTTP ${r.status}`);
      }

      setOkMsg("Konto erstellt. Weiterleitung zur Verifizierung …");
      const nextQuery = nextParam ? `&next=${encodeURIComponent(nextParam)}` : "";
      router.push(`/register/verify-email?email=${encodeURIComponent(email)}${nextQuery}`);
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
    <div className="space-y-8 rounded-[32px] bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
      <RegisterStepper current={1} />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Registrieren</h1>
        <p className="mt-1 text-sm text-slate-600">
          Basisdaten anlegen, E-Mail bestätigen und anschließend deine Identität sichern – damit Citizen Votes fair bleiben.
        </p>
      </div>

      {fromParams > 1 && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-xs text-sky-900">
          <p className="font-semibold">Aus deinem Mitgliedsantrag übernommen</p>
          <p className="mt-1">
            Du hast <strong>{fromParams}</strong> Personen ab 16 Jahren angegeben. Dieses Formular legt das Konto für die
            Hauptkontaktperson an. Weitere Personen kannst du später im Profil ergänzen.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-slate-100 bg-white/95 p-5 shadow-sm">
        <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="hp_register">Bitte leer lassen</label>
          <input
            id="hp_register"
            name="hp_register"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hpRegister}
            onChange={(e) => setHpRegister(e.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="firstName" className="text-xs font-medium text-slate-700">
              Vorname
            </label>
            <input
              id="firstName"
              name="firstName"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              minLength={2}
              disabled={busy}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="lastName" className="text-xs font-medium text-slate-700">
              Nachname
            </label>
            <input
              id="lastName"
              name="lastName"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              minLength={2}
              disabled={busy}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="title" className="text-xs font-medium text-slate-700">
              Titel (optional)
            </label>
            <input
              id="title"
              name="title"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dr., Prof., ..."
              autoComplete="honorific-prefix"
              disabled={busy}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pronouns" className="text-xs font-medium text-slate-700">
              Pronomen (optional)
            </label>
            <input
              id="pronouns"
              name="pronouns"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="sie/ihr, er/ihm, ..."
              autoComplete="additional-name"
              disabled={busy}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor={useNativeDate ? "birthDateNative" : "birthDate"} className="text-xs font-medium text-slate-700">
            Geburtsdatum
          </label>
          <input
            ref={datePickerRef}
            id="birthDateNative"
            name={useNativeDate ? "birthDate" : undefined}
            type="date"
            className={
              useNativeDate
                ? "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                : "sr-only"
            }
            value={birthDateIso ?? ""}
            onChange={(e) => {
              const iso = e.currentTarget.value;
              if (iso) setBirthDate(isoToDe(iso));
            }}
            required={useNativeDate}
            disabled={busy}
          />
          {!useNativeDate && (
            <div className="relative">
              <input
                id="birthDate"
                name="birthDate"
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={birthDate}
                onChange={(e) => setBirthDate(sanitizeBirthDateInput(e.target.value))}
                required
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
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
                aria-label="Datum auswählen"
                title="Datum auswählen"
              >
                Kalender
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Für faire Citizen Votes: Teilnahme ab 16 Jahren.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-medium text-slate-700">
            E-Mail
          </label>
          <input
            id="email"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            type="email"
            name="email"
            placeholder="person@example.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            disabled={busy}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="password">
            Passwort
          </label>
          <div className="relative">
            <input
              id="password"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-12 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              type={showPwd ? "text" : "password"}
              name="password"
              placeholder="Passwort (≥12, Zahl & Sonderzeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              pattern="^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$"
              autoComplete="new-password"
              disabled={busy}
              aria-describedby="pw-help"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs"
              tabIndex={-1}
            >
              {showPwd ? "Verbergen" : "Anzeigen"}
            </button>
          </div>
          <p
            id="pw-help"
            className={`text-xs ${okPwd(password) ? "text-emerald-600" : "text-slate-500"}`}
          >
            Anforderungen: min. 12 Zeichen, mind. eine Zahl und ein Sonderzeichen.
          </p>
        </div>

        {errMsg && (
          <p className="text-sm text-red-600" aria-live="assertive">
            {String(errMsg)}
          </p>
        )}
        {okMsg && (
          <p className="text-sm text-emerald-700" aria-live="polite">
            {okMsg}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Bevorzugte Sprache</label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={newsletterOptIn}
            onChange={(e) => setNewsletterOptIn(e.target.checked)}
            disabled={busy}
          />
          Ich möchte Updates & Hinweise per E-Mail erhalten.
        </label>

        <div className="space-y-2">
          <HumanCheck
            formId="register"
            onSolved={(res) => {
              setHumanToken(res.token);
              setHumanNote("Sicherheitscheck bestanden.");
            }}
            onError={() => {
              setHumanToken(null);
              setHumanNote("Sicherheitscheck fehlgeschlagen. Bitte erneut.");
            }}
          />
          {humanNote && (
            <p className="text-xs text-slate-600" aria-live="polite">
              {humanNote}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
        >
          {busy ? "Sende …" : "Konto anlegen"}
        </button>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 text-sm text-slate-700 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Warum diese Schritte?</h2>
        <ul className="mt-3 space-y-2 text-xs md:text-sm">
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              eDebatte ist keine Partei und kein klassischer Verein – die Infrastruktur wird über Mitgliedsbeiträge
              getragen. Wir finanzieren keine Werbung und arbeiten ohne Spendenquittungen.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              Persönliche Daten werden in einer eigenen PII-Zone gespeichert. Zahlungs- und Identitätsdaten verlassen nie
              unseren kontrollierten Bereich und werden nicht verkauft.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>
              Die OTP/eID-Prüfung schützt gegen Bots und Mehrfachaccounts. Nur so bleiben Citizen Votes fair und
              belastbar.
            </span>
          </li>
        </ul>
      </section>

      <p className="text-sm text-slate-600">
        Schon ein Konto?{" "}
        <Link className="font-semibold text-slate-900 underline" href="/login">
          Login
        </Link>
      </p>
    </div>
  );
}

export default RegisterPageClient;
