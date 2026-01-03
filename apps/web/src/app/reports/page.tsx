"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@features/auth/hooks/useAuth";
import { useActionPermission } from "@features/user/hooks/useActionPermission";
import type { AccessTier } from "@/features/pricing";
import type { RegionReportOverview, TopicReport } from "@features/report/data/types";
import { useLocale } from "@/context/LocaleContext";
import { resolveTimeRange, type TimeRangeKey } from "@/utils/timeRange";

const REGION_OPTIONS = [
  { value: "DE-BB", label: "Brandenburg" },
  { value: "DE-BE", label: "Berlin" },
  { value: "DE", label: "Deutschland" },
  { value: "EU", label: "Europa" },
  { value: "all", label: "Global" },
];

const formatter = new Intl.NumberFormat("de-DE");
const formatNumber = (value: number) => formatter.format(value);

function topicDescription(topic: TopicReport): string {
  return topic.description?.trim() || "Sammelthema aus aktuellen Evidence-Claims";
}

function useReportAccess() {
  const auth = useAuth() as any;
  const user = auth?.user ?? null;
  const permission = useActionPermission(user as any);

  return useMemo(() => {
    if (!user) {
      return {
        hasFullAccess: false,
        tier: "public" as AccessTier,
        label: "Öffentliche Ansicht",
        defaultRegion: "DE-BB",
      };
    }

    const profile = user as any;
    const active = profile.roles?.[profile.activeRole] ?? { role: profile.role, region: profile.region };
    const activeRole: string = active?.role ?? "user";
    const isStaff = ["admin", "superadmin", "moderator"].includes(activeRole);
    const isInstitution = ["ngo", "politics", "party", "b2b"].includes(activeRole);
    const canPremiumFeature = permission && typeof permission.can === "function" ? !!permission.can("premiumFeature") : false;
    const hasFullAccess = isStaff || canPremiumFeature;
    const defaultRegion: string = active.region || profile.region || "DE-BB";

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
  const { locale } = useLocale();

  const [region, setRegion] = useState(defaultRegion);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("90d");
  const [overview, setOverview] = useState<RegionReportOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRegion(defaultRegion);
  }, [defaultRegion]);

  useEffect(() => {
    let abort = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ region, locale, timeRange });
        const res = await fetch(`/api/reports/overview?${params.toString()}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.error || res.statusText);
        }
        if (!abort) {
          setOverview(body.overview ?? null);
        }
      } catch (err: any) {
        if (!abort) {
          setOverview(null);
          setError(err?.message || "Konnte Daten nicht laden");
        }
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => {
      abort = true;
    };
  }, [region, locale, timeRange]);

  const rangeInfo = resolveTimeRange(timeRange);
  const publicTopics = useMemo(() => overview?.topTopics.slice(0, 3) ?? [], [overview]);
  const lockedTopics = useMemo(() => overview?.topTopics.slice(3) ?? [], [overview]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50 to-emerald-100">
      <div className="container-vog py-6 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="vog-head mb-1">Themen-Reports &amp; Tendenzen nach Region</h1>
            <p className="text-sm text-slate-600 max-w-2xl">
              Diese Übersicht stützt sich auf den Evidence-Graph: Claims, Drafts und Entscheidungen, die aus Feeds
              und Beiträgen automatisiert analysiert wurden.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Top&nbsp;3 Themen pro Region sind öffentlich. Detailliertere Rankings stehen Premium-Mitgliedern und
              legitimierten Institutionen zur Verfügung.
            </p>
            <p className="text-[11px] text-slate-500">Zeitraum: {rangeInfo.label}</p>
          </div>

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
            <label className="text-slate-500 flex items-center gap-2">
              Region wählen
              <select
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-700"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {REGION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-slate-500 flex items-center gap-2">
              Zeitraum
              <select
                className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs text-slate-700"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
              >
                <option value="30d">Letzte 30 Tage</option>
                <option value="90d">Letzte 90 Tage</option>
                <option value="365d">Letzte 12 Monate</option>
                <option value="all">Gesamter Zeitraum</option>
              </select>
            </label>
            <Link
              href={`/swipes?region=${region}`}
              className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm"
            >
              Alle Themen dieser Region swipen
            </Link>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <SummaryCard label="Belegte Aussagen" value={overview?.totalStatements ?? 0} hint={rangeInfo.label} />
          <SummaryCard label="Entscheidungen" value={overview?.totalReports ?? 0} hint="Abstimmungen & Entwürfe" />
          <SummaryCard
            label="News-Quellen"
            value={overview?.newsSourceCount ?? 0}
            hint={overview?.lastUpdated ? `Update: ${new Date(overview.lastUpdated).toLocaleDateString("de-DE")}` : undefined}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Daten werden geladen …</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : overview ? (
            <div className="flex flex-wrap gap-6 text-sm text-slate-600">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Region</p>
                <p className="text-lg font-semibold text-slate-900">{overview.regionName}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Evidence-Claims</p>
                <p className="text-lg font-semibold text-slate-900">{formatNumber(overview.totalStatements)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Entscheidungen / Drafts</p>
                <p className="text-lg font-semibold text-slate-900">{formatNumber(overview.totalReports)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Keine Evidence-Daten für diese Region vorhanden.</p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Top 3 Themen (öffentlich)</h2>
            <span className="text-[11px] text-slate-400">Ranking nach Anzahl der Evidence-Claims</span>
          </div>
          {publicTopics.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-5 text-center text-sm text-slate-500">
              Noch keine Themen identifiziert.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {publicTopics.map((topic, idx) => (
                <TopicCard key={topic.id} topic={topic} rank={idx + 1} highlight />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Weitere Themen dieser Region</h2>
            {!hasFullAccess && (
              <span className="text-[11px] text-slate-400">
                Plätze 4–10 sind für Premium-Mitglieder &amp; Institutionen verfügbar.
              </span>
            )}
          </div>
          {hasFullAccess ? (
            lockedTopics.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {lockedTopics.map((topic, idx) => (
                  <TopicCard key={topic.id} topic={topic} rank={idx + 4} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 text-center text-sm text-slate-500">
                Keine weiteren Themen vorhanden.
              </div>
            )
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-5 text-center text-[12px] text-slate-500 space-y-3">
              <p>
                Für diese Region sind zusätzliche Themen verfügbar, die nach Freigabe detailliert eingesehen werden können.
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
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TopicCard({ topic, rank, highlight }: { topic: TopicReport; rank: number; highlight?: boolean }) {
  const decision = topic.decisionSummary ?? null;

  return (
    <article
      className={`rounded-3xl border shadow-sm p-4 flex flex-col gap-3 ${
        highlight ? "bg-white/95 border-slate-100" : "bg-white/90 border-slate-200"
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-slate-400">#{rank}</div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">{topic.label}</h3>
          <p className="text-xs text-slate-600">{topicDescription(topic)}</p>
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
        <div className="rounded-2xl bg-sky-50 px-3 py-2">
          <dt className="text-[10px] uppercase text-sky-700 mb-0.5">Belegte Aussagen</dt>
          <dd className="text-base font-semibold">{formatNumber(topic.totalStatements)}</dd>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-3 py-2">
          <dt className="text-[10px] uppercase text-emerald-700 mb-0.5">Abstimmungen &amp; Entwürfe</dt>
          <dd className="text-base font-semibold">{formatNumber(topic.totalVotes)}</dd>
        </div>
      </dl>
      <div className="text-[11px] text-slate-500 space-y-1">
        {decision ? (
          <span className="font-semibold text-emerald-700">
            Mehrheit: {Math.round((decision.yesShare ?? 0) * 100)}% Zustimmung
            {decision.decidedAt ? ` · Stand ${new Date(decision.decidedAt).toLocaleDateString("de-DE")}` : ""}
          </span>
        ) : (
          <span className="text-slate-400">Noch keine Entscheidung erfasst</span>
        )}
        <div>
          {topic.newsSourceCount
            ? `${topic.newsSourceCount} verlinkte News-Quellen`
            : "Noch keine News-Quellen verknüpft"}
        </div>
      </div>
    </article>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value.toLocaleString("de-DE")}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
