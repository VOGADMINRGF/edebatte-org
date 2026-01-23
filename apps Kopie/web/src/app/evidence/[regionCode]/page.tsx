import { cookies, headers } from "next/headers";
import Link from "next/link";
import { findEvidenceClaims } from "@core/evidence/query";
import { getRegionName } from "@core/regions/regionTranslations";
import type { EvidenceClaimWithMeta } from "@core/evidence/query";
import {
  CORE_LOCALES,
  EXTENDED_LOCALES,
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "@/config/locales";
import { getRegionEvidenceSummary } from "@features/report/evidenceAggregates";
import { resolveTimeRange, type TimeRangeKey } from "@/utils/timeRange";

async function detectLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("lang")?.value;
  if (cookieLang && isSupportedLocale(cookieLang)) return cookieLang;
  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.split(";")[0]?.trim();
    const candidate = primary?.slice(0, 2);
    if (candidate && isSupportedLocale(candidate)) return candidate;
  }
  return DEFAULT_LOCALE;
}

const LOCALE_OPTIONS = ["all", ...CORE_LOCALES, ...EXTENDED_LOCALES];

export default async function EvidenceRegionPage({
  params,
  searchParams,
}: {
  params: Promise<{ regionCode: string }>;
  searchParams: Promise<{ locale?: string; pipeline?: string; q?: string; timeRange?: string }>;
}) {
  const { regionCode } = await params;
  const regionParam = decodeURIComponent(regionCode);
  const sp = await searchParams;
  const detectedLocale = await detectLocale();
  const requestedLocale = sp.locale ?? null;
  const localeParam: SupportedLocale | "all" =
    requestedLocale === "all"
      ? "all"
      : requestedLocale && isSupportedLocale(requestedLocale)
        ? requestedLocale
        : detectedLocale;
  const pipelineParam = sp.pipeline ?? "all";
  const textQuery = sp.q ?? "";
  const timeRangeParam = (sp.timeRange as TimeRangeKey | undefined) ?? "90d";
  const range = resolveTimeRange(timeRangeParam);

  const [summary, claimsResult] = await Promise.all([
    getRegionEvidenceSummary({
      regionCode: regionParam === "global" ? null : regionParam,
      locale: localeParam === "all" ? undefined : localeParam,
      dateFrom: range.dateFrom ?? null,
      dateTo: range.dateTo ?? null,
    }),
    findEvidenceClaims({
      regionCode: regionParam === "global" ? undefined : regionParam,
      locale: localeParam === "all" ? undefined : localeParam,
      pipeline: pipelineParam === "all" ? undefined : pipelineParam,
      textQuery: textQuery || undefined,
      limit: 25,
      offset: 0,
      dateFrom: range.dateFrom ?? null,
      dateTo: range.dateTo ?? null,
    }),
  ]);
  const { items } = claimsResult;

  const regionName =
    regionParam === "global"
      ? "Global / offen"
      : await getRegionName(
          regionParam,
          localeParam === "all" ? detectedLocale : localeParam,
        );

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence · Region</p>
        <h1 className="text-2xl font-bold text-slate-900">
          Evidence-Claims für {regionName} ({regionParam})
        </h1>
        <p className="text-sm text-slate-600">
          Hier findest du die aktuell erfassten Aussagen aus Feeds und Contributions für diese Region. Wähle
          Locale, Pipeline oder Zeitraum, um die Liste einzugrenzen.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
          Evidence-Claims entstehen aus automatisierter Analyse (Block B) und werden redaktionell geprüft. Jede
          Aussage kann Evidence-Items (z. B. News-Artikel) und Entscheidungen (Abstimmungen) verknüpft haben – zusammen ergibt sich der
          Evidence-Graph.
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Evidence-Claims" value={summary.claimCount} hint={range.label} />
        <SummaryCard label="Decisions" value={summary.decisionCount} hint={summary.latestDecision ? "Neueste Entscheidung liegt vor" : "Noch keine Entscheidung"} />
        <SummaryCard
          label="News-Quellen"
          value={summary.newsSourceCount ?? 0}
          hint="verknüpfte Medienartikel"
        />
      </section>

      {summary.topics.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Top-Themen in {regionName}</h2>
            <span className="text-[11px] text-slate-400">nach Anzahl der Claims</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.topics.map((topic) => (
              <span key={topic.topicKey} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
                {topic.topicKey || "Allgemein"} · {topic.claimCount}
              </span>
            ))}
          </div>
        </section>
      )}

      <form className="flex flex-wrap items-center gap-3 border border-slate-200 bg-white px-4 py-3 rounded-2xl">
        <div className="flex flex-col text-sm text-slate-600">
          <label className="text-xs uppercase font-medium">Locale</label>
          <select
            name="locale"
            defaultValue={localeParam}
            className="rounded-full border border-slate-300 bg-white px-4 py-1 text-sm"
          >
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "all" ? "Alle" : opt}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col text-sm text-slate-600">
          <label className="text-xs uppercase font-medium">Pipeline</label>
          <select
            name="pipeline"
            defaultValue={pipelineParam}
            className="rounded-full border border-slate-300 bg-white px-4 py-1 text-sm"
          >
            <option value="all">Alle</option>
            <option value="feeds_to_statementCandidate">Feeds</option>
            <option value="contribution_analyze">Beiträge</option>
          </select>
        </div>
        <div className="flex flex-col text-sm text-slate-600">
          <label className="text-xs uppercase font-medium">Zeitraum</label>
          <select
            name="timeRange"
            defaultValue={timeRangeParam}
            className="rounded-full border border-slate-300 bg-white px-4 py-1 text-sm"
          >
            <option value="30d">Letzte 30 Tage</option>
            <option value="90d">Letzte 90 Tage</option>
            <option value="365d">Letzte 12 Monate</option>
            <option value="all">Gesamter Zeitraum</option>
          </select>
        </div>
        <div className="flex flex-col flex-1 text-sm text-slate-600">
          <label className="text-xs uppercase font-medium">Suche</label>
          <input
            name="q"
            defaultValue={textQuery}
            placeholder="Claim durchsuchen"
            className="rounded-full border border-slate-300 bg-white px-4 py-1 text-sm"
          />
        </div>
        <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Filtern</button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-6 py-8 text-center text-sm text-slate-600">
          Für diese Region liegen aktuell noch keine bestätigten Claims vor. Schau später wieder vorbei – neue
          Feeds und Auswertungen landen automatisch hier.
        </div>
      ) : (
        <section className="space-y-4">
          {items.map((entry) => (
            <ClaimCard key={entry.claim._id.toString()} entry={entry} />
          ))}
        </section>
      )}

      <footer className="text-xs text-slate-500">
        Hinweise: Evidence-Graph Beta. Claims entstehen automatisiert (Feeds/Analyze) und werden redaktionell geprüft.
      </footer>
    </main>
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

function ClaimCard({ entry }: { entry: EvidenceClaimWithMeta }) {
  const claim = entry.claim;
  const latestDecision = entry.latestDecision ?? null;
  const badge = latestDecision
    ? `Mehrheit: ${Math.round(latestDecision.outcome.yesShare * 100)}% Zustimmung`
    : "Noch keine Entscheidung";
  const decisionMeta = latestDecision
    ? `Stand ${formatDecisionDate(latestDecision.decidedAt)} · ${
        latestDecision.outcome.quorumReached ? "Quorum erfüllt" : "Quorum offen"
      }`
    : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <p className="text-sm text-slate-800">{claim.text}</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">{claim.sourceType}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{badge}</span>
        {decisionMeta && <span className="text-slate-400">{decisionMeta}</span>}
        <span>Locale {claim.locale}</span>
        <span>Pipeline {claim.meta?.pipeline ?? "n/a"}</span>
        <span>
          Erstellt am{" "}
          {claim.createdAt instanceof Date
            ? claim.createdAt.toLocaleDateString("de-DE")
            : new Date(claim.createdAt).toLocaleDateString("de-DE")}
        </span>
        <Link href={`/admin/evidence/claims/${claim._id.toString()}`} className="text-sky-600 underline">
          Admin
        </Link>
      </div>
      <NewsSources sources={entry.evidenceItems} />
    </article>
  );
}

function formatDecisionDate(value: Date | string | undefined) {
  if (!value) return "–";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("de-DE");
}

function NewsSources({ sources }: { sources?: EvidenceClaimWithMeta["evidenceItems"] }) {
  const items =
    sources
      ?.filter((item) => item?.sourceKind === "news_article" && item?.isActive !== false)
      .slice(0, 5) ?? [];
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-600 space-y-2">
      <div className="font-semibold text-slate-800">Quellen aus Medienberichten</div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item._id.toString()} className="flex flex-col gap-1">
            <div className="text-[11px] uppercase text-slate-400">{item.publisher}</div>
            <div className="text-sm text-slate-800">{item.shortTitle}</div>
            <div className="flex items-center gap-2 text-[11px]">
              <span>{item.shortSummary.slice(0, 160)}</span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 font-semibold underline"
              >
                Zur Quelle
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-400">
        Hinweis: Die Inhalte der verlinkten Quellen stammen von den jeweiligen Medienanbietern.
      </p>
    </div>
  );
}
