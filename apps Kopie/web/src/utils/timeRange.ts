export type TimeRangeKey = "30d" | "90d" | "365d" | "all";

export function resolveTimeRange(key: TimeRangeKey | string | null): {
  key: TimeRangeKey;
  label: string;
  dateFrom?: string;
  dateTo?: string;
} {
  const normalized: TimeRangeKey = key === "30d" || key === "90d" || key === "365d" ? key : "all";
  const labelMap: Record<TimeRangeKey, string> = {
    "30d": "Letzte 30 Tage",
    "90d": "Letzte 90 Tage",
    "365d": "Letzte 12 Monate",
    all: "Gesamter Zeitraum",
  };

  if (normalized === "all") {
    return { key: "all", label: labelMap.all };
  }
  const now = Date.now();
  const days = normalized === "30d" ? 30 : normalized === "90d" ? 90 : 365;
  const dateFrom = new Date(now - days * 24 * 3600 * 1000).toISOString();
  return { key: normalized, label: labelMap[normalized], dateFrom };
}
