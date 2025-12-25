// apps/web/src/app/mitglied-antrag/MitgliedAntragClient.tsx
"use client";

import * as React from "react";
import type { AccountOverview } from "@features/account/types";
import { BANK_DETAILS } from "@/config/banking";

function sanitizeBirthDateInput(value: string) {
  return value.replace(/[^\d.-]/g, "").slice(0, 10);
}

function toIsoBirthdate(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function isoToDe(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, yyyy, mm, dd] = m;
  return `${dd}.${mm}.${yyyy}`;
}

type MembershipPackage = "basis" | "pro" | "premium";

type PlanDefinition = {
  id: MembershipPackage;
  title: string;
  description: string;
  price: number;
  perks: string[];
};

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "basis",
    title: "Basis",
    description: "Kostenfreier Einstieg – Swipen & Citizen Journey bleiben offen.",
    price: 0,
    perks: ["Citizen Basic Zugang", "Contribution Credits durch XP", "Community-News per Mail"],
  },
  {
    id: "pro",
    title: "Pro",
    description: "Aktive Begleiter:innen – mehr Insights, Credits & Rabatte.",
    price: 14.99,
    perks: ["Mehr Contribution Credits", "Früher Zugriff auf Streams", "25 % Rabatt auf eDebatte"],
  },
  {
    id: "premium",
    title: "Premium",
    description: "Finanziert Moderation & Audit-Trails dauerhaft.",
    price: 34.99,
    perks: ["Unlimitierte Credits", "Priorisierter Support", "Community-Roadmap-Mitwirkung"],
  },
];

const PLAN_PRICE: Record<MembershipPackage, number> = {
  basis: 0,
  pro: 14.99,
  premium: 34.99,
};

const discountLabel = "Ich bin VOG-Mitglied (25 % Rabatt auf Pro/Premium)";

type MembershipResult = {
  reference: string;
  monthlyAmount: number;
  discountApplied: boolean;
  bank: typeof BANK_DETAILS;
};

type InitialIntent = {
  amount?: number | null;
  rhythm?: string | null;
  memberCount?: number | null;
  edbPlan?: string | null;
};

type Props = {
  overview: AccountOverview;
  initialIntent?: InitialIntent;
};

export function MitgliedAntragClient({ overview, initialIntent }: Props) {
  const defaultName = splitName(overview.displayName || overview.email);
  const [plan, setPlan] = React.useState<MembershipPackage>("pro");
  const [vogMember, setVogMember] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<MembershipResult | null>(null);
  const datePickerRef = React.useRef<HTMLInputElement | null>(null);

  const [form, setForm] = React.useState({
    firstName: defaultName.firstName,
    lastName: defaultName.lastName,
    email: overview.email,
    phone: "",
    street: "",
    postalCode: "",
    city: "",
    country: "Deutschland",
    birthDate: "",
    notes: "",
  });

  const effectiveAmount = React.useMemo(() => {
    const base = PLAN_PRICE[plan];
    if (base === 0) return 0;
    return roundCurrency(vogMember ? base * 0.75 : base);
  }, [plan, vogMember]);

  const openDatePicker = () => {
    const el = datePickerRef.current;
    if (!el) return;
    // @ts-expect-error showPicker is not in TS lib yet
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextValue =
      field === "birthDate" && typeof event.target.value === "string"
        ? sanitizeBirthDateInput(event.target.value)
        : event.target.value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const birthDateIso = toIsoBirthdate(form.birthDate);
    if (form.birthDate && !birthDateIso) {
      setError("Bitte nutze TT.MM.JJJJ oder JJJJ-MM-TT.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const payload = {
        plan,
        vogMember,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        street: form.street.trim(),
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        birthDate: birthDateIso || undefined,
        notes: form.notes.trim() || undefined,
      };

      const res = await fetch("/api/membership/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setResult({
        reference: data.reference,
        monthlyAmount: data.monthlyAmount,
        discountApplied: data.discountApplied,
        bank: data.bank ?? BANK_DETAILS,
      });
    } catch (err: any) {
      setError(err?.message || "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Citizen Core Journey</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Beauftragung & Zahlung – VoiceOpenGov</h1>
          <p className="text-sm md:text-base text-slate-700 leading-relaxed">
            Wähle dein Paket, bestätige deine Pflichtangaben und erhalte direkt die Bankdaten für deine erste Gutschrift.
            Wir stellen keine Spendenquittungen aus, weil wir als Bewegung unabhängig von Großspender:innen bleiben wollen.
          </p>
        </header>

        {initialIntent && (initialIntent.amount || initialIntent.edbPlan) ? (
          <IntentSummary intent={initialIntent} />
        ) : null}

        <PlanSelector plan={plan} setPlan={setPlan} />

        {result ? (
          <SuccessCard result={result} plan={plan} vogMember={vogMember} amount={effectiveAmount} />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.04)] p-6 md:p-8 space-y-8"
          >
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Paket &amp; Beitrag</h2>
              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-700">
                <p>
                  <strong>{planLabel(plan)}</strong> – {formatEuro(PLAN_PRICE[plan])} pro Monat
                </p>
                <div className="flex flex-col gap-2 text-xs md:flex-row md:items-center md:justify-between">
                  <label className="inline-flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={vogMember}
                      onChange={(event) => setVogMember(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    {discountLabel}
                  </label>
                  <span className="text-slate-900 font-semibold">
                    Monatlicher Beitrag: {formatEuro(effectiveAmount)}{" "}
                    {vogMember && plan !== "basis" ? <span className="text-emerald-600">(–25 %)</span> : null}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Beiträge sind Gutschriften für Infrastruktur & Moderation – keine Spenden, keine Spendenquittung.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Persönliche Angaben</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <LabeledInput label="Vorname" value={form.firstName} onChange={handleChange("firstName")} required />
                <LabeledInput label="Nachname" value={form.lastName} onChange={handleChange("lastName")} required />
                <LabeledInput label="E-Mail" type="email" value={form.email} onChange={handleChange("email")} required />
                <LabeledInput label="Telefon (optional)" value={form.phone} onChange={handleChange("phone")} />
              </div>
              <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                <div className="relative">
                  <input
                    ref={datePickerRef}
                    type="date"
                    className="sr-only"
                    onChange={(event) => {
                      const iso = event.currentTarget.value;
                      if (iso) {
                        setForm((prev) => ({ ...prev, birthDate: sanitizeBirthDateInput(isoToDe(iso)) }));
                      }
                    }}
                  />
                  <LabeledInput
                    label="Geburtsdatum"
                    type="text"
                    value={form.birthDate}
                    onChange={handleChange("birthDate")}
                    required
                    placeholder="TT.MM.JJJJ oder JJJJ-MM-TT"
                    inputMode="text"
                    autoComplete="bday"
                    maxLength={10}
                    pattern="^(\\d{2}\\.\\d{2}\\.\\d{4}|\\d{4}-\\d{2}-\\d{2})$"
                    title="TT.MM.JJJJ oder JJJJ-MM-TT"
                    helperText="Angefordertes Format: TT.MM.JJJJ oder JJJJ-MM-TT"
                  />
                  <button
                    type="button"
                    onClick={openDatePicker}
                    className="absolute right-2 top-[34px] rounded-md border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm"
                    aria-label="Datum auswählen"
                    title="Datum auswählen"
                  >
                    📅
                  </button>
                </div>
                <LabeledInput label="Land" value={form.country} onChange={handleChange("country")} required />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Adresse</h2>
              <LabeledInput label="Straße &amp; Hausnummer" value={form.street} onChange={handleChange("street")} required />
              <div className="grid gap-4 md:grid-cols-[0.6fr_1.4fr]">
                <LabeledInput label="PLZ" value={form.postalCode} onChange={handleChange("postalCode")} required />
                <LabeledInput label="Ort" value={form.city} onChange={handleChange("city")} required />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Weitere Hinweise (optional)</h2>
              <textarea
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                placeholder="z. B. Können wir dich für Moderation, Design oder Community-Aufgaben ansprechen?"
                value={form.notes}
                onChange={handleChange("notes")}
              />
            </section>

            <div className="space-y-2 text-xs text-slate-600">
              <label className="flex items-start gap-2">
                <input required type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                <span>Ich bestätige die Satzung von VoiceOpenGov und beantrage die Mitgliedschaft im genannten Paket.</span>
              </label>
              <label className="flex items-start gap-2">
                <input required type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                <span>Ich bin mit der Verarbeitung meiner Daten zur Bearbeitung der Beauftragung einverstanden.</span>
              </label>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-slate-500">
                Nach dem Absenden zeigen wir dir sofort IBAN, BIC und Verwendungszweck an und schicken sie zusätzlich per Mail.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60"
              >
                {busy ? "Wird gesendet …" : "Beauftragung absenden"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function IntentSummary({ intent }: { intent: InitialIntent }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-1 text-xs md:text-sm text-slate-700">
      <p className="font-semibold text-slate-900">Dein Vorschlag aus dem Rechner</p>
      {intent.amount ? (
        <p>
          <span className="font-medium">Beitrag gesamt:</span> {formatEuro(intent.amount)}
          {intent.rhythm ? ` · ${intent.rhythm}` : ""}
        </p>
      ) : null}
      {intent.memberCount ? (
        <p>
          <span className="font-medium">Anzahl Personen (≥ 16 Jahre):</span> {intent.memberCount}
        </p>
      ) : null}
      {intent.edbPlan ? (
        <p className="text-xs text-slate-600">
          Gewähltes eDebatte-Paket: <strong>{intent.edbPlan}</strong>. VoiceOpenGov-Mitglieder erhalten darauf automatisch 25 % Rabatt.
        </p>
      ) : null}
      <p className="text-[11px] text-slate-500">
        Du kannst den Beitrag unten noch anpassen. Der Rechner liefert nur eine faire Orientierung.
      </p>
    </section>
  );
}

function PlanSelector({ plan, setPlan }: { plan: MembershipPackage; setPlan: (value: MembershipPackage) => void }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {PLAN_DEFINITIONS.map((definition) => {
        const active = plan === definition.id;
        return (
          <button
            key={definition.id}
            type="button"
            onClick={() => setPlan(definition.id)}
            className={`rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md ${
              active ? "border-sky-500 bg-white" : "border-slate-100 bg-white/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{definition.title}</h3>
              <span className="text-sm font-semibold text-slate-700">{formatEuro(definition.price)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{definition.description}</p>
            <ul className="mt-3 space-y-1 text-xs text-slate-500">
              {definition.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <span className="mt-[2px] text-emerald-500">•</span>
                  {perk}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </section>
  );
}

function SuccessCard({
  result,
  plan,
  vogMember,
  amount,
}: {
  result: MembershipResult;
  plan: MembershipPackage;
  vogMember: boolean;
  amount: number;
}) {
  const discountNote = vogMember && plan !== "basis";
  const humanAmount = formatEuro(amount);
  return (
    <section className="rounded-3xl border border-emerald-200 bg-white/95 shadow-[0_20px_60px_rgba(16,185,129,0.15)] p-6 md:p-8 space-y-4">
      <p className="text-sm font-semibold text-emerald-700">Danke! Dein Antrag ist eingegangen.</p>
      <p className="text-sm text-slate-700">
        Bitte richte jetzt eine Überweisung oder einen Dauerauftrag ein. Sobald der erste Beitrag eingegangen ist, bestätigen wir deine Mitgliedschaft und
        schalten Rabatte & Zugang frei.
      </p>
      <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-slate-800">
        <p>
          <strong>Monatlicher Beitrag:</strong> {humanAmount} {discountNote ? "(inkl. -25 % Mitgliederrabatt)" : ""}
        </p>
        <p>
          <strong>Verwendungszweck:</strong> {result.reference}
        </p>
        <p>
          <strong>Empfänger:</strong> {result.bank.recipient}
        </p>
        <p>
          <strong>Bank:</strong> {result.bank.bankName}
        </p>
        <p>
          <strong>IBAN:</strong> {result.bank.iban}
        </p>
        <p>
          <strong>BIC:</strong> {result.bank.bic}
        </p>
      </div>
      <p className="text-xs text-slate-500">
        VoiceOpenGov verarbeitet Mitgliedsbeiträge als Gutschrift – keine Spende, keine Spendenquittung. Bei Fragen schreib uns an{" "}
        <a href="mailto:hello@voiceopengov.org" className="font-semibold text-sky-600 underline">
          hello@voiceopengov.org
        </a>
        .
      </p>
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  inputMode,
  maxLength,
  pattern,
  title,
  helperText,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  pattern?: string;
  title?: string;
  helperText?: string;
  autoComplete?: React.HTMLAttributes<HTMLInputElement>["autoComplete"];
}) {
  return (
    <label className="space-y-1 text-sm text-slate-700">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type={type}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        title={title}
        autoComplete={autoComplete}
      />
      {helperText ? <p className="text-[11px] text-slate-500">{helperText}</p> : null}
    </label>
  );
}

function formatEuro(value: number) {
  const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
  return formatter.format(value);
}

function planLabel(plan: MembershipPackage) {
  return PLAN_DEFINITIONS.find((definition) => definition.id === plan)?.title ?? plan;
}

function splitName(input?: string | null) {
  const normalized = (input ?? "").trim();
  if (!normalized) return { firstName: "", lastName: "" };
  const [first, ...rest] = normalized.split(/\s+/);
  return {
    firstName: first ?? "",
    lastName: rest.join(" ") || "",
  };
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
