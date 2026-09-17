import { BRAND } from "@/lib/brand";
import {
  buildStaticPublicDiscoverySitemap,
  type PublicSitemapEntry,
} from "@/lib/seo/publicDiscovery";
import {
  listContentReleaseTargetsByType,
  type ContentReleaseTargetType,
} from "@features/contentReleaseWorkbench";
import {
  isPublicVisibilityState,
  type RegionPublicationVisibilityState,
} from "@features/region/publicationRiskLadder";

const INDEXABLE_DYNAMIC_TARGET_TYPES = ["topic_page", "dossier"] as const;

type SitemapReleaseRecord = {
  targetType: ContentReleaseTargetType;
  publicHref: string;
  visibilityState: RegionPublicationVisibilityState;
};

function canonicalPublicUrl(href: string, baseUrl = BRAND.baseUrl): string | null {
  try {
    const url = new URL(href, baseUrl);
    const base = new URL(baseUrl);
    if (url.origin !== base.origin) return null;
    if (url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function buildIndexableReleaseUrls(
  records: readonly SitemapReleaseRecord[],
  baseUrl = BRAND.baseUrl,
): string[] {
  return Array.from(
    new Set(
      records
        .filter((record) =>
          (INDEXABLE_DYNAMIC_TARGET_TYPES as readonly string[]).includes(record.targetType),
        )
        .filter((record) => isPublicVisibilityState(record.visibilityState))
        .map((record) => canonicalPublicUrl(record.publicHref, baseUrl))
        .filter((url): url is string => Boolean(url)),
    ),
  ).sort();
}

async function listVisibleDynamicPublicUrls(): Promise<string[]> {
  try {
    const recordGroups = await Promise.all(
      INDEXABLE_DYNAMIC_TARGET_TYPES.map((targetType) =>
        listContentReleaseTargetsByType(targetType),
      ),
    );
    return buildIndexableReleaseUrls(recordGroups.flat());
  } catch (error) {
    console.warn("Public sitemap dynamic discovery failed closed; serving static URLs only.", error);
    return [];
  }
}

export async function buildPublicSitemap(): Promise<PublicSitemapEntry[]> {
  const staticEntries = buildStaticPublicDiscoverySitemap();
  const dynamicUrls = await listVisibleDynamicPublicUrls();
  const urls = new Set(staticEntries.map((entry) => entry.url));

  for (const url of dynamicUrls) urls.add(url);

  return Array.from(urls, (url) => ({ url }));
}
