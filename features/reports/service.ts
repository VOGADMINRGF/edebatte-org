// features/reports/service.ts
import type {
  RegionReportOverview,
  TopicReport,
} from "@features/report/data/types";
import type { SupportedLocale } from "@core/locale/locales";
import { DEFAULT_LOCALE, isSupportedLocale } from "@core/locale/locales";
import { getRegionName } from "@core/regions/regionTranslations";
import {
  getRegionEvidenceSummary,
  type RegionEvidenceTopicEntry,
} from "@features/report/evidenceAggregates";

function mapTopicToReport(topic: RegionEvidenceTopicEntry, total: number): TopicReport {
  const id = topic.topicKey || "general";
  const decisionSummary = topic.latestDecision
    ? {
        yesShare: topic.latestDecision.yesShare,
        noShare: topic.latestDecision.noShare,
        abstainShare: topic.latestDecision.abstainShare,
        decidedAt: topic.latestDecision.decidedAt?.toISOString?.() ?? null,
        majorityKind: topic.latestDecision.majorityKind,
      }
    : null;
  return {
    id,
    label: id,
    description: "",
    totalStatements: topic.claimCount,
    totalVotes: 0,
    agreeShare: decisionSummary?.yesShare ?? 0,
    neutralShare: decisionSummary?.abstainShare ?? 0,
    disagreeShare: decisionSummary?.noShare ?? 0,
    trend: "steady",
    decisionSummary,
    newsSourceCount: topic.newsSourceCount ?? 0,
  };
}

export async function getRegionReportOverview(
  region: string | null,
  opts?: { locale?: string | null; dateFrom?: Date | string | null; dateTo?: Date | string | null },
): Promise<RegionReportOverview> {
  const regionCode = region && region !== "all" ? region : "all";
  const requestedLocale = opts?.locale;
  const locale: SupportedLocale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const summary = await getRegionEvidenceSummary({
    regionCode: regionCode === "all" ? null : regionCode,
    locale,
    limitTopics: 8,
    dateFrom: opts?.dateFrom ?? null,
    dateTo: opts?.dateTo ?? null,
  });

  const regionName =
    (await getRegionName(regionCode === "all" ? "GLOBAL" : regionCode, locale)) ?? regionCode.toUpperCase();

  const topics = summary.topics.map((topic) => mapTopicToReport(topic, summary.claimCount));

  return {
    regionId: regionCode,
    regionName,
    totalStatements: summary.claimCount,
    totalReports: summary.decisionCount,
     newsSourceCount: summary.newsSourceCount ?? 0,
     lastUpdated: summary.lastUpdated ? summary.lastUpdated.toISOString() : null,
    topTopics: topics,
  };
}
