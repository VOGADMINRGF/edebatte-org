// apps/web/src/app/mitglied-antrag/MembershipApplicationPageClient.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { safeRandomId } from "@core/utils/random";
import { useCurrentUser } from "@/hooks/auth";
import { loadMembershipDraft, clearMembershipDraft } from "@features/membership/draftStorage";

type Rhythm = "monthly" | "once";
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

export function MembershipApplicationPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [draft, setDraft] = React.useState<ReturnType<typeof loadMembershipDraft> | null>(null);

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
  const membershipAmountPerMonth = React.useMemo(() => {
    const raw = searchParams.get("membershipAmountPerMonth");
    if (!raw) return initialAmount;
    const num = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(num) ? Math.max(0, Math.round(num * 100) / 100) : initialAmount;
  }, [initialAmount, searchParams]);

  const totalPerMonth = React.useMemo(() => {
    const raw = searchParams.get("totalPerMonth");
    if (!raw) return initialAmount;
    const num = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(num) ? Math.max(0, Math.round(num * 100) / 100) : initialAmount;
  }, [initialAmount, searchParams]);

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

  const [amountPerPeriod] = React.useState<number>(initialAmount);
  const [rhythm] = React.useState<Rhythm>(initialRhythm);
  const [householdSize] = React.useState<number>(initialHouseholdSize);

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

    if (amountPerPeriod <= 0) {
      return "Dein Beitrag darf nicht 0 sein. Bitte gehe ggf. zurück zum Rechner und passe den Betrag an.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
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
          iban: undefined,
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
          "Dein Mitgliedsantrag konnte nicht gespeichert werden. Bitte versuche es später erneut.";
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
          Mitgliedsantrag – bitte zuerst einloggen oder registrieren
        </h1>
        <p className="text-sm text-slate-700">
          Um einen Mitgliedsantrag zu stellen, brauchst du ein persönliches Konto. So können wir
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

  const rhythmLabel = rhythm === "monthly" ? "pro Monat" : "einmalig";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
    >
      {/* Stepper */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
            Mitgliedsantrag ausfüllen
          </h1>
          <p className="mt-1 text-sm text-slate-700">
            Im ersten Schritt hast du deinen Beitrag berechnet. Hier kannst du deinen Haushalt
            ergänzen, Zahlungsart wählen und die rechtlichen Hinweise bestätigen.
          </p>
        </div>
        <ol className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <li className="flex items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-[11px] text-white">
              1
            </span>
            <span className="hidden sm:inline">Beitrag wählen</span>
          </li>
          <span className="text-slate-400">—</span>
          <li className="flex items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-[11px] text-white">
              2
            </span>
            <span className="hidden sm:inline">Haushalt &amp; Zahlung</span>
          </li>
          <span className="text-slate-400">—</span>
          <li className="flex items-center gap-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-[11px] text-white">
              3
            </span>
            <span className="hidden sm:inline">Rechtliches &amp; Bestätigung</span>
          </li>
        </ol>
      </div>

      {!membershipSelected && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Hinweis</p>
          <p className="mt-1">
            Im Rechner war die laufende Mitgliedschaft deaktiviert. Dieser Antrag bezieht sich auf
            eine Mitgliedschaft bei VoiceOpenGov. Wenn du nur einmalig unterstützen wolltest,
            kannst du stattdessen beim Beitrag-Rechner bleiben oder später noch Mitglied werden.
          </p>
        </div>
      )}

      {/* Section 1 – Zusammenfassung */}
      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Dein Beitrag</h2>
          <p className="text-2xl font-bold text-slate-900">
            {totalPerMonth.toFixed(2)} €{" "}
            <span className="text-sm font-medium text-slate-600">{rhythmLabel}</span>
          </p>
          <p className="text-xs text-slate-600">
            Haushaltsgröße: <span className="font-semibold">{householdSize} Person(en)</span>
          </p>
          <div className="mt-1 space-y-1 text-xs text-slate-700">
            <div>Mitgliedschaft: {membershipAmountPerMonth.toFixed(2)} € / Monat</div>
            {edbEnabled && edbFinalPerMonth > 0 ? (
              <div>
                eDebatte{" "}
                {edbPlanKey === "pro" ? "Pro" : edbPlanKey === "start" ? "Start" : "Basis"}
                {edbDiscountPercent ? ` (inkl. ${edbDiscountPercent} % VOG-Rabatt)` : null}:{" "}
                {edbFinalPerMonth.toFixed(2)} € / Monat
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            VoiceOpenGov befindet sich in der Gründungsphase einer UG (haftungsbeschränkt). Wir
            finanzieren uns bewusst über Beiträge und faire Nutzungsentgelte – nicht über
            Großspender:innen oder versteckte Werbung.
          </p>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-900">
          <div>
            <p className="font-semibold">Rechner anpassen?</p>
            <p className="mt-1 text-xs">
              Wenn du Betrag oder Haushaltsgröße noch einmal ändern möchtest, kannst du zum
              Beitrag-Rechner zurückspringen.
            </p>
          </div>
          <Link
            href="/mitglied-werden"
            className="inline-flex items-center justify-center rounded-full border border-sky-400 bg-white px-4 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50"
          >
            Zurück zum Beitrag-Rechner
          </Link>
        </div>
      </section>

      {/* Section 2 – Haushaltsmitglieder */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
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
                      onChange={(e) => updateMember(m.id, { givenName: e.target.value })}
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
                      onChange={(e) => updateMember(m.id, { familyName: e.target.value })}
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
                      onChange={(e) => updateMember(m.id, { birthDate: e.target.value })}
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
          Haushaltsgröße laut Rechner: {householdSize}. Wenn du merkst, dass sich die Anzahl ändert,
          kannst du im Rechner noch einmal anpassen und dann den Antrag neu öffnen.
        </p>
      </section>

      {/* Section 3 – Zahlung & Rechtliches */}
      <section className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Zahlung &amp; rechtliche Hinweise
        </h2>

        {/* Zahlung */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Zahlungsart
          </p>
          <p className="text-sm text-slate-700">
            Der Beitrag wird per Überweisung/Dauerauftrag auf unser Konto gezahlt. Nutze bitte den
            Verwendungszweck aus der Bestätigungsmail, damit wir die Zahlung eindeutig zuordnen
            können. Lastschrift ist für später geplant.
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
              <label className="block text-xs font-medium text-slate-700">Land (optional)</label>
              <input
                type="text"
                value={payment.country}
                onChange={(e) => updatePayment({ country: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <p className="text-xs text-slate-600">
              Lastschrift mit Konto-Verifizierung (0,01 €) ist für die Zeit nach Gründung geplant.
              Bis dahin bitten wir um Überweisung oder Dauerauftrag.
            </p>
          </div>
        </div>

        {/* Rechtliches */}
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Rechtliche Hinweise</p>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={legal.transparency}
              onChange={(e) => setLegal((p) => ({ ...p, transparency: e.target.checked }))}
              className="mt-[2px] h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <span>
              Ich habe den Transparenz-Hinweis gelesen und akzeptiere, dass VoiceOpenGov als UG
              (haftungsbeschränkt) in Gründung keine Spendenquittungen ausstellt und
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
              Ich bestätige, dass ich für alle hier angegebenen Haushaltsmitglieder im Rahmen dieses
              Antrags handeln darf.
            </span>
          </label>
        </div>
      </section>

      {/* Section 4 – Fehler/Success & Submit */}
      <section className="space-y-3">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Danke, dein Mitgliedsantrag ist eingegangen.</p>
            <p className="mt-1">
              Du erhältst in Kürze eine Bestätigung per E-Mail.
              {success.invites > 0 && (
                <>
                  {" "}
                  Wir haben außerdem {success.invites} Einladung
                  {success.invites === 1 ? "" : "en"} an die angegebenen Haushaltsmitglieder
                  verschickt (Double-Opt-In).
                </>
              )}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !!success}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {success
              ? "Antrag gesendet"
              : submitting
              ? "Sende Antrag …"
              : "Mitgliedsantrag absenden"}
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
    </form>
  );
}
