// apps/web/src/app/reports/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@features/auth/hooks/useAuth";
import { useActionPermission } from "@features/user/hooks/useActionPermission";
import type { AccessTier } from "@/features/pricing";

/** UI-Typ für Themen in einer Region (nur für diese Seite relevant) */
type RegionTopic = {
  id: string;
  label: string;
  description: string;
  statements: number;
  evidenceSlots: number;
  openQuestions: number;
  countries: string[];
  lastUpdated: string;
  regionCode: string;
  rank: number; // 1 = meist diskutiert
};

/** Mock-Daten – später durch echte Aggregationen ersetzen */
const MOCK_TOPICS: RegionTopic[] = [
  {
    id: "tier_agri",
    label: "Tierschutz ↔ Agrarwirtschaft",
    description:
      "Wie vereinbaren wir Tierwohl, Ernährungssicherheit und wirtschaftliche Tragfähigkeit der Landwirtschaft?",
    statements: 42,
    evidenceSlots: 118,
    openQuestions: 17,
    countries: ["DE", "NL", "DK", "ES"],
    lastUpdated: "2025-11-12",
    regionCode: "DE-BB",
    rank: 1,
  },
  {
    id: "prices_inflation",
    label: "Preise & Lebenshaltungskosten",
    description:
      "Preiserhöhungen, Energie, Mieten – welche Maßnahmen werden diskutiert und welche Evidenz gibt es?",
    statements: 73,
    evidenceSlots: 204,
    openQuestions: 31,
    countries: ["DE", "FR", "IT", "PL"],
    lastUpdated: "2025-11-10",
    regionCode: "DE-BB",
    rank: 2,
  },
  {
    id: "health_care",
    label: "Gesundheit & Pflege",
    description:
      "Wie sichern wir eine gute Versorgung in Stadt und Land – personell, finanziell und strukturell?",
    statements: 51,
    evidenceSlots: 139,
    openQuestions: 22,
    countries: ["DE", "AT", "CH"],
    lastUpdated: "2025-11-09",
    regionCode: "DE-BB",
    rank: 3,
  },
  {
    id: "climate_energy",
    label: "Klima & Energie",
    description:
      "Energiewende, Netzausbau, lokale Projekte – welche Konflikte und Chancen werden diskutiert?",
    statements: 88,
    evidenceSlots: 260,
    openQuestions: 45,
    countries: ["DE", "DK", "NL"],
    lastUpdated: "2025-11-08",
    regionCode: "DE-BB",
    rank: 4,
  },
];

type ReportAccess = {
  hasFullAccess: boolean;
  tier: AccessTier;
  label: string;
  defaultRegion: string;
};

/**
 * Leitet aus deinem bestehenden Auth-/Permissions-System
 * ein einfaches Gating für die Reports ab.
 *
 * Wichtig: wir casten auf `any`, damit TS nicht mit UserType/IUserProfile kollidiert.
 */
function useReportAccess(): ReportAccess {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;
  const permission = useActionPermission(user as any);

  return useMemo(() => {
    if (!user) {
      return {
        hasFullAccess: false,
        tier: "public",
        label: "Öffentliche Ansicht",
        defaultRegion: "DE-BB",
      };
    }

    const profile = user as any;
    const active =
      profile.roles?.[profile.activeRole] ?? { role: profile.role, region: profile.region };
    const activeRole: string = active?.role ?? "user";

    const isStaff = ["admin", "superadmin", "moderator"].includes(activeRole);
    const isInstitution = ["ngo", "politics", "party", "b2b"].includes(activeRole);

    const canPremiumFeature =
      permission && typeof permission.can === "function"
        ? !!permission.can("premiumFeature")
        : false;

    const hasFullAccess = isStaff || canPremiumFeature;

    const defaultRegion: string =
      active.region || profile.region || "DE-BB";

    let tier: AccessTier;
    let label: string;

    if (isStaff) {
      tier = "staff";
      label = "Team / Moderation";
    } else if (isInstitution && canPremiumFeature) {
      tier = "institutionPremium";
      label = "Institution (Premium)";
    } else if (isInstitution) {
      tier = "institutionBasic";
      label = "Institution (Basis)";
    } else if (canPremiumFeature) {
      tier = "citizenPremium";
      label = "Bürger:innen (Premium)";
    } else {
      tier = "citizenBasic";
      label = "Bürger:innen (Basis)";
    }

    return {
      hasFullAccess,
      tier,
      label,
      defaultRegion,
    };
  }, [user, permission]);
}

export default function ReportsOverviewPage() {
  const { hasFullAccess, tier, label, defaultRegion } = useReportAccess();

  const [region, setRegion] = useState(defaultRegion);
  const [topics, setTopics] = useState<RegionTopic[]>([]);

  // Region bei Rollenwechsel nachziehen
  useEffect(() => {
    setRegion(defaultRegion);
  }, [defaultRegion]);

  useEffect(() => {
    // aktuell nur Filter auf Mock-Daten,
    // später hier API-Aufruf / echte Aggregationen
    const filtered = MOCK_TOPICS.filter((t) => t.regionCode === region).sort(
      (a, b) => a.rank - b.rank
    );
    setTopics(filtered);
  }, [region]);

  const publicTop3 = useMemo(
    () => topics.filter((t) => t.rank <= 3),
    [topics]
  );
  const lockedRest = useMemo(
    () => topics.filter((t) => t.rank > 3),
    [topics]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50 to-emerald-100">
      <div className="container-vog py-6 space-y-6">
        {/* Kopfbereich */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="vog-head mb-1">
              Themen-Reports & Tendenzen nach Region
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Diese Übersicht zeigt, welche Themen in einer Region gerade am
              stärksten diskutiert werden – auf Basis von Bürger-Beiträgen
              (Level&nbsp;1), E150-Analysen (Level&nbsp;2) und weiteren Quellen.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Top&nbsp;3 Themen pro Region sind für alle Bürger:innen sichtbar.
              Detailliertere Rankings &amp; Reports sind für Premium-Mitglieder
              und legitimierte Institutionen vorgesehen.
            </p>
          </div>

          {/* Region + Tier-Anzeige */}
          <div className="flex flex-col items-end gap-2 text-[11px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 border border-slate-200 px-3 py-1.5 shadow-sm">
              <span
                className={
                  "h-2 w-2 rounded-full " +
                  (tier === "public"
                    ? "bg-slate-300"
                    : tier === "citizenBasic" || tier === "institutionBasic"
                    ? "bg-amber-400"
                    : tier === "staff"
                    ? "bg-violet-500"
                    : "bg-emerald-500")
                }
              />
              <span className="font-semibold text-slate-700">{label}</span>
            </div>
            <label className="text-slate-500">
              Region wählen
              <select
                className="ml-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-700"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="DE-BB">Brandenburg</option>
                {/* TODO: dynamische Regionen aus DB */}
              </select>
            </label>
            <Link
              href={`/swipe?region=${region}`}
              className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm"
            >
              Alle Themen dieser Region swipen
            </Link>
          </div>
        </header>

        {/* Top 3 – immer öffentlich */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Top 3 Themen (öffentlich)
            </h2>
            <span className="text-[11px] text-slate-400">
              Ranking nach Anzahl der geprüften Statements &amp; Evidenz-Slots
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {publicTop3.map((t) => (
              <article
                key={t.id}
                className="rounded-3xl bg-white/95 border border-slate-100 shadow-sm p-4 flex flex-col gap-3"
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">
                      #{t.rank}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">
                      {t.label}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {t.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Stand: {t.lastUpdated}
                  </span>
                </header>

                <dl className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div className="rounded-2xl bg-sky-50 px-3 py-2">
                    <dt className="text-[10px] uppercase text-sky-700 mb-0.5">
                      Statements
                    </dt>
                    <dd className="text-base font-semibold">
                      {t.statements}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                    <dt className="text-[10px] uppercase text-emerald-700 mb-0.5">
                      Evidenz-Slots
                    </dt>
                    <dd className="text-base font-semibold">
                      {t.evidenceSlots}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-3 py-2">
                    <dt className="text-[10px] uppercase text-amber-700 mb-0.5">
                      Offene Fragen
                    </dt>
                    <dd className="text-base font-semibold">
                      {t.openQuestions}
                    </dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div>Fokus-Länder: {t.countries.join(", ")}</div>
                  <button
                    type="button"
                    className="underline text-sky-700 font-semibold"
                  >
                    Kurz-Report (Preview)
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Top 4–10 – Zugang abhängig von Mitgliedschaft/Rolle */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Weitere Themen dieser Region
            </h2>
            {!hasFullAccess && (
              <span className="text-[11px] text-slate-400">
                Detaillierte Rankings (Platz 4–10) sind für Premium-Mitglieder
                und legitimierte Institutionen freigeschaltet.
              </span>
            )}
          </div>

          {hasFullAccess ? (
            <div className="grid gap-4 md:grid-cols-2">
              {lockedRest.map((t) => (
                <article
                  key={t.id}
                  className="rounded-3xl bg-white/95 border border-slate-100 shadow-sm p-4 flex flex-col gap-3"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-400">
                        #{t.rank}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">
                        {t.label}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {t.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Stand: {t.lastUpdated}
                    </span>
                  </header>

                  <dl className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div className="rounded-2xl bg-sky-50 px-3 py-2">
                      <dt className="text-[10px] uppercase text-sky-700 mb-0.5">
                        Statements
                      </dt>
                      <dd className="text-base font-semibold">
                        {t.statements}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                      <dt className="text-[10px] uppercase text-emerald-700 mb-0.5">
                        Evidenz-Slots
                      </dt>
                      <dd className="text-base font-semibold">
                        {t.evidenceSlots}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-3 py-2">
                      <dt className="text-[10px] uppercase text-amber-700 mb-0.5">
                        Offene Fragen
                      </dt>
                      <dd className="text-base font-semibold">
                        {t.openQuestions}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-5 text-center text-[12px] text-slate-500 space-y-3">
              <p>
                In dieser Region gibt es weitere Themen (Platz 4–10), die
                aktuell intensiv diskutiert werden.
              </p>
              <p>
                Der detaillierte Zugriff ist für Premium-Mitglieder,
                legitimierte Institutionen und Redaktionen vorgesehen.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/upgrade"
                  className="px-4 py-1.5 rounded-full bg-sky-600 text-white text-[11px] font-semibold shadow-sm"
                >
                  Premium-Mitglied werden
                </Link>
                <Link
                  href="/kontakt"
                  className="px-4 py-1.5 rounded-full border border-sky-200 bg-white text-[11px] text-sky-700 font-semibold"
                >
                  Institutions-Zugang anfragen
                </Link>
                <Link
                  href={`/swipe?region=${region}`}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] text-slate-700 font-semibold"
                >
                  Oder: Alle Themen swipe-basiert entdecken
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
