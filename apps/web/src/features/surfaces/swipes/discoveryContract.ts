import type { SwipeItem, SwipeScopeLevel } from "@/features/swipes/types";

export type SwipeDiscoverySegment = "mine" | "saved" | "region" | "all";

export const SWIPE_DISCOVERY_SEGMENTS: ReadonlyArray<{ id: SwipeDiscoverySegment; label: string }> = [
  { id: "mine", label: "Für dich" },
  { id: "region", label: "Vor Ort" },
  { id: "all", label: "Entdecken" },
  { id: "saved", label: "Gespeichert" },
];

const DEFAULT_REGION_LEVELS: readonly SwipeScopeLevel[] = ["Kommune", "Land"];

function normalize(value: string) { return value.trim().toLowerCase(); }
function buildTopicHaystack(item: SwipeItem) {
  return [item.title, item.category, item.domainLabel, ...item.topicTags].filter((entry): entry is string => Boolean(entry)).map(normalize).join(" ");
}
function hasTopicMatch(item: SwipeItem, preferredTopics: readonly string[]) {
  if (!preferredTopics.length) return true;
  const haystack = buildTopicHaystack(item);
  return preferredTopics.some((topic) => haystack.includes(normalize(topic)));
}

/**
 * "Für dich" is deliberately a mixed deck, not a political profile filter.
 * Familiar topics lead, but local and unfamiliar items are interleaved so the
 * surface keeps discovery and counter-exposure instead of narrowing the feed.
 */
function buildDiversePersonalDeck(items: SwipeItem[], preferredTopics: readonly string[]) {
  if (!preferredTopics.length) return items;
  const familiar = items.filter((item) => hasTopicMatch(item, preferredTopics));
  const discovery = items.filter((item) => !hasTopicMatch(item, preferredTopics));
  if (!familiar.length || !discovery.length) return items;

  const result: SwipeItem[] = [];
  let familiarIndex = 0;
  let discoveryIndex = 0;
  while (familiarIndex < familiar.length || discoveryIndex < discovery.length) {
    for (let i = 0; i < 2 && familiarIndex < familiar.length; i += 1) result.push(familiar[familiarIndex++]);
    if (discoveryIndex < discovery.length) result.push(discovery[discoveryIndex++]);
  }
  return result;
}

export function filterSwipeItemsByDiscoverySegment(params: {
  items: readonly SwipeItem[];
  segment: SwipeDiscoverySegment;
  savedIds?: ReadonlySet<string>;
  preferredTopics?: readonly string[];
  regionLevels?: readonly SwipeScopeLevel[];
}): SwipeItem[] {
  const items = [...params.items];
  if (params.segment === "all") return items;
  if (params.segment === "saved") {
    if (!params.savedIds || params.savedIds.size === 0) return [];
    return items.filter((item) => params.savedIds?.has(item.id));
  }
  if (params.segment === "region") {
    const regionLevels = params.regionLevels?.length ? params.regionLevels : DEFAULT_REGION_LEVELS;
    return items.filter((item) => regionLevels.includes(item.level));
  }
  return buildDiversePersonalDeck(items, params.preferredTopics ?? []);
}

export function derivePreferredSwipeTopics(params: { savedTopicHints?: readonly string[]; decisionTopicHints?: readonly string[] }): string[] {
  const unique = new Set<string>();
  [...(params.savedTopicHints ?? []), ...(params.decisionTopicHints ?? [])].map((entry) => entry.trim()).filter(Boolean).forEach((entry) => unique.add(entry));
  return [...unique].slice(0, 8);
}

type SeededSwipeMatch = { items: SwipeItem[]; claimMatchCount: number; topicMatchCount: number };
function hasClaimTextMatch(item: SwipeItem, claim: string): boolean {
  const haystack = `${item.title} ${item.text ?? ""} ${item.category} ${item.domainLabel}`.toLowerCase();
  return haystack.includes(claim.trim().toLowerCase());
}
function hasTopicTextMatch(item: SwipeItem, topic: string): boolean { return buildTopicHaystack(item).includes(topic.trim().toLowerCase()); }

export function prioritizeSwipeItemsForCreateSeed(params: { items: readonly SwipeItem[]; topic?: string; claim?: string }): SeededSwipeMatch {
  const claim = (params.claim ?? "").trim();
  const topic = (params.topic ?? "").trim();
  if (!claim && !topic) return { items: [...params.items], claimMatchCount: 0, topicMatchCount: 0 };
  const claimMatched: SwipeItem[] = [];
  const topicMatched: SwipeItem[] = [];
  for (const item of params.items) {
    if (claim && hasClaimTextMatch(item, claim)) { claimMatched.push(item); continue; }
    if (topic && hasTopicTextMatch(item, topic)) topicMatched.push(item);
  }
  return { items: [...claimMatched, ...topicMatched], claimMatchCount: claimMatched.length, topicMatchCount: topicMatched.length };
}
