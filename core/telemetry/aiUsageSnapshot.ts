// core/telemetry/aiUsageSnapshot.ts
import { coreCol } from "../db/triMongo";
import type {
  AiPipelineName,
  AiProviderName,
  AiUsageDailyRow,
  AiUsageEvent,
} from "./aiUsageTypes";

export type UsageTileTone = "token" | "cost" | "warning" | "default";

export interface UsageTile {
  id: string;
  label: string;
  value: string;
  hint?: string;
  trendPct?: number;
  tone?: UsageTileTone;
}

export interface UsageEventSummary {
  timestamp: string;
  provider: AiProviderName;
  pipeline: AiPipelineName;
  region?: string | null;
  tokens: number;
  costEur: number;
  durationMs: number;
  success: boolean;
}

export interface UsageSnapshotFilters {
  rangeDays: number;
  provider?: AiProviderName;
  pipeline?: AiPipelineName;
  region?: string | null;
}

export interface UsageSnapshot {
  tiles: UsageTile[];
  recent: UsageEventSummary[];
  updatedAt: string;
  filters: UsageSnapshotFilters;
}

export interface UsageSnapshotOptions {
  rangeDays?: number;
  provider?: AiProviderName | "all";
  pipeline?: AiPipelineName | "all";
  region?: string | null;
}

const COLLECTION_USAGE = "ai_usage";
const COLLECTION_DAILY = "ai_usage_daily";
const MONTHLY_BUDGET_EUR = 150;
const DAY_MS = 86_400_000;

const PROVIDERS: AiProviderName[] = [
  "openai",
  "anthropic",
  "mistral",
  "gemini",
  "youcom",
];

const PROVIDER_LABELS: Record<AiProviderName, string> = {
  openai: "GPT‑4 / OpenAI",
  anthropic: "Claude / Anthropic",
  mistral: "Mistral",
  gemini: "Gemini",
  youcom: "ARI / You.com",
};

const PIPELINE_LABELS: Record<AiPipelineName, string> = {
  contribution_analyze: "Beiträge",
  feeds_analyze: "Feeds",
  factcheck: "Factcheck",
  report_summarize: "Reports",
  other: "Andere",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE").format(Math.round(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function getUsageSnapshot(
  options: UsageSnapshotOptions = {},
): Promise<UsageSnapshot> {
  const rangeDays = Math.max(1, options.rangeDays ?? 1);
  const providerFilter =
    options.provider && options.provider !== "all" ? options.provider : undefined;
  const pipelineFilter =
    options.pipeline && options.pipeline !== "all" ? options.pipeline : undefined;
  const regionFilter =
    typeof options.region === "string" && options.region.trim()
      ? options.region.trim()
      : undefined;

  const today = new Date();
  const endIso = today.toISOString().slice(0, 10);
  const startDate = new Date(today.getTime() - (rangeDays - 1) * DAY_MS);
  const startIso = startDate.toISOString().slice(0, 10);
  const previousStart = new Date(startDate.getTime() - rangeDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const previousEnd = new Date(startDate.getTime() - DAY_MS)
    .toISOString()
    .slice(0, 10);

  const dailyCol = await coreCol<AiUsageDailyRow>(COLLECTION_DAILY);
  const usageCol = await coreCol<AiUsageEvent>(COLLECTION_USAGE);

  const dateFilter = { $gte: startIso, $lte: endIso };
  const previousDateFilter = { $gte: previousStart, $lte: previousEnd };

  const query: Record<string, any> = { date: dateFilter };
  const previousQuery: Record<string, any> = { date: previousDateFilter };
  if (providerFilter) {
    query.provider = providerFilter;
    previousQuery.provider = providerFilter;
  }
  if (pipelineFilter) {
    query.pipeline = pipelineFilter;
    previousQuery.pipeline = pipelineFilter;
  }
  if (regionFilter) {
    query.region = regionFilter;
    previousQuery.region = regionFilter;
  }

  const [rangeRows, comparisonRows] = await Promise.all([
    dailyCol.find(query).toArray(),
    dailyCol.find(previousQuery).toArray(),
  ]);

  const tokensTotal = sumRows(rangeRows, (r) => r.tokensTotal);
  const costTotal = sumRows(rangeRows, (r) => r.costTotalEur);
  const regionTop = pickTopRegion(rangeRows);
  const totalTrend = computeTrend(
    tokensTotal,
    sumRows(comparisonRows, (r) => r.tokensTotal),
  );

  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthSpending = await usageCol
    .aggregate<{ total: number }>([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$costEur" } } },
    ])
    .toArray()
    .then((rows) => rows[0]?.total ?? 0);

  const budgetPct = Math.min(1, monthSpending / MONTHLY_BUDGET_EUR);

  const tiles: UsageTile[] = [];

  PROVIDERS.forEach((provider) => {
    const providerTokens = sumRows(
      rangeRows.filter((row) => row.provider === provider),
      (row) => row.tokensTotal,
    );
    tiles.push({
      id: `provider-${provider}`,
      label: `Tokens – ${PROVIDER_LABELS[provider]}`,
      value: formatNumber(providerTokens),
      hint: "Zeitraum laut Filter",
      tone: "token",
      trendPct: provider === providerFilter ? totalTrend : undefined,
    });
  });

  const pipelineSummaries = Object.entries(PIPELINE_LABELS).map(
    ([pipeline, label]) => {
      const value = sumRows(
        rangeRows.filter((row) => row.pipeline === pipeline),
        (row) => row.tokensTotal,
      );
      return { pipeline: pipeline as AiPipelineName, label, value };
    },
  );

  tiles.push({
    id: "tokens-total",
    label: "Tokens – alle Dienste",
    value: formatNumber(tokensTotal),
    hint: "Summe aller Provider",
  });

  tiles.push({
    id: "pipeline-feeds",
    label: "Tokens – Feeds/Batch",
    value: formatNumber(
      pipelineSummaries.find((p) => p.pipeline === "feeds_analyze")?.value ?? 0,
    ),
    hint: "Feeds → StatementCandidates",
  });

  tiles.push({
    id: "pipeline-factcheck",
    label: "Tokens – Factcheck",
    value: formatNumber(
      pipelineSummaries.find((p) => p.pipeline === "factcheck")?.value ?? 0,
    ),
    hint: "Verifizierungsprozesse",
  });

  tiles.push({
    id: "region-top",
    label: "Region mit höchstem Verbrauch",
    value: regionTop?.region ?? "–",
    hint: regionTop
      ? `${regionTop.calls} Beiträge im Zeitraum`
      : "Noch keine Events",
    tone: "warning",
  });

  tiles.push({
    id: "budget",
    label: "Budgetwarnung",
    value: `${Math.round(budgetPct * 100)} % erreicht`,
    hint: `${formatCurrency(monthSpending)} von ${formatCurrency(MONTHLY_BUDGET_EUR)} im Monat`,
    tone: "cost",
  });

  const recentQuery: Record<string, any> = {
    createdAt: { $gte: startOfDay(startDate) },
  };
  if (providerFilter) recentQuery.provider = providerFilter;
  if (pipelineFilter) recentQuery.pipeline = pipelineFilter;
  if (regionFilter) recentQuery.region = regionFilter;

  const recentEvents = await usageCol
    .find(recentQuery, { sort: { createdAt: -1 }, limit: 12 })
    .project({
      createdAt: 1,
      provider: 1,
      pipeline: 1,
      region: 1,
      tokensInput: 1,
      tokensOutput: 1,
      costEur: 1,
      durationMs: 1,
      success: 1,
    })
    .toArray();

  const recent: UsageEventSummary[] = recentEvents.map((event) => ({
    timestamp: event.createdAt.toISOString(),
    provider: event.provider,
    pipeline: event.pipeline,
    region: event.region ?? null,
    tokens: (event.tokensInput ?? 0) + (event.tokensOutput ?? 0),
    costEur: event.costEur ?? 0,
    durationMs: event.durationMs ?? 0,
    success: event.success,
  }));

  return {
    tiles,
    recent,
    updatedAt: new Date().toISOString(),
    filters: {
      rangeDays,
      provider: providerFilter,
      pipeline: pipelineFilter,
      region: regionFilter ?? null,
    },
  };
}

function sumRows<T>(
  rows: T[],
  getter: (row: T) => number | undefined,
): number {
  return rows.reduce((sum, row) => sum + (getter(row) ?? 0), 0);
}

function computeTrend(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function pickTopRegion(rows: AiUsageDailyRow[]) {
  const map = new Map<string, { region: string; calls: number }>();
  rows.forEach((row) => {
    if (!row.region) return;
    const entry = map.get(row.region) ?? { region: row.region, calls: 0 };
    entry.calls += row.callsTotal;
    map.set(row.region, entry);
  });
  return [...map.values()].sort((a, b) => b.calls - a.calls)[0];
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
