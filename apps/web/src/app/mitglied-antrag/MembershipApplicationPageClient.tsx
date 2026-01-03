// apps/web/src/app/mitglied-antrag/MembershipApplicationPageClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { safeRandomId } from "@core/utils/random";
import { useCurrentUser } from "@/hooks/auth";
import { loadMembershipDraft, clearMembershipDraft } from "@features/membership/draftStorage";
import { HumanCheck } from "@/components/security/HumanCheck";

type Rhythm = "monthly" | "once" | "yearly";
type MemberRole = "primary" | "adult" | "youth";
type PaymentType = "bank_transfer";

type MemberFormState = {
  id: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  email: string;
  role: MemberRole;
};

type PaymentFormState = {
  type: PaymentType;
  billingName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  iban: string;
  geo?: {
    lat: number;
    lon: number;
    label?: string;
  };
};

type ApiResponse =
  | { ok: true; data?: { membershipId?: string; invitesCreated?: number } }
  | { ok: false; error?: string; message?: string; errorCode?: string };

type StepId = 1 | 2 | 3;

const MIN_CONTRIBUTION_PER_PERSON = 5.63;
const CONTRIBUTION_PRESETS = [5.63, 10, 15, 25, 40];


export function MembershipApplicationPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [draft, setDraft] = React.useState<ReturnType<typeof loadMembershipDraft> | null>(null);
  const [step, setStep] = React.useState<StepId>(1);

  React.useEffect(() => {
    setDraft(loadMembershipDraft());
  }, []);

  // --- Query-Params aus /mitglied-werden ------------------------------------

  const initialAmount: number = React.useMemo(() => {
    const raw = searchParams.get("betrag");
    if (raw) {
      const num = Number.parseFloat(raw.replace(",", "."));
      if (Number.isFinite(num) && num > 0) return Math.round(num * 100) / 100;
    }
    if (draft?.contributionPerPerson) {
      return Math.max(0, Math.round(draft.contributionPerPerson * draft.householdSize * 100) / 100);
    }
    return 10;
  }, [searchParams, draft]);

  const initialRhythm: Rhythm = React.useMemo(() => {
    const raw = (searchParams.get("rhythm") || "").toLowerCase();
    if (raw === "monatlich" || raw === "monthly") return "monthly";
    if (raw === "jährlich" || raw === "jaehrlich" || raw === "yearly") return "yearly";
    if (draft?.rhythm) return draft.rhythm;
    return "once";
  }, [searchParams, draft]);

  const initialHouseholdSize: number = React.useMemo(() => {
    const raw = searchParams.get("personen");
    const n = raw ? Number.parseInt(raw, 10) : 1;
    if (Number.isFinite(n) && n >= 1 && n <= 20) return n;
    if (draft?.householdSize) return draft.householdSize;
    return 1;
  }, [searchParams, draft]);

  const membershipSelected = searchParams.get("mitgliedschaft") === "1";
  const membershipAmountFromQuery = React.useMemo(() => {
    const raw = searchParams.get("membershipAmountPerMonth");
    if (!raw) return initialAmount;
    const num = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(num) ? Math.max(0, Math.round(num * 100) / 100) : initialAmount;
  }, [initialAmount, searchParams]);

  const contributionPerPersonFromQuery = React.useMemo(() => {
    const raw = searchParams.get("contributionPerPerson");
    if (raw) {
      const num = Number.parseFloat(raw.replace(",", "."));
      if (Number.isFinite(num) && num > 0) {
        return roundCurrency(Math.max(MIN_CONTRIBUTION_PER_PERSON, num));
      }
    }
    if (membershipAmountFromQuery > 0 && initialHouseholdSize > 0) {
      return roundCurrency(
        Math.max(MIN_CONTRIBUTION_PER_PERSON, membershipAmountFromQuery / initialHouseholdSize),
      );
    }
    if (membershipSelected) return MIN_CONTRIBUTION_PER_PERSON;
    return MIN_CONTRIBUTION_PER_PERSON;
  }, [initialHouseholdSize, membershipAmountFromQuery, membershipSelected, searchParams]);

  const [contributionPerPerson, setContributionPerPerson] = React.useState<number>(
    contributionPerPersonFromQuery,
  );

  const edbEnabled = searchParams.get("edb") === "1" || !!draft?.withEdebate;
  const edbPlanKey = (searchParams.get("edbPlan") ?? draft?.edebattePlanKey) || undefined;
  const edbFinalPerMonth = React.useMemo(() => {
    const raw = searchParams.get("edbFinalPerMonth");
    if (!raw) return 0;
    const num = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(num) ? Math.max(0, Math.round(num * 100) / 100) : 0;
  }, [searchParams]);
  const edbListPricePerMonth = React.useMemo(() => {
    const raw = searchParams.get("edbListPricePerMonth");
    if (!raw) return undefined;
    const num = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(num) ? Math.max(0, Math.round(num * 100) / 100) : undefined;
  }, [searchParams]);
  const edbDiscountPercent = React.useMemo(() => {
    const raw = searchParams.get("edbDiscountPercent");
    if (!raw) return undefined;
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
  }, [searchParams]);
  const edbBillingMode = (searchParams.get("edbBilling") as "monthly" | "yearly" | null) ?? undefined;

  // --- Helper für Initial-Member -------------------------------------------

  function makeMember(role: MemberRole): MemberFormState {
    return {
      id: safeRandomId(),
      givenName: "",
      familyName: "",
      birthDate: "",
      email: "",
      role,
    };
  }

  const primaryDefaults = React.useMemo(() => {
    const givenName =
      (user as any)?.profile?.givenName ??
      ((user as any)?.profile?.displayName || "").split(" ")[0] ??
      "";
    const familyName = (user as any)?.profile?.familyName ?? "";
    const email = (user as any)?.email ?? "";
    return { givenName: givenName || "", familyName: familyName || "", email: email || "" };
  }, [user]);

  const [rhythm] = React.useState<Rhythm>(initialRhythm);
  const [householdSize] = React.useState<number>(initialHouseholdSize);

  const normalizedContributionPerPerson = Number.isFinite(contributionPerPerson)
    ? contributionPerPerson
    : MIN_CONTRIBUTION_PER_PERSON;
  const contributionBelowMin = normalizedContributionPerPerson < MIN_CONTRIBUTION_PER_PERSON;
  const validatedContributionPerPerson = Math.max(
    MIN_CONTRIBUTION_PER_PERSON,
    normalizedContributionPerPerson,
  );
  const membershipAmountPerMonth = roundCurrency(validatedContributionPerPerson * householdSize);
  const totalPerMonth = roundCurrency(
    membershipAmountPerMonth + (edbEnabled ? edbFinalPerMonth : 0),
  );
  const amountPerPeriod = totalPerMonth;
  const contributionSliderMax = Math.max(
    50,
    Math.ceil(validatedContributionPerPerson / 5) * 5,
  );

  const [members, setMembers] = React.useState<MemberFormState[]>(() => {
    const list: MemberFormState[] = [];
    // primary
    list.push({
      ...makeMember("primary"),
      givenName: primaryDefaults.givenName,
      familyName: primaryDefaults.familyName,
      email: primaryDefaults.email,
    });
    for (let i = 1; i < initialHouseholdSize; i += 1) {
      list.push(makeMember("adult"));
    }
    return list;
  });

  const [payment, setPayment] = React.useState<PaymentFormState>(() => {
    const displayName =
      (user as any)?.profile?.displayName ??
      `${primaryDefaults.givenName} ${primaryDefaults.familyName}`.trim();
    return {
      type: "bank_transfer",
      billingName: displayName || "",
      street: "",
      postalCode: "",
      city: "",
      country: "Deutschland",
      iban: "",
    };
  });
  const [geoSuggestions, setGeoSuggestions] = React.useState<
    Array<{
      id: string;
      label: string;
      street?: string;
      houseNumber?: string;
      postalCode?: string;
      city?: string;
      lat: number;
      lon: number;
    }>
  >([]);
  const [geoLoading, setGeoLoading] = React.useState(false);
  const [geoQuery, setGeoQuery] = React.useState("");
  const geoTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const [legal, setLegal] = React.useState({
    transparency: false,
    statute: false,
    householdAuthority: false,
  });

  const [humanToken, setHumanToken] = React.useState<string | null>(null);
  const [humanNote, setHumanNote] = React.useState<string | null>(null);
  const [formStartedAt, setFormStartedAt] = React.useState<number | null>(null);
  const [hpMembership, setHpMembership] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{
    membershipId: string;
    invites: number;
  } | null>(null);

  // --- Member-Update-Helper -------------------------------------------------

  function updateMember(id: string, patch: Partial<MemberFormState>) {
    setMembers((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...patch } : m));

      // Rolle "primary" konsistent halten: genau eine Person
      if (patch.role && patch.role === "primary") {
        let primarySeen = false;
        return next.map((m) => {
          if (m.id === id) {
            primarySeen = true;
            return m;
          }
          if (m.role === "primary") {
            if (!primarySeen) {
              primarySeen = true;
              return m;
            }
            return { ...m, role: "adult" };
          }
          return m;
        });
      }

      // Falls nach Änderungen gar keine primary mehr existiert -> erste Person als primary
      if (!next.some((m) => m.role === "primary") && next.length > 0) {
        next[0] = { ...next[0], role: "primary" };
      }

      return next;
    });
  }

  function addMember() {
    setMembers((prev) => {
      if (prev.length >= householdSize) return prev;
      return [...prev, makeMember("adult")];
    });
  }

  // Sync billingName placeholder with primary member if empty
  React.useEffect(() => {
    const primary = members.find((m) => m.role === "primary");
    const name = [primary?.givenName, primary?.familyName].filter(Boolean).join(" ").trim();
    if (!payment.billingName && name && primary?.givenName && primary?.familyName) {
      setPayment((prev) => ({ ...prev, billingName: name }));
    }
  }, [members, payment.billingName]);

  React.useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  function removeMember(id: string) {
    setMembers((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((m) => m.id !== id);
      if (!filtered.some((m) => m.role === "primary") && filtered.length > 0) {
        filtered[0] = { ...filtered[0], role: "primary" };
      }
      return filtered;
    });
  }

  // --- Payment-Helper -------------------------------------------------------

  function updatePayment(patch: Partial<PaymentFormState>) {
    setPayment((prev) => ({ ...prev, ...patch }));
  }

  function normalizeIban(raw: string): string {
    return raw.replace(/\s+/g, "").toUpperCase();
  }

  function isValidIban(raw: string): boolean {
    const normalized = normalizeIban(raw);
    if (!normalized || normalized.length < 15 || normalized.length > 34) return false;
    if (!/^[A-Z]{2}[0-9A-Z]+$/.test(normalized)) return false;
    const rearranged = normalized.slice(4) + normalized.slice(0, 4);
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

  function handleGeoInput(value: string) {
    setGeoQuery(value);
    setPayment((prev) => ({ ...prev, street: value }));
    if (geoTimeout.current) clearTimeout(geoTimeout.current);
    if (value.trim().length < 3) {
      setGeoSuggestions([]);
      return;
    }
    geoTimeout.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(value)}`);
        const body = await res.json().catch(() => null);
        if (res.ok && body?.suggestions) {
          setGeoSuggestions(body.suggestions);
        } else {
          setGeoSuggestions([]);
        }
      } catch {
        setGeoSuggestions([]);
      } finally {
        setGeoLoading(false);
      }
    }, 350);
  }

  function applyGeoSuggestion(s: {
    id: string;
    label: string;
    street?: string;
    houseNumber?: string;
    postalCode?: string;
    city?: string;
    lat: number;
    lon: number;
  }) {
    setPayment((prev) => ({
      ...prev,
      street: [s.street, s.houseNumber].filter(Boolean).join(" "),
      postalCode: s.postalCode ?? "",
      city: s.city ?? "",
      geo: { lat: s.lat, lon: s.lon, label: s.label },
    }));
    setGeoQuery([s.street, s.houseNumber].filter(Boolean).join(" "));
    setGeoSuggestions([]);
  }

  // --- Validation & Submit --------------------------------------------------

  function validateBeforeSubmit(): string | null {
    if (!legal.transparency || !legal.statute || !legal.householdAuthority) {
      return "Bitte bestätige alle rechtlichen Hinweise, bevor du den Antrag absendest.";
    }

    if (!Number.isFinite(contributionPerPerson) || contributionPerPerson < MIN_CONTRIBUTION_PER_PERSON) {
      return `Bitte wähle einen Beitrag pro Person von mindestens ${formatEuro(
        MIN_CONTRIBUTION_PER_PERSON,
      )}.`;
    }

    if (!members.length) {
      return "Bitte gib mindestens eine Person an.";
    }

    const primary = members.find((m) => m.role === "primary");
    if (!primary) {
      return "Bitte markiere eine Person als Hauptperson / Antragsteller:in.";
    }
    if (!primary.givenName.trim() || !primary.familyName.trim()) {
      return "Für die Hauptperson benötigen wir Vor- und Nachnamen.";
    }

    if (members.length > householdSize) {
      return "Die Anzahl der Haushaltsmitglieder überschreitet die angegebene Haushaltsgröße.";
    }

    if (!payment.billingName.trim()) {
      return "Bitte gib einen Namen für die Zahlung/Beitragsbuchung an.";
    }

    if (!payment.iban.trim() || !isValidIban(payment.iban)) {
      return "Bitte gib eine gültige IBAN für die 0,01 €-Verifikation an.";
    }

    if (totalPerMonth <= 0) {
      return "Dein Beitrag darf nicht 0 sein. Bitte passe den Betrag an.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (step !== 3) {
      setStep((prev) => (prev < 3 ? ((prev + 1) as StepId) : prev));
      return;
    }

    if (!humanToken) {
      setError("Bitte Sicherheitscheck bestätigen.");
      return;
    }

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const startedAt = formStartedAt ?? Date.now();
      const payload = {
        amountPerPeriod,
        membershipAmountPerMonth,
        peopleCount: householdSize,
        rhythm,
        householdSize,
        members: members.map((m) => ({
          givenName: m.givenName.trim() || undefined,
          familyName: m.familyName.trim() || undefined,
          birthDate: m.birthDate.trim() || undefined,
          email: m.email.trim() || undefined,
          role: m.role,
        })),
        payment: {
          type: "bank_transfer",
          billingName: payment.billingName.trim(),
          street: payment.street.trim() || undefined,
          postalCode: payment.postalCode.trim() || undefined,
          city: payment.city.trim() || undefined,
          country: payment.country.trim() || undefined,
          iban: normalizeIban(payment.iban) || undefined,
          geo: payment.geo
            ? {
                lat: payment.geo.lat,
                lon: payment.geo.lon,
                label: payment.geo.label,
              }
            : undefined,
        },
        legalTransparencyAccepted: legal.transparency,
        legalStatuteAccepted: legal.statute,
        edebatte: edbEnabled
          ? {
              enabled: true,
              planKey: edbPlanKey ? (edbPlanKey.startsWith("edb-") ? edbPlanKey : `edb-${edbPlanKey}`) : undefined,
              listPricePerMonth: edbListPricePerMonth,
              discountPercent: edbDiscountPercent,
              finalPricePerMonth: edbFinalPerMonth,
              billingMode: edbBillingMode,
            }
          : { enabled: false },
        humanToken,
        formStartedAt: startedAt,
        hp_membership: hpMembership,
      };

      const res = await fetch("/api/memberships/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !data || !("ok" in data) || !data.ok) {
        const msg =
          (data as any)?.error ||
          (data as any)?.message ||
          "Dein Antrag konnte nicht gespeichert werden. Bitte versuche es später erneut.";
        setError(msg);
        return;
      }

      const membershipId = String((data as any)?.data?.membershipId ?? "");
      const invites = Number((data as any)?.data?.invitesCreated ?? 0);
      setSuccess({ membershipId, invites });
      clearMembershipDraft();
      setTimeout(() => {
        router.push("/account?membership=thanks");
      }, 1200);
    } catch (err: any) {
      setError(
        err?.message ||
          "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später noch einmal.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // --- Login-Gate -----------------------------------------------------------

  if (!user) {
    const query = searchParams.toString();
    const next = query ? `/mitglied-antrag?${query}` : "/mitglied-antrag";

    return (
      <div className="space-y-6 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-xl">
        <h1 className="text-2xl font-extrabold leading-tight text-slate-900">
          Mitgliedschaft – bitte zuerst einloggen oder registrieren
        </h1>
        <p className="text-sm text-slate-700">
          Um eine Mitgliedschaft abzuschließen, brauchst du ein persönliches Konto. So können wir
          deine Stimme eindeutig zuordnen und dir die notwendigen Unterlagen zusenden.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            Einloggen
          </Link>
          <Link
            href={`/register?next=${encodeURIComponent(next)}`}
            className="inline-flex items-center justify-center rounded-full border border-sky-300 px-5 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          >
            Neues Konto anlegen
          </Link>
        </div>
      </div>
    );
  }

  // --- UI -------------------------------------------------------------------

  const rhythmLabel =
    rhythm === "monthly" ? "pro Monat" : rhythm === "yearly" ? "pro Jahr" : "einmalig";
  const steps = [
    { id: 1 as StepId, title: "Beitrag", hint: "Wunschbetrag" },
    { id: 2 as StepId, title: "Haushalt", hint: "Personen & Rollen" },
    { id: 3 as StepId, title: "Zahlung", hint: "Bestätigung" },
  ];
  const stepProgress = ((step - 1) / (steps.length - 1)) * 100;
  const canProceedFromStep1 = Number.isFinite(contributionPerPerson) && !contributionBelowMin;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
    >
      <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="hp_membership">Bitte leer lassen</label>
        <input
          id="hp_membership"
          name="hp_membership"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hpMembership}
          onChange={(e) => setHpMembership(e.target.value)}
        />
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white/95 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
              Mitgliedschaft abschließen
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              Mit deinem Beitrag unterstützt du VoiceOpenGov, die direktdemokratische Bewegung.
              eDebatte ist unser Werkzeug für die digitale Infrastruktur, die wir gemeinsam
              aufbauen.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            <p className="font-semibold text-slate-700">
              Schritt {step} von {steps.length}
            </p>
            <p className="mt-1">Bearbeitungszeit: ca. 3 Minuten</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {steps.map((item) => {
              const isActive = step === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left text-xs transition ${
                    isActive
                      ? "border-sky-300 bg-sky-50 text-sky-900 shadow-sm"
                      : "border-slate-100 bg-white text-slate-600 hover:border-sky-200"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isActive
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.id}
                  </span>
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-wide">
                      {item.title}
                    </span>
                    <span className="block text-[11px] text-slate-500">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {step === 1 && (
        <section className="space-y-4">
          {!membershipSelected && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Hinweis</p>
              <p className="mt-1">
                Im Rechner war die Mitgliedschaft deaktiviert. Du kannst hier trotzdem einen
                Beitrag wählen (mindestens {formatEuro(MIN_CONTRIBUTION_PER_PERSON)} pro Person)
                und den Antrag abschließen.
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-sky-100/70 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-emerald-100/70 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Beitrag pro Person</h2>
                    <p className="text-xs text-slate-600">
                      Frei wählbar, mindestens {formatEuro(MIN_CONTRIBUTION_PER_PERSON)} pro Person
                      und Monat.
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Bewegungsbeitrag
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-slate-700">
                      Betrag pro Person / Monat
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={MIN_CONTRIBUTION_PER_PERSON}
                          step="0.01"
                          value={Number.isFinite(contributionPerPerson) ? contributionPerPerson : ""}
                          onChange={(e) => {
                            const parsed = parseEuroInput(e.target.value);
                            if (parsed === null) {
                              setContributionPerPerson(Number.NaN);
                              return;
                            }
                            setContributionPerPerson(parsed);
                          }}
                          className="w-36 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
                          € / Person
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Mindestbetrag {formatEuro(MIN_CONTRIBUTION_PER_PERSON)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={MIN_CONTRIBUTION_PER_PERSON}
                      max={contributionSliderMax}
                      step="0.01"
                      value={validatedContributionPerPerson}
                      onChange={(e) =>
                        setContributionPerPerson(Number.parseFloat(e.target.value))
                      }
                      className="w-full accent-sky-500"
                    />
                    <div className="flex flex-wrap gap-2">
                      {CONTRIBUTION_PRESETS.map((amount) => {
                        const isActive =
                          Math.abs(validatedContributionPerPerson - amount) < 0.01;
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setContributionPerPerson(amount)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition ${
                              isActive
                                ? "border-sky-500 bg-sky-500 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
                            }`}
                          >
                            {formatEuro(amount)}
                          </button>
                        );
                      })}
                    </div>
                    {contributionBelowMin && (
                      <p className="text-xs text-amber-700">
                        Der Beitrag pro Person muss mindestens{" "}
                        {formatEuro(MIN_CONTRIBUTION_PER_PERSON)} betragen.
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Dein Beitrag skaliert automatisch mit der Haushaltsgröße. Du kannst ihn
                      jederzeit anpassen.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <p className="text-xs text-slate-500">Haushalt gesamt</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatEuro(membershipAmountPerMonth)}
                    </p>
                    <p className="text-[11px] text-slate-500">{householdSize} Person(en)</p>
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <div>Mitgliedschaft: {formatEuro(membershipAmountPerMonth)} / Monat</div>
                      {edbEnabled ? (
                        <div>
                          eDebatte {resolveEdebateLabel(edbPlanKey)}
                          {edbDiscountPercent
                            ? ` (inkl. ${edbDiscountPercent} % Mitgliedsrabatt)`
                            : null}
                          : {formatEuro(edbFinalPerMonth)} / Monat
                        </div>
                      ) : (
                        <div>eDebatte: nicht gewählt</div>
                      )}
                      <div className="pt-1 font-semibold text-slate-800">
                        Gesamt: {formatEuro(totalPerMonth)} {rhythmLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-900 md:sticky md:top-6">
              <p className="font-semibold">Deine Zusammenfassung</p>
              <ContributionSummary
                totalPerMonth={totalPerMonth}
                membershipAmountPerMonth={membershipAmountPerMonth}
                edbEnabled={edbEnabled}
                edbFinalPerMonth={edbFinalPerMonth}
                edbPlanKey={edbPlanKey}
                edbDiscountPercent={edbDiscountPercent}
                householdSize={householdSize}
                rhythmLabel={rhythmLabel}
                contributionPerPerson={validatedContributionPerPerson}
              />
              <div className="rounded-xl border border-white/60 bg-white/70 p-3 text-xs text-sky-900">
                <p className="font-semibold">Rechner anpassen?</p>
                <p className="mt-1">
                  Wenn du Haushaltsgröße oder Rhythmus ändern möchtest, spring kurz zum
                  Beitrag-Rechner zurück.
                </p>
              </div>
              <Link
                href="/mitglied-werden"
                className="inline-flex items-center justify-center rounded-full border border-sky-400 bg-white px-4 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50"
              >
                Zum Beitrag-Rechner
              </Link>
            </aside>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canProceedFromStep1}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Weiter zu Haushalt
            </button>
            {!canProceedFromStep1 && (
              <span className="text-xs text-amber-700">
                Bitte wähle einen Beitrag von mindestens{" "}
                {formatEuro(MIN_CONTRIBUTION_PER_PERSON)}.
              </span>
            )}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Haushalt</h2>
              <p className="text-xs text-slate-600">
                Du kannst hier alle Personen erfassen, für die dieser Beitrag gelten soll. Für die
                Hauptperson benötigen wir Vor- und Nachnamen. Für weitere Personen sind die Daten
                optional – E-Mail nur angeben, wenn sie später selbst Zugang zur Plattform erhalten
                sollen (Double-Opt-In).
              </p>

              <div className="space-y-4">
                {members.map((m, idx) => {
                  const isPrimary = m.role === "primary";
                  return (
                    <div
                      key={m.id}
                      className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {isPrimary
                            ? "Hauptperson / Antragsteller:in"
                            : `Weitere Person ${idx + 1}`}
                        </p>
                        <div className="flex items-center gap-2">
                          <select
                            value={m.role}
                            onChange={(e) =>
                              updateMember(m.id, { role: e.target.value as MemberRole })
                            }
                            className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                          >
                            <option value="primary">Hauptperson</option>
                            <option value="adult">Erwachsene Person</option>
                            <option value="youth">Jugendliche Person</option>
                          </select>
                          {!isPrimary && members.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMember(m.id)}
                              className="text-[11px] font-semibold text-slate-400 hover:text-red-500"
                            >
                              Entfernen
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-700">
                            Vorname{isPrimary && " *"}
                          </label>
                          <input
                            type="text"
                            value={m.givenName}
                            onChange={(e) =>
                              updateMember(m.id, { givenName: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-700">
                            Nachname{isPrimary && " *"}
                          </label>
                          <input
                            type="text"
                            value={m.familyName}
                            onChange={(e) =>
                              updateMember(m.id, { familyName: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-700">
                            Geburtsdatum (optional)
                          </label>
                          <input
                            type="date"
                            value={m.birthDate}
                            onChange={(e) =>
                              updateMember(m.id, { birthDate: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-slate-700">
                            E-Mail für Einladung (optional)
                          </label>
                          <input
                            type="email"
                            value={m.email}
                            onChange={(e) => updateMember(m.id, { email: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            placeholder={
                              isPrimary
                                ? "Adresse der Antragsteller:in, falls abweichend"
                                : "Nur, wenn diese Person selbst eingeladen werden soll"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {members.length < householdSize && (
                <button
                  type="button"
                  onClick={addMember}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
                >
                  Weitere Person hinzufügen
                </button>
              )}

              <p className="text-[11px] text-slate-500">
                Haushaltsgröße laut Rechner: {householdSize}. Wenn du merkst, dass sich die Anzahl
                ändert, kannst du im Rechner noch einmal anpassen und dann den Antrag neu öffnen.
              </p>
            </div>

            <aside className="space-y-3 rounded-2xl border border-slate-100 bg-white/90 p-4 text-sm text-slate-700 md:sticky md:top-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Übersicht
              </p>
              <ContributionSummary
                totalPerMonth={totalPerMonth}
                membershipAmountPerMonth={membershipAmountPerMonth}
                edbEnabled={edbEnabled}
                edbFinalPerMonth={edbFinalPerMonth}
                edbPlanKey={edbPlanKey}
                edbDiscountPercent={edbDiscountPercent}
                householdSize={householdSize}
                rhythmLabel={rhythmLabel}
                contributionPerPerson={validatedContributionPerPerson}
              />
              <p className="text-[11px] text-slate-500">
                Tipp: E-Mail-Adressen nur angeben, wenn die Person selbst eingeladen werden soll.
              </p>
            </aside>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105"
            >
              Weiter zu Zahlung
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4">
              <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Zahlung &amp; rechtliche Hinweise
                </h2>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Zahlungsart
                  </p>
                  <p className="text-sm text-slate-700">
                    Der Beitrag wird per Überweisung/Dauerauftrag auf unser Konto gezahlt. Nutze
                    bitte den Verwendungszweck aus der Bestätigungsmail, damit wir die Zahlung
                    eindeutig zuordnen können. Lastschrift ist für später geplant.
                  </p>

                  <div className="mt-3 space-y-3 text-sm">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Name für die Zahlungszuordnung *
                      </label>
                      <input
                        type="text"
                        value={payment.billingName}
                        onChange={(e) => updatePayment({ billingName: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        IBAN für 0,01 €-Verifikation *
                      </label>
                      <input
                        type="text"
                        inputMode="text"
                        autoComplete="iban"
                        value={payment.iban}
                        onChange={(e) => updatePayment({ iban: e.target.value.toUpperCase() })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                        placeholder="DE00 0000 0000 0000 0000 00"
                      />
                      <p className="text-[11px] text-slate-500">
                        Wir überweisen dir in den nächsten Tagen 0,01 € mit einem TAN-Code im
                        Verwendungszweck. Den Code gibst du später im Zahlungsprofil ein.
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                          Straße &amp; Hausnummer (optional)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={geoQuery || payment.street}
                            onChange={(e) => handleGeoInput(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            placeholder="z. B. Musterstraße 12"
                          />
                          {geoLoading && (
                            <p className="mt-1 text-[11px] text-slate-500">Suche Adressen …</p>
                          )}
                          {!geoLoading && geoSuggestions.length > 0 && (
                            <ul className="absolute z-10 mt-1 w-full divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 shadow-lg">
                              {geoSuggestions.map((s) => (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() => applyGeoSuggestion(s)}
                                    className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
                                  >
                                    <span className="text-slate-900">{s.label}</span>
                                    <span className="text-[11px] text-slate-500">
                                      {[s.postalCode, s.city].filter(Boolean).join(" ")}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-slate-700">
                          PLZ &amp; Ort (optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={payment.postalCode}
                            onChange={(e) => updatePayment({ postalCode: e.target.value })}
                            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            placeholder="PLZ"
                          />
                          <input
                            type="text"
                            value={payment.city}
                            onChange={(e) => updatePayment({ city: e.target.value })}
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            placeholder="Ort"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-700">
                        Land (optional)
                      </label>
                      <input
                        type="text"
                        value={payment.country}
                        onChange={(e) => updatePayment({ country: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      Wichtig: Die Freischaltung erfolgt nach der 0,01 €-Verifikation. Bis dahin
                      bleibt der Status auf „prüfen“. Du erhältst eine E-Mail mit den nächsten
                      Schritten.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">Rechtliche Hinweise</p>

                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={legal.transparency}
                      onChange={(e) =>
                        setLegal((p) => ({ ...p, transparency: e.target.checked }))
                      }
                      className="mt-[2px] h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>
                      Ich habe den Transparenz-Hinweis gelesen und akzeptiere, dass VoiceOpenGov
                      als UG (haftungsbeschränkt) in Gründung keine Spendenquittungen ausstellt und
                      Mitgliedsbeiträge üblicherweise nicht steuerlich absetzbar sind.
                    </span>
                  </label>

                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={legal.statute}
                      onChange={(e) => setLegal((p) => ({ ...p, statute: e.target.checked }))}
                      className="mt-[2px] h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>
                      Ich erkenne die aktuelle{" "}
                      <Link
                        href="/satzung"
                        className="font-semibold text-sky-700 hover:underline hover:underline-offset-2"
                        target="_blank"
                      >
                        Satzung (Entwurf)
                      </Link>{" "}
                      für diesen Antrag an.
                    </span>
                  </label>

                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={legal.householdAuthority}
                      onChange={(e) =>
                        setLegal((p) => ({ ...p, householdAuthority: e.target.checked }))
                      }
                      className="mt-[2px] h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>
                      Ich bestätige, dass ich für alle hier angegebenen Haushaltsmitglieder im
                      Rahmen dieses Antrags handeln darf.
                    </span>
                  </label>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Sicherheitscheck
                </p>
                <HumanCheck
                  formId="membership-apply"
                  onSolved={(res) => {
                    setHumanToken(res.token);
                    setHumanNote("Sicherheitscheck bestanden.");
                    setError(null);
                  }}
                  onError={() => {
                    setHumanToken(null);
                    setHumanNote("Sicherheitscheck fehlgeschlagen. Bitte erneut.");
                  }}
                />
                {humanNote && (
                  <p className="text-[11px] text-emerald-700" aria-live="polite">
                    {humanNote}
                  </p>
                )}
              </section>

              <section className="space-y-3">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Danke, dein Antrag ist eingegangen.</p>
            <p className="mt-1">
              Du erhältst in Kürze eine Bestätigung per E-Mail.
              {success.invites > 0 && (
                        <>
                          {" "}
                          Wir haben außerdem {success.invites} Einladung
                          {success.invites === 1 ? "" : "en"} an die angegebenen
                          Haushaltsmitglieder verschickt (Double-Opt-In).
                </>
              )}
            </p>
            <p className="mt-2 text-[11px] text-emerald-900/80">
              Nach der 0,01 €-Verifikation kannst du den TAN-Code im{" "}
              <Link href="/account/payment" className="font-semibold underline underline-offset-2">
                Zahlungsprofil
              </Link>{" "}
              eingeben, um deine Mitgliedschaft zu aktivieren.
            </p>
          </div>
        )}

                <div className="flex flex-wrap items-center gap-3">
                  {!success && (
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
                    >
                      Zurück
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !!success}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {success
                      ? "Antrag gesendet"
                      : submitting
                        ? "Sende Antrag …"
                        : "Antrag absenden"}
                  </button>

                  {success && (
                    <>
                      <button
                        type="button"
                        onClick={() => router.push("/account")}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700"
                      >
                        Zur Konto-Übersicht
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push("/")}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:text-sky-700"
                      >
                        Zur Startseite
                      </button>
                    </>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-3 rounded-2xl border border-slate-100 bg-white/90 p-4 text-sm text-slate-700 md:sticky md:top-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Übersicht
              </p>
              <ContributionSummary
                totalPerMonth={totalPerMonth}
                membershipAmountPerMonth={membershipAmountPerMonth}
                edbEnabled={edbEnabled}
                edbFinalPerMonth={edbFinalPerMonth}
                edbPlanKey={edbPlanKey}
                edbDiscountPercent={edbDiscountPercent}
                householdSize={householdSize}
                rhythmLabel={rhythmLabel}
                contributionPerPerson={validatedContributionPerPerson}
              />
              <p className="text-[11px] text-slate-500">
                Nach dem Absenden erhältst du deine Zahlungsdaten per E-Mail.
              </p>
            </aside>
          </div>
        </section>
      )}
    </form>
  );
}

function ContributionSummary({
  totalPerMonth,
  membershipAmountPerMonth,
  edbEnabled,
  edbFinalPerMonth,
  edbPlanKey,
  edbDiscountPercent,
  householdSize,
  rhythmLabel,
  contributionPerPerson,
}: {
  totalPerMonth: number;
  membershipAmountPerMonth: number;
  edbEnabled: boolean;
  edbFinalPerMonth: number;
  edbPlanKey?: string;
  edbDiscountPercent?: number;
  householdSize: number;
  rhythmLabel: string;
  contributionPerPerson: number;
}) {
  const edbLabel = resolveEdebateLabel(edbPlanKey);
  const discountSuffix =
    typeof edbDiscountPercent === "number" && edbDiscountPercent > 0
      ? ` (inkl. ${edbDiscountPercent} % Rabatt)`
      : "";
  const edbLine = edbEnabled
    ? edbFinalPerMonth > 0
      ? `eDebatte ${edbLabel}${discountSuffix}: ${formatEuro(edbFinalPerMonth)} / Monat`
      : `eDebatte ${edbLabel}: kostenfrei`
    : "eDebatte: nicht gewählt";
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-100 bg-white/70 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">Gesamtbeitrag</p>
        <p className="text-xl font-semibold text-slate-900">
          {formatEuro(totalPerMonth)}{" "}
          <span className="text-xs font-medium text-slate-500">{rhythmLabel}</span>
        </p>
      </div>
      <div className="space-y-1 text-xs text-slate-600">
        <div>Beitrag pro Person: {formatEuro(contributionPerPerson)} / Monat</div>
        <div>
          Haushalt: {householdSize} Person(en) · {formatEuro(membershipAmountPerMonth)} / Monat
        </div>
        <div>{edbLine}</div>
      </div>
    </div>
  );
}

function resolveEdebateLabel(planKey?: string) {
  const normalized = (planKey ?? "").replace("edb-", "");
  if (normalized === "pro") return "Pro";
  if (normalized === "start") return "Start";
  return "Basis";
}

function parseEuroInput(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  if (!normalized) return null;
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

function formatEuro(value: number) {
  return euroFormatter.format(value);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
