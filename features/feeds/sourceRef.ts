import { normalizeFeedUrl, type FeedRef } from "./feedConfig";

export const SOURCE_REF_KINDS = ["rss", "atom", "api", "open_data", "snapshot"] as const;
export type SourceRefKind = (typeof SOURCE_REF_KINDS)[number];

export type SourceRef = {
  sourceId: string;
  kind: SourceRefKind;
  href: string;
  regionCode: string | null;
  topicHints: string[];
  label: string | null;
  connector: string | null;
  reviewRequired: true;
  autoPublishAllowed: false;
};

export type SourceRefInput = {
  kind?: SourceRefKind | null;
  href?: string | null;
  regionCode?: string | null;
  topicHints?: string[] | null;
  label?: string | null;
  connector?: string | null;
};

function clean(value?: string | null): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeHints(values?: string[] | null): string[] {
  return Array.from(new Set((values ?? []).map((value) => String(value ?? "").trim()).filter(Boolean)));
}

export function buildSourceRefId(input: {
  kind: SourceRefKind;
  href: string;
  regionCode?: string | null;
  connector?: string | null;
}): string {
  const region = clean(input.regionCode)?.toUpperCase() ?? "GLOBAL";
  const connector = clean(input.connector)?.toLowerCase() ?? "direct";
  return `source:${input.kind}:${connector}:${region}:${input.href.trim().toLowerCase()}`;
}

export function normalizeSourceRef(input: SourceRefInput): SourceRef | null {
  const kind = input.kind ?? "rss";
  if (!SOURCE_REF_KINDS.includes(kind)) return null;
  const href = normalizeFeedUrl(input.href);
  if (!href) return null;
  const regionCode = clean(input.regionCode);
  const connector = clean(input.connector);
  return {
    sourceId: buildSourceRefId({ kind, href, regionCode, connector }),
    kind,
    href,
    regionCode,
    topicHints: normalizeHints(input.topicHints),
    label: clean(input.label),
    connector,
    reviewRequired: true,
    autoPublishAllowed: false,
  };
}

/** Compatibility adapter: the existing RSS/Atom runtime remains the single ingestion truth. */
export function sourceRefFromFeedRef(ref: FeedRef, kind: "rss" | "atom" = "rss"): SourceRef {
  const normalized = normalizeSourceRef({
    kind,
    href: ref.feedUrl,
    regionCode: ref.regionCode,
    topicHints: ref.topicHints,
  });
  if (!normalized) throw new Error("invalid_feed_ref");
  return normalized;
}

/** Only RSS/Atom sources may enter the legacy feed puller. API/Open-Data/Snapshot need explicit connectors. */
export function feedRefFromSourceRef(ref: SourceRef): FeedRef | null {
  if (ref.kind !== "rss" && ref.kind !== "atom") return null;
  return {
    feedUrl: ref.href,
    regionCode: ref.regionCode,
    topicHints: [...ref.topicHints],
  };
}
